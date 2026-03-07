import { RewriteNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'

interface Props { node: NodeType; index: number }

export function RewriteNode({ node, index }: Props) {
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
          Rewrite
        </div>

        {/* Old sentence */}
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
          {node.original}
        </div>

        {/* Arrow */}
        <div style={{
          fontSize: '12px',
          color: 'var(--color-text-subtle)',
          marginBottom: '6px',
          fontFamily: 'var(--font-mono)',
        }}>
          ↓
        </div>

        {/* New sentence */}
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
          {node.rewritten}
        </div>
      </div>
    </TimelineNodeWrapper>
  )
}
