import { api } from '../api'
import BeaverLogo from '../components/BeaverLogo'
import { useData } from '../hooks/useData'

const TAG_COLORS: Record<string, string> = {
  'gcp': 'badge-blue', 'data': 'badge-yellow', 'sql': 'badge-yellow',
  'observability': 'badge-green', 'infra': 'badge-gray',
  'database': 'badge-blue', 'search': 'badge-green', 'ai': 'badge-yellow',
  'maps': 'badge-green', 'kubernetes': 'badge-blue', 'cache': 'badge-gray',
}

function StatCard({ label, value, sub, color, bg }: { label: string; value: number | string; sub?: string; color: string; bg: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160, background: bg, borderColor: 'transparent' }}>
      <div style={{ fontSize: 11, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, opacity: .7 }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color, marginTop: 6, opacity: .6 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard({ onNavigate }: { onNavigate: (page: 'registry' | 'tools' | 'playground') => void }) {
  const { data, loading, error } = useData('mcps', api.listMCPs)
  const servers = data ?? []

  const reachable = servers.filter(s => s.status === 'reachable').length
  const unreachable = servers.filter(s => s.status === 'unreachable').length
  const disabled = servers.filter(s => s.status === 'disabled').length

  // Group by tags
  const tagMap: Record<string, number> = {}
  servers.forEach(s => s.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1 }))

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #fff9f4 0%, #fef3e8 50%, #fdf0e2 100%)',
        border: '1px solid var(--brown-100)', borderRadius: 'var(--radius-lg)',
        padding: '32px 36px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 28,
        boxShadow: '0 2px 16px rgba(139,94,60,.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative bg circles */}
        <div style={{ position: 'absolute', right: 60, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(196,149,106,.08)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', right: 20, bottom: -50, width: 140, height: 140, borderRadius: '50%', background: 'rgba(196,149,106,.06)', pointerEvents: 'none' }}/>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <BeaverLogo size={90} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--brown-600)', letterSpacing: -.5 }}>
              Beaver Bridge
            </h1>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brown-400)', background: 'var(--brown-50)', border: '1px solid var(--brown-100)', borderRadius: 20, padding: '2px 10px' }}>
              by wiwi
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 480, lineHeight: 1.7, marginBottom: 18 }}>
            Central API gateway bridging multiple MCP servers.
            One endpoint to discover, browse, and invoke tools across all your connected services.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => onNavigate('registry')}>⬡ Browse MCPs</button>
            <button className="btn btn-ghost" onClick={() => onNavigate('playground')}>▶ Playground</button>
            <button className="btn btn-ghost" onClick={() => onNavigate('tools')}>⚙ Tools</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#f4845f', padding: '20px 0' }}>⚠ {error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatCard label="Total MCPs" value={servers.length} sub="registered" color="var(--brown-600)" bg="var(--brown-50)" />
            <StatCard label="Reachable"  value={reachable}      sub="online now" color="var(--green-600)" bg="var(--green-50)" />
            <StatCard label="Unreachable" value={unreachable}   sub="offline"    color="var(--red-500)"   bg="var(--red-50)" />
            <StatCard label="Disabled"   value={disabled}       sub="paused"     color="var(--text-muted)" bg="#f5f0eb" />
          </div>

          {/* MCP status grid */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--brown-200)', marginBottom: 14 }}>
              ⬡ MCP Servers
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {servers.map(s => (
                <div
                  key={s.name}
                  className="card"
                  style={{ cursor: 'pointer', transition: 'border-color .15s' }}
                  onClick={() => onNavigate('tools')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{s.display_name}</div>
                      <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.name}</div>
                    </div>
                    <span className={`badge ${s.status === 'reachable' ? 'badge-green' : s.status === 'disabled' ? 'badge-gray' : 'badge-red'}`}>
                      <span className={`pulse ${s.status === 'reachable' ? 'pulse-green' : s.status === 'disabled' ? 'pulse-gray' : 'pulse-red'}`} />
                      {s.status}
                    </span>
                  </div>
                  {s.description && (
                    <div className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      {s.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {s.tags.map(t => (
                      <span key={t} className={`badge ${TAG_COLORS[t] || 'badge-gray'}`} style={{ fontSize: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tag breakdown */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--brown-200)', marginBottom: 14 }}>
              Categories
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(tagMap).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                <div key={tag} style={{
                  padding: '6px 14px', borderRadius: 20, background: 'var(--bg-card)',
                  border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)',
                }}>
                  {tag} <strong style={{ color: 'var(--brown-300)' }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
