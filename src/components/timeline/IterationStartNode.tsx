import { IterationStartNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'

interface Props { node: NodeType; index: number }

function TargetBlock({ sentence, flaggedBy, suggestion }: { sentence: string; flaggedBy: string[]; suggestion: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <blockquote style={{
        margin: '0 0 8px',
        padding: '10px 14px',
        borderLeft: '2px solid var(--color-accent)',
        background: 'var(--color-accent-dim)',
        borderRadius: '0 4px 4px 0',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--color-text)',
        lineHeight: 1.6,
        fontStyle: 'normal',
      }}>
        {sentence}
      </blockquote>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginBottom: suggestion ? '6px' : 0 }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginRight: '2px' }}>
          Flagged by:
        </span>
        {flaggedBy.map(name => (
          <span key={name} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-red)',
            background: 'var(--color-red-dim)',
            padding: '1px 6px',
            borderRadius: '3px',
          }}>
            {name}
          </span>
        ))}
      </div>

      {suggestion && (
        <div style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.6,
        }}>
          <span style={{ color: 'var(--color-text-subtle)', marginRight: '4px' }}>↳</span>
          {suggestion}
        </div>
      )}
    </div>
  )
}

export function IterationStartNode({ node, index }: Props) {
  const targets = node.targets ?? (
    node.targetSentence
      ? [{ sentence: node.targetSentence, flaggedBy: node.flaggedBy ?? [], suggestion: node.suggestion ?? '' }]
      : []
  )

  return (
    <TimelineNodeWrapper index={index}>
      <div style={{
        padding: '14px 0',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '10px',
        }}>
          Iteration {node.iterationNumber}/{node.maxRevisions} — {targets.length} sentence{targets.length !== 1 ? 's' : ''}
        </div>

        {targets.map((t, i) => (
          <TargetBlock key={i} {...t} />
        ))}
      </div>
    </TimelineNodeWrapper>
  )
}
