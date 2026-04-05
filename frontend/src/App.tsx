import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import MCPRegistry from './pages/MCPRegistry'
import ToolExplorer from './pages/ToolExplorer'
import Playground from './pages/Playground'
import Observability from './pages/Observability'

type Page = 'dashboard' | 'registry' | 'tools' | 'playground' | 'observability'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [playgroundMcp, setPlaygroundMcp] = useState<string | undefined>()
  const [playgroundTool, setPlaygroundTool] = useState<string | undefined>()

  const goPlayground = (mcp: string, tool: string) => {
    setPlaygroundMcp(mcp)
    setPlaygroundTool(tool)
    setPage('playground')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} setPage={setPage} />

      <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', overflowY: 'auto', minHeight: '100vh' }}>
        {/* Page header breadcrumb */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Beaver Bridge</span>
          <span>›</span>
          <span style={{ color: 'var(--brown-300)' }}>
            {{ dashboard: 'Overview', registry: 'MCP Registry', tools: 'Tool Explorer', playground: 'Playground', observability: 'Observability' }[page]}
          </span>
        </div>

        {page === 'dashboard'   && <Dashboard onNavigate={setPage} />}
        {page === 'registry'    && <MCPRegistry />}
        {page === 'tools'       && <ToolExplorer onTest={goPlayground} />}
        {page === 'playground'     && <Playground key={`${playgroundMcp}-${playgroundTool}`} initialMcp={playgroundMcp} initialTool={playgroundTool} />}
        {page === 'observability'  && <Observability />}
      </main>
    </div>
  )
}
