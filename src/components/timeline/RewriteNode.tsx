import { ArrowDown } from '@phosphor-icons/react'
import { RewriteNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'

interface Props { node: NodeType; index: number }

function RewritePair({ original, rewritten }: { original: string; rewritten: string }) {
  return (
    <div>
      <div style={{
        fontSize: '13px',
        lineHeight: 1.6,
        color: 'var(--color-text-subtle)',
        textDecoration: 'line-through',
        textDecorationColor: 'var(--color-border)',
        marginBottom: '8px',
        fontFamily: 'var(--font-mono)',
        opacity: 0.7,
      }}>
        {original}
      </div>

      <div style={{
        fontSize: '12px',
        color: 'var(--color-text-subtle)',
        marginBottom: '6px',
        fontFamily: 'var(--font-mono)',
      }}>
        <ArrowDown size={12} />
      </div>

      <div style={{
        fontSize: '13px',
        lineHeight: 1.6,
        color: 'var(--color-text)',
        fontFamily: 'var(--font-mono)',
        textDecoration: 'underline',
        textDecorationColor: 'var(--color-accent)',
        textDecorationThickness: '1px',
        textUnderlineOffset: '3px',
      }}>
        {rewritten}
      </div>
    </div>
  )
}

export function RewriteNode({ node, index }: Props) {
  const pairs = node.rewrites ?? (
    node.original !== undefined
      ? [{ original: node.original, rewritten: node.rewritten ?? node.original }]
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
          Rewrite — {pairs.length} sentence{pairs.length !== 1 ? 's' : ''}
        </div>

        {pairs.map((pair, i) => (
          <div key={i}>
            <RewritePair original={pair.original} rewritten={pair.rewritten ?? pair.original} />
            {i < pairs.length - 1 && (
              <div style={{
                borderTop: '1px solid var(--color-border)',
                margin: '12px 0',
              }} />
            )}
          </div>
        ))}
      </div>
    </TimelineNodeWrapper>
  )
}
