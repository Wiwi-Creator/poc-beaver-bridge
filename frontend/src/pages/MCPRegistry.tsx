import { useState } from 'react'
import { api, MCPServer, RegisterMCPBody, TestConnectionResult } from '../api'
import { useData, invalidate } from '../hooks/useData'

const PROVIDER_ICONS: Record<string, string> = {
  'Google Cloud': '☁️', 'Databricks': '🧱', 'AWS': '🟠',
  'Azure': '🔷', 'Custom': '🔧', 'Local': '💻',
}
const TAG_CLASS: Record<string, string> = {
  gcp: 'badge-blue', data: 'badge-yellow', sql: 'badge-yellow',
  observability: 'badge-green', infra: 'badge-gray', database: 'badge-blue',
  search: 'badge-green', ai: 'badge-yellow', maps: 'badge-green',
  kubernetes: 'badge-blue', cache: 'badge-gray', local: 'badge-blue',
  math: 'badge-yellow', time: 'badge-green', text: 'badge-gray',
}

type StatusFilter = 'all' | 'reachable' | 'unreachable' | 'disabled'

const EMPTY_FORM: RegisterMCPBody = {
  name: '', display_name: '', description: '', url: '',
  transport: 'streamable_http', auth_type: 'none',
  auth_token: '', auth_audience: '', provider: 'Local', tags: [], enabled: true,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: 4,
}

