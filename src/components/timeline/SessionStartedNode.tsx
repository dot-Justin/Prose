import { SessionStartedNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'

interface Props { node: NodeType; index: number }

export function SessionStartedNode({ node, index }: Props) {
  return (
    <TimelineNodeWrapper index={index}>
      <div style={{
        padding: '14px 0 14px 0',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
        }}>
          Session started
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <Stat label="words" value={String(node.wordCount)} />
          <Stat label="style" value={node.style || 'General'} />
          <Stat label="target" value={`${node.targetDetectionPct}%`} />
          <Stat label="max rev." value={String(node.maxRevisions)} />
        </div>
        {node.requirements && (
          <div style={{
            marginTop: '10px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            lineHeight: 1.5,
            paddingLeft: '8px',
            borderLeft: '2px solid var(--color-border)',
          }}>
            {node.requirements.length > 120
              ? node.requirements.slice(0, 120) + '…'
              : node.requirements}
          </div>
        )}
      </div>
    </TimelineNodeWrapper>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginTop: '1px' }}>
        {value}
      </div>
    </div>
  )
}
