import { RedetectResultNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'
import { deltaIcon, deltaColor } from '../../utils/formatters'

interface Props { node: NodeType; index: number }

export function RedetectResultNode({ node, index }: Props) {
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
          Re-detection
        </div>

        {/* Delta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {node.deltas.map(d => {
            const color = deltaColor(d.before, d.after)
            const icon = deltaIcon(d.before, d.after)
            const diff = Math.abs(d.after - d.before)
            return (
              <span key={d.detector} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color,
                background: `${color}18`,
                border: `1px solid ${color}30`,
                borderRadius: '4px',
                padding: '2px 7px',
                whiteSpace: 'nowrap',
              }}>
                {d.detector} {icon}{diff}pt
              </span>
            )
          })}
        </div>

        {/* Decision */}
        <div style={{
          fontSize: '13px',
          fontFamily: 'var(--font-mono)',
          color: node.kept ? 'var(--color-green)' : 'var(--color-red)',
        }}>
          {node.kept ? '✓ Kept' : '✗ Reverted'}
          {' '}
          <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
            — {node.summary}
          </span>
        </div>
      </div>
    </TimelineNodeWrapper>
  )
}
