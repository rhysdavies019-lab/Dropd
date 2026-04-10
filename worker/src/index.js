/**
 * Dropd — Cloudflare Worker API + Cron Trigger
 *
 * Routes:
 *   GET  /api/domains          — domain feed (speed-tier filtered)
 *   POST /api/domains/unlock   — unlock a domain, deduct 1 credit
 *   POST /api/billing/checkout — create Stripe Checkout session
 *   POST /api/billing/webhook  — Stripe webhook handler
 *   GET  /api/users/me         — current user profile
 *   DEL  /api/users/delete     — delete account
 *   POST /api/pipeline/run     — manually trigger pipeline (admin only)
 *
 * Cron: runs runPipeline() daily at 06:00 UTC (see wrangler.toml)
 *
 * Secrets (set via `wrangler secret put <NAME>`):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPR_API_KEY            (OpenPageRank — free at openpagerank.com)
 *   DOMAIN_FEED_URL        (optional: URL returning one domain per line)
 *   DOMAIN_SEED_LIST       (optional: comma-separated domain list in wrangler.toml vars)
 */

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { runPipeline } from './pipeline'

// ─── CORS headers ──────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

const err = (msg, status = 400) => json({ error: msg }, status)

// ─── Auth helper ────────────────────────────────────────────────────────────
async function requireAuth(request, env) {
  const token = (request.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return { error: err('Unauthorised', 401) }
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: err('Invalid token', 401) }
  return { user, supabase }
}

