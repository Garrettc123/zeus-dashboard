import type { NextApiRequest, NextApiResponse } from 'next'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''

export interface RoasData {
  google_spend: number
  google_revenue: number
  google_roas: number
  meta_spend: number
  meta_revenue: number
  meta_roas: number
  total_spend: number
  total_revenue: number
  total_roas: number
  days: number
  available: boolean
}

const EMPTY: RoasData = {
  google_spend: 0,
  google_revenue: 0,
  google_roas: 0,
  meta_spend: 0,
  meta_revenue: 0,
  meta_roas: 0,
  total_spend: 0,
  total_revenue: 0,
  total_roas: 0,
  days: 7,
  available: false,
}

interface AdRow {
  date: string
  platform: string
  spend: number
  revenue: number
  clicks: number
  conversions: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.setHeader('Cache-Control', 'max-age=60')
    return res.status(200).json(EMPTY)
  }

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const sinceStr = since.toISOString().slice(0, 10)

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/ad_spend?date=gte.${sinceStr}&order=date.desc&limit=500`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    )

    if (!response.ok) {
      res.setHeader('Cache-Control', 'max-age=60')
      return res.status(200).json(EMPTY)
    }

    const rows: AdRow[] = await response.json()

    let googleSpend = 0
    let googleRevenue = 0
    let metaSpend = 0
    let metaRevenue = 0

    for (const row of rows) {
      if (row.platform === 'google') {
        googleSpend += row.spend ?? 0
        googleRevenue += row.revenue ?? 0
      } else if (row.platform === 'meta') {
        metaSpend += row.spend ?? 0
        metaRevenue += row.revenue ?? 0
      }
    }

    const totalSpend = googleSpend + metaSpend
    const totalRevenue = googleRevenue + metaRevenue

    const data: RoasData = {
      google_spend: Math.round(googleSpend * 100) / 100,
      google_revenue: Math.round(googleRevenue * 100) / 100,
      google_roas: googleSpend > 0 ? Math.round((googleRevenue / googleSpend) * 100) / 100 : 0,
      meta_spend: Math.round(metaSpend * 100) / 100,
      meta_revenue: Math.round(metaRevenue * 100) / 100,
      meta_roas: metaSpend > 0 ? Math.round((metaRevenue / metaSpend) * 100) / 100 : 0,
      total_spend: Math.round(totalSpend * 100) / 100,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
      days: 7,
      available: rows.length > 0,
    }

    res.setHeader('Cache-Control', 'max-age=300')
    return res.status(200).json(data)
  } catch {
    res.setHeader('Cache-Control', 'max-age=60')
    return res.status(200).json(EMPTY)
  }
}
