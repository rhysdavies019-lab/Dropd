import Stripe from 'stripe'
import { requireAuth, json } from '../_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405)

  const { user, error } = await requireAuth(req)
  if (error) return json(res, { error }, 401)

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const { priceId, mode } = req.body
  const appUrl = process.env.VITE_APP_URL || 'https://dropd.vercel.app'

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items:          [{ price: priceId, quantity: 1 }],
    success_url:         `${appUrl}/billing?success=1`,
    cancel_url:          `${appUrl}/billing?cancelled=1`,
    client_reference_id: user.id,
    metadata:            { user_id: user.id },
    customer_email:      user.email,
  })

  return json(res, { sessionId: session.id })
}
