import { Session } from '../../types'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { SessionStartedNode } from './SessionStartedNode'
import { DetectionRunNode } from './DetectionRunNode'
import { IterationStartNode } from './IterationStartNode'
import { RewriteNode } from './RewriteNode'
import { RedetectResultNode } from './RedetectResultNode'
import { OutlierIgnoredNode } from './OutlierIgnoredNode'
import { SessionCompleteNode } from './SessionCompleteNode'
import { CurrentlyRunningNode } from './CurrentlyRunningNode'

interface Props {
  session: Session
}

export function Timeline({ session }: Props) {
  const scrollRef = useAutoScroll(session.nodes)

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 40px 80px',
        position: 'relative',
        minWidth: 0,
      }}
    >
      {/* Session title */}
      <div style={{
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--color-text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.4,
        }}>
          {session.title}
        </h2>
        <div style={{
          marginTop: '4px',
          fontSize: '12px',
          color: 'var(--color-text-subtle)',
          fontFamily: 'var(--font-mono)',
        }}>
          {session.status === 'complete-pass' && '✓ Passed'}
          {session.status === 'complete-fail' && '✗ Did not pass'}
          {session.status === 'in-progress' && '⋯ In progress'}
        </div>
      </div>

      {/* Vertical line */}
      <div style={{ position: 'relative', paddingLeft: '0' }}>
        <div style={{
          position: 'absolute',
          left: '0px',
          top: 0,
          bottom: 0,
          width: '1px',
          background: 'var(--color-border)',
        }} />

        {session.nodes.map((node, i) => {
          switch (node.type) {
            case 'SESSION_STARTED':
              return <SessionStartedNode key={node.id} node={node} index={i} />
            case 'DETECTION_RUN':
              return <DetectionRunNode key={node.id} node={node} index={i} />
            case 'ITERATION_START':
              return <IterationStartNode key={node.id} node={node} index={i} />
            case 'REWRITE':
              return <RewriteNode key={node.id} node={node} index={i} />
            case 'REDETECT_RESULT':
              return <RedetectResultNode key={node.id} node={node} index={i} />
            case 'OUTLIER_IGNORED':
              return <OutlierIgnoredNode key={node.id} node={node} index={i} />
            case 'SESSION_COMPLETE':
              return <SessionCompleteNode key={node.id} node={node} index={i} />
            case 'CURRENTLY_RUNNING':
              return <CurrentlyRunningNode key={node.id} node={node} index={i} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
