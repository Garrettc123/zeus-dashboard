import type { NextApiRequest, NextApiResponse } from 'next'

const DISPATCH_URL = process.env.DISPATCH_URL || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  if (!DISPATCH_URL) {
    return res.json({ events: [], count: 0 })
  }
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 50)
    const r = await fetch(`${DISPATCH_URL}/events?limit=${limit}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    const data = await r.json()
    res.json(data)
  } catch (e) {
    res.status(502).json({ events: [], count: 0, error: (e as Error).message })
  }
}
