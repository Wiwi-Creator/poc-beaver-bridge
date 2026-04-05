import BeaverLogo from './BeaverLogo'

type Page = 'dashboard' | 'registry' | 'tools' | 'playground' | 'observability'

const NAV = [
  { id: 'dashboard',     label: 'Overview',       icon: '◈', desc: 'Status & stats' },
  { id: 'registry',      label: 'MCP Registry',   icon: '⬡', desc: 'All servers' },
  { id: 'tools',         label: 'Tool Explorer',  icon: '⚙', desc: 'Browse tools' },
  { id: 'playground',    label: 'Playground',     icon: '▶', desc: 'Test & run' },
  { id: 'observability', label: 'Observability',  icon: '◉', desc: 'Usage & metrics' },
] as const

export default function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <aside style={{
      width: 230, minHeight: '100vh',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
      boxShadow: '2px 0 12px rgba(92,61,36,.06)',
    }}>
      {/* Logo + title */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <BeaverLogo size={44} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--brown-600)', letterSpacing: -.3 }}>
              Beaver Bridge
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              MCP Gateway
            </div>
          </div>
        </div>
        {/* Author badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'var(--brown-50)', border: '1px solid var(--brown-100)',
          borderRadius: 20, padding: '3px 10px',
        }}>
          <span style={{ fontSize: 12 }}>🦫</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brown-500)' }}>by wiwi</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, padding: '4px 10px 10px', textTransform: 'uppercase' }}>
          Menu
        </div>
        {NAV.map(item => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id as Page)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: active ? 'var(--brown-50)' : 'transparent',
                color: active ? 'var(--brown-600)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                fontSize: 13, cursor: 'pointer', textAlign: 'left',
                borderLeft: active ? '3px solid var(--brown-400)' : '3px solid transparent',
                marginBottom: 3, transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <div>
                <div>{item.label}</div>
                {active && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{item.desc}</div>}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Connection info */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
          Connection
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span className="pulse pulse-green" />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>localhost:8089</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px',
          background: 'var(--brown-50)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--brown-100)',
        }}>
          <span style={{ fontSize: 10 }}>🔑</span>
          <span className="mono truncate" style={{ fontSize: 10, color: 'var(--brown-500)' }}>dev-key-beaver-bridge</span>
        </div>
      </div>
    </aside>
  )
}
