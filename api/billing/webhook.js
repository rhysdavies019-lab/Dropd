import Stripe from 'stripe'
import { adminClient } from '../_lib/supabase.js'

// Vercel needs the raw body for Stripe signature verification
export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY)
  const rawBody   = await getRawBody(req)
  const signature = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return res.status(400).json({ error: 'Webhook signature mismatch' })
  }

  const supabase = adminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId  = session.metadata?.user_id
    if (!userId) return res.json({ received: true })

    if (session.mode === 'subscription') {
      const planMap = {
        [process.env.PRICE_HUNTER_MONTHLY]: 'hunter',
        [process.env.PRICE_PRO_MONTHLY]:    'pro',
      }
      const plan      = planMap[session.line_items?.data?.[0]?.price?.id] ?? 'hunter'
      const creditMap = { hunter: 50, pro: 999999 }
      await supabase.from('users').update({ plan, credits: creditMap[plan] ?? 50 }).eq('id', userId)
    }

    if (session.mode === 'payment') {
      const creditMap = { 900: 10, 2000: 25, 3500: 50 }
      const credits   = creditMap[session.amount_total] ?? 0
      if (credits > 0) {
        const { data: p } = await supabase.from('users').select('credits').eq('id', userId).single()
        await supabase.from('users').update({ credits: (p?.credits ?? 0) + credits }).eq('id', userId)
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const userId = event.data.object.metadata?.user_id
    if (userId) await supabase.from('users').update({ plan: 'free', credits: 2 }).eq('id', userId)
  }

  return res.json({ received: true })
}
