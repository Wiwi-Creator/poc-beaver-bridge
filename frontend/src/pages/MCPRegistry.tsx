import { useState } from 'react'
import { api, MCPServer } from '../api'
import { useData, invalidate } from '../hooks/useData'

const PROVIDER_ICONS: Record<string, string> = {
  'Google Cloud': '☁️',
  'Databricks':   '🧱',
  'AWS':          '🟠',
  'Azure':        '🔷',
  'Custom':       '🔧',
}

const TAG_CLASS: Record<string, string> = {
  gcp: 'badge-blue', data: 'badge-yellow', sql: 'badge-yellow',
  observability: 'badge-green', infra: 'badge-gray', database: 'badge-blue',
  search: 'badge-green', ai: 'badge-yellow', maps: 'badge-green',
  kubernetes: 'badge-blue', cache: 'badge-gray',
}

type StatusFilter = 'all' | 'reachable' | 'unreachable' | 'disabled'

export default function MCPRegistry() {
  const [liveMode, setLiveMode] = useState(false)
  const { data, loading, refreshing } = useData(
    liveMode ? 'mcps:live' : 'mcps',
    () => api.listMCPs(liveMode),
  )
  const servers = data ?? []
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const load = (live = false) => {
    invalidate(live ? 'mcps:live' : 'mcps')
    setLiveMode(live)
  }

  // Derived
  const providers = [...new Set(servers.map(s => s.provider))].sort()
  const allTags = [...new Set(servers.flatMap(s => s.tags))].sort()

  const filtered = servers.filter(s => {
    if (search && !s.name.includes(search.toLowerCase()) && !s.display_name.toLowerCase().includes(search.toLowerCase()) && !(s.description || '').toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (selectedProvider && s.provider !== selectedProvider) return false
    if (selectedTag && !s.tags.includes(selectedTag)) return false
    return true
  })

  // Group by provider
  const grouped = filtered.reduce<Record<string, MCPServer[]>>((acc, s) => {
    if (!acc[s.provider]) acc[s.provider] = []
    acc[s.provider].push(s)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* ── Left filter panel ── */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div className="card" style={{ padding: '16px', position: 'sticky', top: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 12 }}>
            Filters
          </div>

          {/* Search */}
          <input
            className="input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          {/* Status */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Status</div>
            {(['all', 'reachable', 'unreachable', 'disabled'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '5px 8px', border: 'none', borderRadius: 'var(--radius-sm)',
                  background: statusFilter === s ? 'var(--brown-50)' : 'transparent',
                  color: statusFilter === s ? 'var(--brown-600)' : 'var(--text-secondary)',
                  fontWeight: statusFilter === s ? 600 : 400,
                  fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s !== 'all' && <span className={`pulse pulse-${s === 'reachable' ? 'green' : s === 'disabled' ? 'gray' : 'red'}`} />}
                  {s}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {s === 'all' ? servers.length : servers.filter(x => x.status === s).length}
                </span>
              </button>
            ))}
          </div>

          {/* Provider */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Provider</div>
            <button
              onClick={() => setSelectedProvider(null)}
              style={{
                display: 'flex', justifyContent: 'space-between',
                width: '100%', padding: '5px 8px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: !selectedProvider ? 'var(--brown-50)' : 'transparent',
                color: !selectedProvider ? 'var(--brown-600)' : 'var(--text-secondary)',
                fontWeight: !selectedProvider ? 600 : 400, fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span>All</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{servers.length}</span>
            </button>
            {providers.map(p => (
              <button
                key={p}
                onClick={() => setSelectedProvider(selectedProvider === p ? null : p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '5px 8px', border: 'none', borderRadius: 'var(--radius-sm)',
                  background: selectedProvider === p ? 'var(--brown-50)' : 'transparent',
                  color: selectedProvider === p ? 'var(--brown-600)' : 'var(--text-secondary)',
                  fontWeight: selectedProvider === p ? 600 : 400,
                  fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span>{PROVIDER_ICONS[p] || '📦'} {p}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{servers.filter(s => s.provider === p).length}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {allTags.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  style={{
                    padding: '2px 8px', borderRadius: 20,
                    background: selectedTag === t ? 'var(--brown-500)' : 'var(--brown-50)',
                    color: selectedTag === t ? 'white' : 'var(--brown-500)',
                    fontSize: 11, cursor: 'pointer', fontWeight: selectedTag === t ? 600 : 400,
                    outline: `1px solid ${selectedTag === t ? 'var(--brown-500)' : 'var(--brown-100)'}`,
                    border: 'none',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: grouped MCP list ── */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown-700)' }}>MCP Registry</h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {filtered.length} of {servers.length} servers
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => load(false)} disabled={refreshing} style={{ fontSize: 12 }}>
              {refreshing ? '⟳ ...' : '⟳ Cache'}
            </button>
            <button className="btn btn-ghost" onClick={() => load(true)} disabled={refreshing} style={{ fontSize: 12, color: 'var(--green-600)' }}>
              ⟳ Live ping
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(grouped).map(([provider, list]) => (
              <div key={provider}>
                {/* Provider group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{PROVIDER_ICONS[provider] || '📦'}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--brown-600)' }}>{provider}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--brown-50)', border: '1px solid var(--brown-100)', borderRadius: 20, padding: '1px 8px' }}>
                    {list.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
                </div>

                {/* Cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {list.map(s => (
                    <div key={s.name} className="card" style={{ padding: 16, cursor: 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{s.display_name}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.name}</div>
                        </div>
                        <span className={`badge ${s.status === 'reachable' ? 'badge-green' : s.status === 'disabled' ? 'badge-gray' : 'badge-red'}`} style={{ flexShrink: 0 }}>
                          <span className={`pulse pulse-${s.status === 'reachable' ? 'green' : s.status === 'disabled' ? 'gray' : 'red'}`} />
                          {s.status}
                        </span>
                      </div>

                      {s.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }} className="truncate">
                          {s.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {s.tags.map(t => (
                            <button
                              key={t}
                              className={`badge ${TAG_CLASS[t] || 'badge-gray'}`}
                              style={{ fontSize: 10, cursor: 'pointer', border: 'none', background: undefined }}
                              onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <span className="badge badge-blue" style={{ fontSize: 10, flexShrink: 0 }}>{s.transport}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
