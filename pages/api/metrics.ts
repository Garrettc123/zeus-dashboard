import type { NextApiRequest, NextApiResponse } from 'next'

const PAYMENTS_URL = process.env.PAYMENTS_API_URL ?? ''
const RHNS_URL = process.env.RHNS_API_URL ?? ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const [rhnsRes] = await Promise.allSettled([
      RHNS_URL ? fetch(`${RHNS_URL}/cognitive/brief`).then((r) => r.json()) : Promise.resolve(null),
    ])

    const brief = rhnsRes.status === 'fulfilled' ? rhnsRes.value : null

    const metrics = {
      mrr: brief?.mrr_usd ?? 0,
      mrr_target: brief?.mrr_target ?? 40000,
      mrr_gap: brief?.mrr_gap ?? 40000,
      mrr_pct: brief?.mrr_pct_to_target ?? 0,
      sgr: brief?.sgr ?? 0,
      engine_status: brief?.engine_status ?? 'UNKNOWN',
      top_priority: brief?.top_priority ?? '—',
      alert: brief?.alert ?? null,
      daily_signups: 0,
      active_subscriptions: 0,
      churn_rate: 0,
      cac: 0,
      updated_at: new Date().toISOString(),
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(metrics)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
}
