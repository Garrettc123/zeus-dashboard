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

interface DispatchEvent {
  id: string
  event_type: string
  source_system: string
  trace_id: string | null
  status: string
  created_at: string
}

function fmt(n: number, currency = true) {
  if (currency) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function MetricCard({ label, value, sub, highlight = false }: {
  label: string; value: string; sub?: string; highlight?: boolean
}) {
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

const SOURCE_COLORS: Record<string, string> = {
  'garcar-payment-loop': 'text-emerald-400',
  'garcar-payments':     'text-blue-400',
  'github-actions':      'text-purple-400',
  'garcar-rhns-core':    'text-orange-400',
  'garcar-control-plane':'text-cyan-400',
}

const STATUS_DOT: Record<string, string> = {
  processed: 'bg-emerald-500',
  failed:    'bg-red-500',
  pending:   'bg-yellow-500 animate-pulse',
}

function EventRow({ event }: { event: DispatchEvent }) {
  const color  = SOURCE_COLORS[event.source_system] ?? 'text-zinc-400'
  const dot    = STATUS_DOT[event.status] ?? 'bg-zinc-600'
  const time   = new Date(event.created_at).toLocaleTimeString()
  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-800/50 last:border-0 text-sm">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className={`font-mono text-xs ${color} w-40 flex-shrink-0 truncate`}>{event.source_system}</span>
      <span className="text-zinc-300 flex-1 truncate">{event.event_type}</span>
      <span className="text-zinc-600 text-xs flex-shrink-0">{time}</span>
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [events,  setEvents]  = useState<DispatchEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const loadMetrics = async () => {
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

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events?limit=15')
      if (!res.ok) return
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch { /* non-fatal */ }
  }

  useEffect(() => {
    loadMetrics()
    loadEvents()
    const t1 = setInterval(loadMetrics, 30_000)
    const t2 = setInterval(loadEvents, 10_000)
    return () => { clearInterval(t1); clearInterval(t2) }
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
              <MetricCard label="Daily signups"  value={String(metrics?.daily_signups ?? 0)} sub="target: 5–10/day" />
              <MetricCard label="Churn rate"      value={`${fmt(metrics?.churn_rate ?? 0, false)}%`} sub="monthly" />
              <MetricCard label="CAC"             value={fmt(metrics?.cac ?? 0)} sub="customer acquisition cost" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Top priority</p>
                <p className="text-sm text-zinc-200">{metrics?.top_priority ?? '—'}</p>
              </div>

              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Event bus · live</p>
                  <span className="text-xs text-zinc-600">{events.length} recent</span>
                </div>
                {events.length === 0 ? (
                  <p className="text-xs text-zinc-600">No events yet — waiting for first dispatch</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {events.map(e => <EventRow key={e.id} event={e} />)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
