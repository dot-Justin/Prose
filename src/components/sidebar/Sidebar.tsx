import { useState } from 'react'
import { Session } from '../../types'
import { SessionListItem } from './SessionListItem'

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-subtle)',
  padding: '5px 7px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'color 0.12s',
}

interface Props {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onOpenSettings: () => void
}

export function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onOpenSettings }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{
      width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {collapsed ? (
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: '16px',
            color: 'var(--color-accent)',
            letterSpacing: '-0.02em',
          }}>P</span>
        ) : (
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: '18px',
            color: 'var(--color-text)',
            letterSpacing: '-0.03em',
          }}>Prose</span>
        )}
      </div>

      {/* New Session button */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px',
        flexShrink: 0,
      }}>
        <button
          onClick={onNewSession}
          title="New Session"
          style={{
            width: '100%',
            padding: collapsed ? '8px' : '8px 12px',
            background: 'var(--color-accent)',
            color: '#0f0e0d',
            border: 'none',
            borderRadius: '6px',
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'center',
            gap: '6px',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent)')}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
            <line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {!collapsed && 'New Session'}
        </button>
      </div>

      {/* Session list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 0',
      }}>
        {sessions.length === 0 ? (
          !collapsed && (
            <p style={{
              padding: '12px 16px',
              fontSize: '12px',
              color: 'var(--color-text-subtle)',
              fontStyle: 'italic',
            }}>
              No sessions yet
            </p>
          )
        ) : (
          sessions.map(session => (
            <SessionListItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              collapsed={collapsed}
              onClick={() => onSelectSession(session.id)}
            />
          ))
        )}
      </div>

      {/* Bottom bar: settings + collapse */}
      <div style={{
        padding: '8px',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
        gap: '4px',
      }}>
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={iconBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-subtle)')}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M12.1 8.8l.9.5a.5.5 0 01.2.7l-1 1.7a.5.5 0 01-.7.2l-.9-.5c-.4.3-.9.5-1.4.7l-.1 1a.5.5 0 01-.5.4H7.4a.5.5 0 01-.5-.4l-.1-1c-.5-.2-1-.4-1.4-.7l-.9.5a.5.5 0 01-.7-.2l-1-1.7a.5.5 0 01.2-.7l.9-.5V6.2l-.9-.5a.5.5 0 01-.2-.7l1-1.7a.5.5 0 01.7-.2l.9.5c.4-.3.9-.5 1.4-.7l.1-1A.5.5 0 017.4 1.5h2a.5.5 0 01.5.4l.1 1c.5.2 1 .4 1.4.7l.9-.5a.5.5 0 01.7.2l1 1.7a.5.5 0 01-.2.7l-.9.5v2.6z" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          {!collapsed && <span style={{ fontSize: '11px', fontFamily: 'var(--font-ui)' }}>Settings</span>}
        </button>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={iconBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-subtle)')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {collapsed ? (
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>
    </div>
  )
}
