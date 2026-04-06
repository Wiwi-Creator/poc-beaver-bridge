const BASE = '/api/v1'
const KEY = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_KEY || 'dev-key-beaver-bridge'

const headers = () => ({
  'X-API-Key': KEY,
  'Content-Type': 'application/json',
})

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: headers(), ...init })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

export interface MCPServer {
  name: string
  display_name: string
  description: string | null
  url: string
  transport: string
  provider: string
  enabled: boolean
  status: 'reachable' | 'unreachable' | 'disabled' | 'unknown'
  tags: string[]
}

export interface RegisterMCPBody {
  name: string
  display_name: string
  description?: string
  url: string
  transport: 'sse' | 'streamable_http'
  auth_type: 'none' | 'bearer' | 'google_access_token' | 'google_id_token'
  auth_token?: string
  auth_audience?: string
  provider: string
  tags: string[]
  enabled: boolean
}

export interface ToolMetrics {
  tool_name: string
  call_count: number
  error_count: number
  error_rate: number
  avg_latency_ms: number
  last_called: string | null
}

export interface MCPMetrics {
  mcp_name: string
  call_count: number
  error_count: number
  error_rate: number
  avg_latency_ms: number
  last_called: string | null
  top_tools: ToolMetrics[]
}

export interface MetricsSummary {
  total_calls: number
  total_errors: number
  active_mcps: number
  mcps: MCPMetrics[]
}

export interface Tool {
  name: string
  description: string | null
  input_schema: Record<string, unknown>
}

export interface Resource {
  uri: string
  name: string | null
  description: string | null
  mime_type: string | null
}

export interface Prompt {
  name: string
  description: string | null
}

export interface ToolCallResponse {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>
  is_error: boolean
}

export const api = {
  health: () => req<{ status: string }>('/health'),
  listMCPs: (live = false) => req<MCPServer[]>(`${BASE}/mcps${live ? '?live=true' : ''}`),
  listTools: (name: string) => req<Tool[]>(`${BASE}/mcps/${name}/tools`),
  listResources: (name: string) => req<Resource[]>(`${BASE}/mcps/${name}/resources`),
  listPrompts: (name: string) => req<Prompt[]>(`${BASE}/mcps/${name}/prompts`),
  callTool: (mcpName: string, toolName: string, args: Record<string, unknown>) =>
    req<ToolCallResponse>(`${BASE}/mcps/${mcpName}/tools/${toolName}/call`, {
      method: 'POST',
      body: JSON.stringify({ arguments: args }),
    }),
  getMetrics: () => req<MetricsSummary>(`${BASE}/metrics`),
  getMCPMetrics: (name: string) => req<MCPMetrics>(`${BASE}/metrics/${name}`),
  registerMCP: (body: RegisterMCPBody) =>
    req<MCPServer>(`${BASE}/mcps`, { method: 'POST', body: JSON.stringify(body) }),
  deleteMCP: (name: string) =>
    fetch(`${BASE}/mcps/${name}`, { method: 'DELETE', headers: headers() })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`) }),
}