// ── Register / Edit Modal ─────────────────────────────────────────────────────
function MCPModal({
  mode, initial, onClose, onSuccess,
}: {
  mode: 'create' | 'edit'
  initial?: MCPServer
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<RegisterMCPBody>(() => {
    if (mode === 'edit' && initial) {
      return {
        name: initial.name,
        display_name: initial.display_name,
        description: initial.description ?? '',
        url: initial.url,
        transport: initial.transport as RegisterMCPBody['transport'],
        auth_type: (initial.auth_type ?? 'none') as RegisterMCPBody['auth_type'],
        auth_token: '',   // never pre-fill tokens
        auth_audience: '',
        provider: initial.provider,
        tags: initial.tags,
        enabled: initial.enabled,
      }
    }
    return EMPTY_FORM
  })
  const [tagsInput, setTagsInput] = useState(
    mode === 'edit' && initial ? initial.tags.join(', ') : ''
  )
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof RegisterMCPBody, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const result = await api.testMCP({ ...form, tags })
      setTestResult(result)
    } catch (err) {
      setTestResult({ ok: false, tool_count: 0, latency_ms: 0, error: String(err) })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const payload = { ...form, tags }
      if (mode === 'create') {
        await api.registerMCP(payload)
      } else {
        await api.updateMCP(form.name, payload)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="card" style={{ width: 540, padding: 28, maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown-700)' }}>
            {mode === 'create' ? '💻 Register New MCP' : `✏️ Edit — ${initial?.name}`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name + Display Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Name <span style={{ color: 'var(--red-500)' }}>*</span></label>
              <input
                className="input" placeholder="my-mcp"
                value={form.name} onChange={e => set('name', e.target.value)}
                required pattern="^[a-z0-9][a-z0-9\-]*$"
                title="Lowercase letters, numbers, hyphens only"
                disabled={mode === 'edit'}
                style={{ opacity: mode === 'edit' ? 0.6 : 1 }}
              />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                {mode === 'edit' ? 'Name cannot be changed' : 'lowercase + hyphens only'}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Display Name <span style={{ color: 'var(--red-500)' }}>*</span></label>
              <input className="input" placeholder="My MCP" value={form.display_name}
                onChange={e => set('display_name', e.target.value)} required />
            </div>
          </div>

          {/* URL + Test button */}
          <div>
            <label style={labelStyle}>URL <span style={{ color: 'var(--red-500)' }}>*</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="http://localhost:8091/mcp"
                value={form.url} onChange={e => set('url', e.target.value)}
                required type="url" style={{ flex: 1 }} />
              <button
                type="button" className="btn btn-ghost"
                onClick={handleTest} disabled={testing || !form.url}
                style={{ fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {testing ? '⟳ Testing...' : '⚡ Test'}
              </button>
            </div>
            {/* Test result */}
            {testResult && (
              <div style={{
                marginTop: 6, padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12,
                background: testResult.ok ? 'var(--green-50)' : 'var(--red-50)',
                border: `1px solid ${testResult.ok ? 'var(--green-200)' : 'var(--red-200)'}`,
                color: testResult.ok ? 'var(--green-700)' : 'var(--red-600)',
              }}>
                {testResult.ok
                  ? `✅ Connected — ${testResult.tool_count} tools found (${testResult.latency_ms}ms)`
                  : `❌ ${testResult.error}`}
              </div>
            )}
          </div>

          {/* Transport + Auth Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Transport</label>
              <select className="input" value={form.transport}
                onChange={e => set('transport', e.target.value as RegisterMCPBody['transport'])}>
                <option value="streamable_http">streamable_http</option>
                <option value="sse">sse</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Auth Type</label>
              <select className="input" value={form.auth_type}
                onChange={e => set('auth_type', e.target.value as RegisterMCPBody['auth_type'])}>
                <option value="none">none</option>
                <option value="bearer">bearer</option>
                <option value="google_access_token">google_access_token</option>
                <option value="google_id_token">google_id_token</option>
              </select>
            </div>
          </div>

          {/* Bearer token */}
          {form.auth_type === 'bearer' && (
            <div>
              <label style={labelStyle}>Bearer Token</label>
              <input className="input" placeholder={mode === 'edit' ? '（留空保留現有 token）' : 'your-token'}
                value={form.auth_token || ''} onChange={e => set('auth_token', e.target.value)} type="password" />
              {mode === 'edit' && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>留空則保留現有 token 不變</div>
              )}
            </div>
          )}

          {/* Google ID token audience */}
          {form.auth_type === 'google_id_token' && (
            <div>
              <label style={labelStyle}>Audience URL</label>
              <input className="input" placeholder="https://your-service-url"
                value={form.auth_audience || ''} onChange={e => set('auth_audience', e.target.value)} />
            </div>
          )}

          {/* Provider + Tags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Provider</label>
              <input className="input" placeholder="Local" value={form.provider}
                onChange={e => set('provider', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Tags</label>
              <input className="input" placeholder="local, math, tools"
                value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>comma-separated</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <input className="input" placeholder="Short description (optional)"
              value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Enabled */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.enabled}
              onChange={e => set('enabled', e.target.checked)} style={{ width: 15, height: 15 }} />
            <span style={{ color: 'var(--text-secondary)' }}>Enabled</span>
          </label>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--red-50)', border: '1px solid var(--red-200)',
              borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--red-600)',
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : mode === 'create' ? '+ Register' : '✓ Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; server?: MCPServer } | null>(null)
  const [deletingName, setDeletingName] = useState<string | null>(null)

  const refresh = (live = false) => {
    invalidate(live ? 'mcps:live' : 'mcps')
    setLiveMode(live)
  }

  const onMutated = () => { invalidate('mcps'); invalidate('mcps:live') }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete MCP "${name}"? This will remove it from the registry.`)) return
    setDeletingName(name)
    try {
      await api.deleteMCP(name)
      onMutated()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingName(null)
    }
  }

  const providers = [...new Set(servers.map(s => s.provider))].sort()
  const allTags = [...new Set(servers.flatMap(s => s.tags))].sort()

  const filtered = servers.filter(s => {
    if (search && !s.name.includes(search.toLowerCase()) && !s.display_name.toLowerCase().includes(search.toLowerCase()) && !(s.description || '').toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (selectedProvider && s.provider !== selectedProvider) return false
    if (selectedTag && !s.tags.includes(selectedTag)) return false
    return true
  })

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
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 12 }}>Filters</div>
          <input className="input" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16 }} />

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Status</div>
            {(['all', 'reachable', 'unreachable', 'disabled'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '5px 8px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: statusFilter === s ? 'var(--brown-50)' : 'transparent',
                color: statusFilter === s ? 'var(--brown-600)' : 'var(--text-secondary)',
                fontWeight: statusFilter === s ? 600 : 400, fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}>
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

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Provider</div>
            <button onClick={() => setSelectedProvider(null)} style={{
              display: 'flex', justifyContent: 'space-between', width: '100%', padding: '5px 8px',
              border: 'none', borderRadius: 'var(--radius-sm)',
              background: !selectedProvider ? 'var(--brown-50)' : 'transparent',
              color: !selectedProvider ? 'var(--brown-600)' : 'var(--text-secondary)',
              fontWeight: !selectedProvider ? 600 : 400, fontSize: 12, cursor: 'pointer', textAlign: 'left',
            }}>
              <span>All</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{servers.length}</span>
            </button>
            {providers.map(p => (
              <button key={p} onClick={() => setSelectedProvider(selectedProvider === p ? null : p)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '5px 8px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: selectedProvider === p ? 'var(--brown-50)' : 'transparent',
                color: selectedProvider === p ? 'var(--brown-600)' : 'var(--text-secondary)',
                fontWeight: selectedProvider === p ? 600 : 400, fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}>
                <span>{PROVIDER_ICONS[p] || '📦'} {p}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{servers.filter(s => s.provider === p).length}</span>
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {allTags.map(t => (
                <button key={t} onClick={() => setSelectedTag(selectedTag === t ? null : t)} style={{
                  padding: '2px 8px', borderRadius: 20,
                  background: selectedTag === t ? 'var(--brown-500)' : 'var(--brown-50)',
                  color: selectedTag === t ? 'white' : 'var(--brown-500)',
                  fontSize: 11, cursor: 'pointer', fontWeight: selectedTag === t ? 600 : 400,
                  outline: `1px solid ${selectedTag === t ? 'var(--brown-500)' : 'var(--brown-100)'}`,
                  border: 'none',
                }}>{t}</button>
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
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{filtered.length} of {servers.length} servers</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => refresh(false)} disabled={refreshing} style={{ fontSize: 12 }}>
              {refreshing ? '⟳ ...' : '⟳ Cache'}
            </button>
            <button className="btn btn-ghost" onClick={() => refresh(true)} disabled={refreshing} style={{ fontSize: 12, color: 'var(--green-600)' }}>
              ⟳ Live ping
            </button>
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })} style={{ fontSize: 12 }}>
              + Register MCP
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(grouped).map(([provider, list]) => (
              <div key={provider}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{PROVIDER_ICONS[provider] || '📦'}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--brown-600)' }}>{provider}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--brown-50)', border: '1px solid var(--brown-100)', borderRadius: 20, padding: '1px 8px' }}>{list.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {list.map(s => (
                    <div key={s.name} className="card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{s.display_name}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.name}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <span className={`badge ${s.status === 'reachable' ? 'badge-green' : s.status === 'disabled' ? 'badge-gray' : s.status === 'unknown' ? 'badge-yellow' : 'badge-red'}`}>
                            <span className={`pulse pulse-${s.status === 'reachable' ? 'green' : s.status === 'disabled' || s.status === 'unknown' ? 'gray' : 'red'}`} />
                            {s.status}
                          </span>
                          {/* Edit */}
                          <button
                            onClick={() => setModal({ mode: 'edit', server: s })}
                            title="Edit MCP"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '2px 4px', borderRadius: 'var(--radius-sm)', lineHeight: 1 }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brown-500)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                          >✏️</button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(s.name)}
                            disabled={deletingName === s.name}
                            title="Delete MCP"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '2px 4px', borderRadius: 'var(--radius-sm)', lineHeight: 1 }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-500)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                          >{deletingName === s.name ? '...' : '✕'}</button>
                        </div>
                      </div>

                      {s.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }} className="truncate">
                          {s.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {s.tags.map(t => (
                            <button key={t} className={`badge ${TAG_CLASS[t] || 'badge-gray'}`}
                              style={{ fontSize: 10, cursor: 'pointer', border: 'none' }}
                              onClick={() => setSelectedTag(selectedTag === t ? null : t)}>
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

      {/* Modal */}
      {modal && (
        <MCPModal
          mode={modal.mode}
          initial={modal.server}
          onClose={() => setModal(null)}
          onSuccess={onMutated}
        />
      )}
    </div>
  )
}
