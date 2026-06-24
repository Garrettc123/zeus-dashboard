import { useEffect, useState } from 'react'
import Head from 'next/head'

interface Metrics {
  mrr: number
  mrr_target: number
  mrr_gap: number
  mrr_pct: number
  sgr: number
  engine_status: string
  top_priority: string
  alert: string | null
  daily_signups: number
  active_subscriptions: number
  churn_rate: number
  cac: number
  updated_at: string
}

function fmt(n: number, currency = true) {
  if (currency) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function MetricCard({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${
      highlight ? 'bg-emerald-950/40 border-emerald-800' : 'bg-zinc-900 border-zinc-800'
    }`}>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/metrics')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMetrics(await res.json())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const updatedAt = metrics ? new Date(metrics.updated_at).toLocaleTimeString() : '—'

  return (
    <>
      <Head>
        <title>Zeus Dashboard — Garcar Revenue</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Zeus Revenue Dashboard</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Garcar Enterprise · Live · refreshes every 30s</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              metrics?.engine_status === 'OPERATIONAL' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-xs text-zinc-400">{metrics?.engine_status ?? '…'}</span>
            <span className="text-xs text-zinc-600 ml-2">Updated {updatedAt}</span>
          </div>
        </div>

        {metrics?.alert && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm">
            ⚠️ {metrics.alert}
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-950/50 border border-yellow-800 text-yellow-300 text-sm">
            API error: {error}
          </div>
        )}

        {loading ? (
          <div className="text-zinc-500 text-sm">Loading metrics…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="MRR"
                value={fmt(metrics?.mrr ?? 0)}
                sub={`${fmt(metrics?.mrr_pct ?? 0, false)}% of $${((metrics?.mrr_target ?? 40000) / 1000).toFixed(0)}k target`}
                highlight={(metrics?.mrr ?? 0) > 0}
              />
              <MetricCard
                label="MRR gap"
                value={fmt(metrics?.mrr_gap ?? 0)}
                sub="remaining to $40k/mo target"
              />
              <MetricCard
                label="SGR"
                value={fmt(metrics?.sgr ?? 0, false)}
                sub={`threshold 0.85 — ${(metrics?.sgr ?? 0) >= 0.85 ? '✅ pass' : '❌ fail'}`}
                highlight={(metrics?.sgr ?? 0) >= 0.85}
              />
              <MetricCard
                label="Active subscriptions"
                value={String(metrics?.active_subscriptions ?? 0)}
                sub="paying customers"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <MetricCard label="Daily signups" value={String(metrics?.daily_signups ?? 0)} sub="target: 5–10/day" />
              <MetricCard label="Churn rate" value={`${fmt(metrics?.churn_rate ?? 0, false)}%`} sub="monthly" />
              <MetricCard label="CAC" value={fmt(metrics?.cac ?? 0)} sub="customer acquisition cost" />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Top priority</p>
              <p className="text-sm text-zinc-200">{metrics?.top_priority ?? '—'}</p>
            </div>
          </>
        )}
      </main>
    </>
  )
}
