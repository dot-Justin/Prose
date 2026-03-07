import { useState } from 'react'
import { Session } from '../../types'
import { SessionListItem } from './SessionListItem'

interface Props {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
}

export function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession }: Props) {
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

      {/* Collapse toggle */}
      <div style={{
        padding: '12px 0',
        display: 'flex',
        justifyContent: 'center',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-subtle)',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.12s',
          }}
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
