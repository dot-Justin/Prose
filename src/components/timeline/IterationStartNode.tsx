import { IterationStartNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'

interface Props { node: NodeType; index: number }

export function IterationStartNode({ node, index }: Props) {
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
          marginBottom: '8px',
        }}>
          Iteration {node.iterationNumber}/{node.maxRevisions}
        </div>

        {/* Target sentence */}
        <blockquote style={{
          margin: '0 0 10px',
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
          {node.targetSentence}
        </blockquote>

        {/* Flagged by */}
        <div style={{ marginBottom: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginRight: '2px' }}>
            Flagged by:
          </span>
          {node.flaggedBy.map(name => (
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

        {/* Suggestion */}
        {node.suggestion && (
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
          }}>
            <span style={{ color: 'var(--color-text-subtle)', marginRight: '4px' }}>↳</span>
            {node.suggestion}
          </div>
        )}
      </div>
    </TimelineNodeWrapper>
  )
}
