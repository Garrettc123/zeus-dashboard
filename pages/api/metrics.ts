import type { NextApiRequest, NextApiResponse } from 'next'

const RHNS_URL = process.env.RHNS_API_URL ?? ''
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ''

function stripeAuthHeader(): string {
  return `Basic ${Buffer.from(`${STRIPE_SECRET_KEY}:`).toString('base64')}`
}

async function fetchStripeActiveSubscriptions(): Promise<number> {
  if (!STRIPE_SECRET_KEY) return 0
  try {
    const res = await fetch(
      'https://api.stripe.com/v1/subscriptions?status=active&limit=100',
      { headers: { Authorization: stripeAuthHeader() } }
    )
    if (!res.ok) return 0
    const data = await res.json()
    return data.data?.length ?? 0
  } catch {
    return 0
  }
}

async function fetchStripeDailySignups(): Promise<number> {
  if (!STRIPE_SECRET_KEY) return 0
  try {
    const since = Math.floor(Date.now() / 1000) - 86400
    const res = await fetch(
      `https://api.stripe.com/v1/customers?created[gte]=${since}&limit=100`,
      { headers: { Authorization: stripeAuthHeader() } }
    )
    if (!res.ok) return 0
    const data = await res.json()
    return data.data?.length ?? 0
  } catch {
    return 0
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const [rhnsResult, stripeSubsResult, stripeSignupsResult] = await Promise.allSettled([
      RHNS_URL ? fetch(`${RHNS_URL}/cognitive/brief`).then((r) => r.json()) : Promise.resolve(null),
      fetchStripeActiveSubscriptions(),
      fetchStripeDailySignups(),
    ])

    const brief = rhnsResult.status === 'fulfilled' ? rhnsResult.value : null
    const stripeActiveSubs =
      stripeSubsResult.status === 'fulfilled' ? stripeSubsResult.value : 0
    const stripeSignups =
      stripeSignupsResult.status === 'fulfilled' ? stripeSignupsResult.value : 0

    const activeSubscriptions = stripeActiveSubs || brief?.active_subscriptions || 0
    const dailySignups = stripeSignups || brief?.daily_signups || 0

    const metrics = {
      mrr: brief?.mrr_usd ?? 0,
      mrr_target: brief?.mrr_target ?? 40000,
      mrr_gap: brief?.mrr_gap ?? 40000,
      mrr_pct: brief?.mrr_pct_to_target ?? 0,
      sgr: brief?.sgr ?? 0,
      engine_status: brief?.engine_status ?? 'UNKNOWN',
      top_priority: brief?.top_priority ?? '—',
      alert: brief?.alert ?? null,
      daily_signups: dailySignups,
      active_subscriptions: activeSubscriptions,
      churn_rate: brief?.churn_rate ?? 0,
      cac: brief?.cac ?? 0,
      updated_at: new Date().toISOString(),
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(metrics)
  } catch {
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
}
