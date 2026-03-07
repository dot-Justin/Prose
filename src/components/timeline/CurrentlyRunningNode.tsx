import { motion } from 'framer-motion'
import { CurrentlyRunningNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'

interface Props { node: NodeType; index: number }

export function CurrentlyRunningNode({ node, index }: Props) {
  return (
    <TimelineNodeWrapper index={index} isPulsing>
      <div style={{ padding: '14px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Spinner dots */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                style={{
                  display: 'block',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                }}
              />
            ))}
          </div>
          <span style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {node.message}
          </span>
        </div>
      </div>
    </TimelineNodeWrapper>
  )
}
