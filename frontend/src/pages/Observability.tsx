import { useEffect, useState } from 'react'
import { api, MetricsSummary, MCPMetrics } from '../api'

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div style={{ flex: 1, height: 8, background: 'var(--brown-50)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--brown-100)' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s ease' }} />
    </div>
  )
}

function MetricRow({ label, value, unit = '', color = 'var(--text-primary)' }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}{unit && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>}</span>
    </div>
  )
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso + 'Z').getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function Observability() {
  const [data, setData] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MCPMetrics | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = () => api.getMetrics().then(setData).finally(() => setLoading(false))

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [autoRefresh])

  const maxCalls = Math.max(...(data?.mcps.map(m => m.call_count) ?? [1]))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown-700)' }}>Observability</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Real-time MCP usage · in-memory · resets on restart
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto refresh (5s)
          </label>
          <button className="btn btn-ghost" onClick={load} style={{ fontSize: 12 }}>⟳ Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading metrics...</div>
      ) : !data ? null : (
        <>
          {/* Summary stat cards */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Total Calls',   value: data.total_calls,  color: 'var(--brown-600)', bg: 'var(--brown-50)' },
              { label: 'Total Errors',  value: data.total_errors,  color: 'var(--red-500)',   bg: 'var(--red-50)' },
              { label: 'Active MCPs',   value: data.active_mcps,  color: 'var(--green-600)', bg: 'var(--green-50)' },
              { label: 'Success Rate',
                value: data.total_calls > 0
                  ? ((1 - data.total_errors / data.total_calls) * 100).toFixed(1) + '%'
                  : '—',
                color: 'var(--green-600)', bg: 'var(--green-50)' },
            ].map(c => (
              <div key={c.label} className="card" style={{ flex: 1, background: c.bg, border: 'none' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: .6, opacity: .7, marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
              </div>
            ))}
          </div>

          {data.mcps.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🦫</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>No tool calls recorded yet</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Go to Playground and run a tool to see metrics here</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: 16 }}>
              {/* Usage leaderboard */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-700)' }}>MCP Usage Leaderboard</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>click for details</span>
                </div>
                {data.mcps.map((m, i) => (
                  <div
                    key={m.mcp_name}
                    onClick={() => setSelected(selected?.mcp_name === m.mcp_name ? null : m)}
                    style={{
                      padding: '12px 18px', cursor: 'pointer',
                      background: selected?.mcp_name === m.mcp_name ? 'var(--brown-50)' : i % 2 === 0 ? 'transparent' : 'rgba(250,244,237,.5)',
                      borderBottom: '1px solid var(--border)',
                      borderLeft: selected?.mcp_name === m.mcp_name ? '3px solid var(--brown-400)' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (selected?.mcp_name !== m.mcp_name) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (selected?.mcp_name !== m.mcp_name) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(250,244,237,.5)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 18 }}>#{i + 1}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{m.mcp_name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brown-600)' }}>{m.call_count} calls</span>
                      {m.error_count > 0 && (
                        <span className="badge badge-red" style={{ fontSize: 10 }}>{m.error_count} err</span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>
                        {timeAgo(m.last_called)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 30 }}>
                      <Bar value={m.call_count} max={maxCalls} color="var(--brown-400)" />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 70 }}>
                        avg {m.avg_latency_ms}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detail panel */}
              {selected && (
                <div className="card" style={{ alignSelf: 'start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--brown-700)' }}>{selected.mcp_name}</span>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
                  </div>

                  <MetricRow label="Total Calls" value={selected.call_count} />
                  <MetricRow label="Errors" value={selected.error_count} color={selected.error_count > 0 ? 'var(--red-500)' : undefined} />
                  <MetricRow label="Error Rate" value={(selected.error_rate * 100).toFixed(1)} unit="%" color={selected.error_rate > 0.1 ? 'var(--red-500)' : 'var(--green-600)'} />
                  <MetricRow label="Avg Latency" value={selected.avg_latency_ms} unit="ms" />
                  <MetricRow label="Last Called" value={timeAgo(selected.last_called)} />

                  {selected.top_tools.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10 }}>
                        Top Tools
                      </div>
                      {selected.top_tools.map(t => (
                        <div key={t.tool_name} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span className="mono" style={{ fontSize: 11, color: 'var(--brown-600)' }}>{t.tool_name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.call_count}×</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Bar value={t.call_count} max={selected.call_count} color="var(--green-400)" />
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 50 }}>{t.avg_latency_ms}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
