import type { NextApiRequest, NextApiResponse } from 'next'

const RHNS_URL = process.env.RHNS_API_URL ?? ''
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? ''

async function stripeGet(path: string): Promise<Record<string, unknown> | null> {
  if (!STRIPE_KEY) return null
  try {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      headers: { Authorization: `Bearer ${STRIPE_KEY}` },
    })
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)

    const [rhnsRes, subsRes, signupsRes] = await Promise.allSettled([
      RHNS_URL ? fetch(`${RHNS_URL}/cognitive/brief`).then((r) => r.json()) : Promise.resolve(null),
      stripeGet('/subscriptions?status=active&limit=100'),
      stripeGet(`/customers?created[gte]=${todayStart}&limit=100`),
    ])

    const brief = rhnsRes.status === 'fulfilled' ? rhnsRes.value : null
    const subs = subsRes.status === 'fulfilled' ? subsRes.value : null
    const signups = signupsRes.status === 'fulfilled' ? signupsRes.value : null

    const subsData = Array.isArray((subs as Record<string, unknown>)?.data)
      ? (subs as { data: unknown[] }).data
      : []
    const signupsData = Array.isArray((signups as Record<string, unknown>)?.data)
      ? (signups as { data: unknown[] }).data
      : []

    const metrics = {
      mrr: (brief as Record<string, unknown>)?.mrr_usd ?? 0,
      mrr_target: (brief as Record<string, unknown>)?.mrr_target ?? 40_000,
      mrr_gap: (brief as Record<string, unknown>)?.mrr_gap ?? 40_000,
      mrr_pct: (brief as Record<string, unknown>)?.mrr_pct_to_target ?? 0,
      sgr: (brief as Record<string, unknown>)?.sgr ?? 0,
      engine_status: (brief as Record<string, unknown>)?.engine_status ?? 'UNKNOWN',
      top_priority: (brief as Record<string, unknown>)?.top_priority ?? '—',
      alert: (brief as Record<string, unknown>)?.alert ?? null,
      daily_signups: signupsData.length,
      active_subscriptions: subsData.length,
      churn_rate: 0,
      cac: 0,
      updated_at: new Date().toISOString(),
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(metrics)
  } catch {
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
}
