import { useState } from 'react'
import { CaretLeft, CaretRight, GearSix, Plus } from '@phosphor-icons/react'
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
          <img
            src="/logos/prose_mark_gold.svg"
            alt="Prose"
            style={{
              display: 'block',
              width: '24px',
              height: '24px',
            }}
          />
        ) : (
          <img
            src="/logos/prose_logo_horizontal_white.svg"
            alt="Prose"
            style={{
              display: 'block',
              width: 'auto',
              height: '24px',
              maxWidth: '100%',
            }}
          />
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
          <Plus size={13} style={{ flexShrink: 0 }} />
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
          <GearSix size={15} />
          {!collapsed && <span style={{ fontSize: '11px', fontFamily: 'var(--font-ui)' }}>Settings</span>}
        </button>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={iconBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-subtle)')}
        >
          {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
        </button>
      </div>
    </div>
  )
}
