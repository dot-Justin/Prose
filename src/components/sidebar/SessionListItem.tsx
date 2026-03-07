import { Session } from '../../types'
import { relativeTime } from '../../utils/formatters'
import { ScoreBadge } from './ScoreBadge'

interface Props {
  session: Session
  isActive: boolean
  collapsed: boolean
  onClick: () => void
}

export function SessionListItem({ session, isActive, collapsed, onClick }: Props) {
  const statusDot =
    session.status === 'in-progress'
      ? 'var(--color-accent)'
      : session.status === 'complete-pass'
      ? 'var(--color-green)'
      : 'var(--color-red)'

  return (
    <button
      onClick={onClick}
      title={session.title}
      style={{
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        padding: collapsed ? '10px 0' : '10px 12px',
        display: 'flex',
        alignItems: collapsed ? 'center' : 'flex-start',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '10px',
        borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
        borderRadius: '0 4px 4px 0',
        background: isActive ? 'var(--color-accent-dim)' : 'none',
        transition: 'background 0.12s, border-color 0.12s',
        textAlign: 'left',
      } as React.CSSProperties}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'none'
      }}
    >
      {/* Status dot */}
      <span style={{
        flexShrink: 0,
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: statusDot,
        marginTop: collapsed ? 0 : 3,
        boxShadow: session.status === 'in-progress' ? `0 0 6px ${statusDot}` : 'none',
      }} />

      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}>
            {session.title}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '3px',
          }}>
            <span style={{
              fontSize: '11px',
              color: 'var(--color-text-subtle)',
              fontFamily: 'var(--font-mono)',
            }}>
              {relativeTime(session.createdAt)}
            </span>
            {session.status !== 'in-progress' && (
              <ScoreBadge score={session.overallScore} />
            )}
          </div>
        </div>
      )}
    </button>
  )
}
