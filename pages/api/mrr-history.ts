import type { NextApiRequest, NextApiResponse } from 'next'

export interface MrrPoint {
  date: string
  mrr: number
}

const RHNS_URL = process.env.RHNS_API_URL ?? ''

// Accumulates one snapshot per calendar day for the current process lifetime.
// Resets on deploy — acceptable for a rolling 7-day view.
const snapshots = new Map<string, number>()

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function last7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  let currentMrr = 0
  if (RHNS_URL) {
    try {
      const brief = await fetch(`${RHNS_URL}/cognitive/brief`).then((r) => r.json())
      currentMrr = brief?.mrr_usd ?? 0
    } catch {
      // leave currentMrr at 0
    }
  }

  snapshots.set(todayStr(), currentMrr)

  const days = last7Days()
  const points: MrrPoint[] = days.map((date) => ({
    date,
    mrr: snapshots.get(date) ?? currentMrr,
  }))

  res.setHeader('Cache-Control', 'max-age=60')
  res.status(200).json(points)
}
