import { OutlierIgnoredNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'

interface Props { node: NodeType; index: number }

export function OutlierIgnoredNode({ node, index }: Props) {
  return (
    <TimelineNodeWrapper index={index}>
      <div style={{ padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-accent-dim)',
          border: '1px solid rgba(201,151,74,0.25)',
          borderRadius: '6px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-accent)',
              marginBottom: '3px',
              fontFamily: 'var(--font-mono)',
            }}>
              {node.detectorName} ignored
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
            }}>
              {node.reason}
            </div>
          </div>
        </div>
      </div>
    </TimelineNodeWrapper>
  )
}