// ─── Fetch handler ──────────────────────────────────────────────────────────
export default {
  // ── HTTP requests ──────────────────────────────────────────────────────────
  async fetch(request, env) {
    const { method } = request
    const { pathname } = new URL(request.url)

    if (method === 'OPTIONS') return new Response(null, { headers: CORS })

    // GET /api/domains — speed-tier filtered domain feed
    if (method === 'GET' && pathname === '/api/domains') {
      const { user, supabase, error: authErr } = await requireAuth(request, env)
      if (authErr) return authErr

      const { data: profile } = await supabase.from('users').select('plan').eq('id', user.id).single()
      const plan       = profile?.plan ?? 'free'
      const delayHours = plan === 'pro' ? 0 : plan === 'hunter' ? 2 : 6
      const cutoff     = new Date(Date.now() - delayHours * 3600000).toISOString()

      const url    = new URL(request.url)
      const grade  = url.searchParams.get('grade')    || null
      const cat    = url.searchParams.get('category') || null
      const ext    = url.searchParams.get('extension')|| null

      let query = supabase
        .from('domains')
        .select('id, name_hashed, grade, score, backlinks, age, category, extension, estimated_value, created_at, reason')
        .lte('created_at', cutoff)
        .order('score', { ascending: false })
        .limit(50)

      if (grade) query = query.eq('grade', grade)
      if (cat)   query = query.eq('category', cat)
      if (ext)   query = query.eq('extension', ext)

      const { data: domains, error: dbErr } = await query
      if (dbErr) return err(dbErr.message, 500)
      return json({ domains, plan })
    }

    // POST /api/domains/unlock
    if (method === 'POST' && pathname === '/api/domains/unlock') {
      const { user, supabase, error: authErr } = await requireAuth(request, env)
      if (authErr) return authErr

      const { domainId } = await request.json()
      if (!domainId) return err('domainId required')

      const { data: profile } = await supabase.from('users').select('credits').eq('id', user.id).single()
      if ((profile?.credits ?? 0) < 1) return err('Insufficient credits', 402)

      const { data: existing } = await supabase.from('unlocks')
        .select('id').eq('user_id', user.id).eq('domain_id', domainId).single()
      if (existing) return json({ already_unlocked: true })

      await Promise.all([
        supabase.from('unlocks').insert({ user_id: user.id, domain_id: domainId }),
        supabase.from('users').update({ credits: profile.credits - 1 }).eq('id', user.id),
      ])

      const { data: domain } = await supabase.from('domains').select('name').eq('id', domainId).single()
      return json({ success: true, name: domain?.name })
    }

    // POST /api/billing/checkout — Stripe Checkout session
    if (method === 'POST' && pathname === '/api/billing/checkout') {
      const { user, error: authErr } = await requireAuth(request, env)
      if (authErr) return authErr

      const { priceId, mode } = await request.json()
      const stripe  = new Stripe(env.STRIPE_SECRET_KEY)
      const appUrl  = env.APP_URL || 'http://localhost:3000'

      const session = await stripe.checkout.sessions.create({
        mode,
        line_items:          [{ price: priceId, quantity: 1 }],
        success_url:         `${appUrl}/billing?success=1`,
        cancel_url:          `${appUrl}/billing?cancelled=1`,
        client_reference_id: user.id,
        metadata:            { user_id: user.id },
        // Pre-fill email if available
        customer_email:      user.email,
        // UI branding
        payment_method_types: ['card'],
      })

      return json({ sessionId: session.id })
    }

    // POST /api/billing/webhook — Stripe events
    if (method === 'POST' && pathname === '/api/billing/webhook') {
      const body      = await request.text()
      const signature = request.headers.get('Stripe-Signature') ?? ''
      const stripe    = new Stripe(env.STRIPE_SECRET_KEY)
      const supabase  = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

      let event
      try { event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET) }
      catch { return err('Webhook signature mismatch', 400) }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        const userId  = session.metadata?.user_id
        if (!userId) return json({ received: true })

        if (session.mode === 'subscription') {
          // Map price ID → plan name
          const planMap = {
            [env.PRICE_HUNTER_MONTHLY]: 'hunter',
            [env.PRICE_PRO_MONTHLY]:    'pro',
          }
          const plan = planMap[session.line_items?.data?.[0]?.price?.id] ?? 'hunter'
          // Set plan + reset monthly credits
          const creditMap = { hunter: 50, pro: 999999 }
          await supabase.from('users').update({ plan, credits: creditMap[plan] ?? 50 }).eq('id', userId)
        }

        if (session.mode === 'payment') {
          // One-time credit pack — amount in pence
          const creditMap = { 900: 10, 2000: 25, 3500: 50 }
          const credits   = creditMap[session.amount_total] ?? 0
          if (credits > 0) {
            const { data: p } = await supabase.from('users').select('credits').eq('id', userId).single()
            await supabase.from('users').update({ credits: (p?.credits ?? 0) + credits }).eq('id', userId)
          }
        }
      }

      // Subscription cancelled → downgrade to free
      if (event.type === 'customer.subscription.deleted') {
        const userId = event.data.object.metadata?.user_id
        if (userId) await supabase.from('users').update({ plan: 'free', credits: 2 }).eq('id', userId)
      }

      return json({ received: true })
    }

    // GET /api/users/me
    if (method === 'GET' && pathname === '/api/users/me') {
      const { user, supabase, error: authErr } = await requireAuth(request, env)
      if (authErr) return authErr
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
      return json({ user: profile })
    }

    // DELETE /api/users/delete
    if (method === 'DELETE' && pathname === '/api/users/delete') {
      const { user, supabase, error: authErr } = await requireAuth(request, env)
      if (authErr) return authErr
      await Promise.all([
        supabase.from('unlocks').delete().eq('user_id', user.id),
        supabase.from('watchlist').delete().eq('user_id', user.id),
        supabase.from('users').delete().eq('id', user.id),
      ])
      await supabase.auth.admin.deleteUser(user.id)
      return json({ deleted: true })
    }

    // POST /api/pipeline/run — manual trigger (admin use)
    if (method === 'POST' && pathname === '/api/pipeline/run') {
      const adminKey = request.headers.get('X-Admin-Key')
      if (!adminKey || adminKey !== env.ADMIN_KEY) return err('Forbidden', 403)
      const result = await runPipeline(env)
      return json(result)
    }

    return err('Not found', 404)
  },

  // ── Cron trigger — runs on schedule defined in wrangler.toml ───────────────
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runPipeline(env))
  },
}
