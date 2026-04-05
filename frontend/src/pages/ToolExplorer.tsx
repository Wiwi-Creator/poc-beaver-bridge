import { useEffect, useState } from 'react'
import { api, Tool } from '../api'
import { useData } from '../hooks/useData'

export default function ToolExplorer({ onTest }: { onTest: (mcp: string, tool: string) => void }) {
  const { data: servers, loading: loadingServers } = useData('mcps', api.listMCPs)
  const [selected, setSelected] = useState<string>('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: tools, loading: loadingTools } = useData(
    selected ? `tools:${selected}` : '',
    () => api.listTools(selected),
    { enabled: !!selected },
  )

  // Auto-select first reachable server once data loads
  useEffect(() => {
    if (!selected && servers) {
      const first = servers.find(x => x.status === 'reachable')
      if (first) setSelected(first.name)
    }
  }, [servers, selected])

  // Reset expanded when selected changes
  useEffect(() => { setExpanded(null) }, [selected])

  const allTools = tools ?? []
  const allServers = servers ?? []
  const filtered = allTools.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const server = allServers.find(s => s.name === selected)

  return (
    <div style={{ display: 'flex', gap: 18, height: 'calc(100vh - 80px)' }}>
      {/* Left: MCP selector */}
      <div style={{
        width: 200, flexShrink: 0, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          MCP Servers
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingServers ? (
            <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
          ) : (
            allServers.map(s => (
              <button
                key={s.name}
                onClick={() => setSelected(s.name)}
                disabled={s.status === 'disabled'}
                style={{
                  width: '100%', padding: '10px 14px', border: 'none', textAlign: 'left',
                  background: selected === s.name ? 'rgba(139,94,60,.2)' : 'transparent',
                  cursor: s.status === 'disabled' ? 'not-allowed' : 'pointer',
                  borderLeft: selected === s.name ? '2px solid var(--brown-400)' : '2px solid transparent',
                  borderBottom: '1px solid var(--border)',
                  opacity: s.status === 'disabled' ? .4 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: selected === s.name ? 600 : 400, color: selected === s.name ? 'var(--brown-200)' : 'var(--text-secondary)' }}>
                    {s.display_name}
                  </span>
                  <span className={`pulse ${s.status === 'reachable' ? 'pulse-green' : s.status === 'disabled' ? 'pulse-gray' : 'pulse-red'}`} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Tools */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown-200)' }}>
              {server?.display_name || 'Select an MCP'} Tools
            </h2>
            {!loadingTools && allTools.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{allTools.length} tools available</div>
            )}
          </div>
          <input
            className="input"
            placeholder="Search tools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
        </div>

        {/* Tool list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingTools ? (
            <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>Loading tools...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(tool => (
                <div key={tool.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Tool header */}
                  <div
                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setExpanded(expanded === tool.name ? null : tool.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16 }}>⚙</span>
                      <div>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown-200)' }}>{tool.name}</div>
                        {tool.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 500 }} className="truncate">
                            {tool.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: '4px 12px' }}
                        onClick={e => { e.stopPropagation(); onTest(selected, tool.name) }}
                      >
                        ▶ Test
                      </button>
                      <span style={{ color: 'var(--text-muted)', transition: 'transform .15s', transform: expanded === tool.name ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                  </div>

                  {/* Expanded: schema */}
                  {expanded === tool.name && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'var(--bg)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Input Schema</div>
                      {tool.input_schema && Object.keys(tool.input_schema).length > 0 ? (
                        <SchemaViewer schema={tool.input_schema} />
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No parameters required</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SchemaViewer({ schema }: { schema: Record<string, unknown> }) {
  const props = (schema.properties as Record<string, Record<string, unknown>>) || {}
  const required = (schema.required as string[]) || []

  if (Object.keys(props).length === 0) {
    return <pre className="code-block">{JSON.stringify(schema, null, 2)}</pre>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(props).map(([key, val]) => (
        <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 10px', background: 'rgba(139,94,60,.06)', borderRadius: 'var(--radius-sm)' }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--brown-200)', minWidth: 160 }}>{key}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--blue-500)', minWidth: 60 }}>{String(val.type || 'any')}</span>
          {required.includes(key) && <span className="badge badge-red" style={{ fontSize: 10 }}>required</span>}
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{String(val.description || '')}</span>
        </div>
      ))}
    </div>
  )
}
