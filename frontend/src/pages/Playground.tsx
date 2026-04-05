import { useEffect, useState } from 'react'
import { api, ToolCallResponse } from '../api'
import { useData } from '../hooks/useData'

interface PlaygroundProps {
  initialMcp?: string
  initialTool?: string
}

export default function Playground({ initialMcp, initialTool }: PlaygroundProps) {
  const { data: servers } = useData('mcps', api.listMCPs)
  const [selectedMcp, setSelectedMcp] = useState(initialMcp || '')
  const [selectedTool, setSelectedTool] = useState(initialTool || '')
  const [argsJson, setArgsJson] = useState('{}')
  const [response, setResponse] = useState<ToolCallResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<Array<{ mcp: string; tool: string; args: string; response: ToolCallResponse; ts: string }>>([])

  const { data: toolsData, loading: loadingTools } = useData(
    selectedMcp ? `tools:${selectedMcp}` : '',
    () => api.listTools(selectedMcp),
    { enabled: !!selectedMcp },
  )
  const tools = toolsData ?? []

  // Auto-select first reachable MCP
  useEffect(() => {
    if (!selectedMcp && servers) {
      const first = servers.find(x => x.status === 'reachable')
      if (first) setSelectedMcp(first.name)
    }
  }, [servers, selectedMcp])

  // Auto-select tool when tools load
  useEffect(() => {
    if (!tools.length) return
    if (initialTool) {
      setSelectedTool(initialTool)
    } else if (!selectedTool) {
      setSelectedTool(tools[0].name)
    }
  }, [tools])

  // Auto-fill default args when tool changes
  useEffect(() => {
    const tool = tools.find(t => t.name === selectedTool)
    if (!tool) return
    const props = (tool.input_schema?.properties as Record<string, Record<string, unknown>>) || {}
    const defaults: Record<string, unknown> = {}
    Object.entries(props).forEach(([k, v]) => {
      if (v.default !== undefined) defaults[k] = v.default
      else if (v.type === 'string') defaults[k] = ''
      else if (v.type === 'integer' || v.type === 'number') defaults[k] = 0
      else if (v.type === 'boolean') defaults[k] = false
      else if (v.type === 'array') defaults[k] = []
      else defaults[k] = null
    })
    setArgsJson(JSON.stringify(defaults, null, 2))
    setResponse(null)
    setError(null)
  }, [selectedTool, tools])

  const run = async () => {
    setRunning(true)
    setError(null)
    setResponse(null)
    try {
      const args = JSON.parse(argsJson)
      const result = await api.callTool(selectedMcp, selectedTool, args)
      setResponse(result)
      setHistory(h => [{
        mcp: selectedMcp, tool: selectedTool, args: argsJson, response: result,
        ts: new Date().toLocaleTimeString(),
      }, ...h.slice(0, 9)])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const tool = tools.find(t => t.name === selectedTool)
  const required = (tool?.input_schema?.required as string[]) || []
  const props = (tool?.input_schema?.properties as Record<string, Record<string, unknown>>) || {}

  let jsonError = ''
  try { JSON.parse(argsJson) } catch { jsonError = 'Invalid JSON' }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown-200)' }}>Playground</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>Select an MCP, pick a tool, fill args, and run</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* MCP + Tool selectors */}
          <div className="card">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  MCP Server
                </label>
                <select className="select" value={selectedMcp} onChange={e => setSelectedMcp(e.target.value)}>
                  {(servers ?? []).filter(s => s.status !== 'disabled').map(s => (
                    <option key={s.name} value={s.name}>{s.display_name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Tool
                </label>
                <select className="select" value={selectedTool} onChange={e => setSelectedTool(e.target.value)} disabled={loadingTools}>
                  {loadingTools ? <option>Loading...</option> : tools.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {tool?.description && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {tool.description}
              </div>
            )}
          </div>

          {/* Schema reference */}
          {Object.keys(props).length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Parameters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Object.entries(props).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                    <span className="mono" style={{ color: 'var(--brown-200)', minWidth: 140 }}>{k}</span>
                    <span className="mono" style={{ color: 'var(--blue-500)', minWidth: 50 }}>{String(v.type || 'any')}</span>
                    {required.includes(k) && <span className="badge badge-red" style={{ fontSize: 9 }}>req</span>}
                    <span style={{ color: 'var(--text-muted)' }}>{String(v.description || '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Args editor */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Arguments (JSON)
              </label>
              {jsonError && <span style={{ fontSize: 11, color: '#f4845f' }}>{jsonError}</span>}
            </div>
            <textarea
              className="textarea"
              rows={8}
              value={argsJson}
              onChange={e => setArgsJson(e.target.value)}
              spellCheck={false}
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 10, justifyContent: 'center', fontSize: 14, padding: '10px' }}
              onClick={run}
              disabled={running || !!jsonError || !selectedTool}
            >
              {running ? '⟳ Running...' : '▶ Run Tool'}
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Response */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Response
              </div>
              {response && (
                <span className={`badge ${response.is_error ? 'badge-red' : 'badge-green'}`}>
                  {response.is_error ? '✗ Error' : '✓ Success'}
                </span>
              )}
            </div>

            {!response && !error && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                Run a tool to see the response
              </div>
            )}

            {error && (
              <div style={{ padding: '12px 14px', background: 'rgba(193,68,14,.1)', border: '1px solid rgba(193,68,14,.3)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#f4845f' }}>
                {error}
              </div>
            )}

            {response && (
              <div>
                {response.content.map((c, i) => (
                  <div key={i}>
                    {c.type === 'text' && c.text ? (
                      <pre className="code-block" style={{ maxHeight: 380 }}>
                        {(() => { try { return JSON.stringify(JSON.parse(c.text as string), null, 2) } catch { return c.text as string } })()}
                      </pre>
                    ) : (
                      <pre className="code-block">{JSON.stringify(c, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    onClick={() => { setSelectedMcp(h.mcp); setSelectedTool(h.tool); setArgsJson(h.args); setResponse(h.response); setError(null) }}
                  >
                    <div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--brown-200)' }}>{h.mcp}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> · </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--brown-300)' }}>{h.tool}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.ts}</span>
                      <span className={`badge ${h.response.is_error ? 'badge-red' : 'badge-green'}`} style={{ fontSize: 9 }}>
                        {h.response.is_error ? '✗' : '✓'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
