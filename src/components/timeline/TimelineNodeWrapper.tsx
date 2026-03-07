import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  isPulsing?: boolean
  index?: number
}

export function TimelineNodeWrapper({ children, isPulsing = false, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.04 }}
      style={{ position: 'relative', paddingLeft: '36px', marginBottom: '2px' }}
    >
      {/* Dot on the vertical line */}
      {isPulsing ? (
        <motion.div
          animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: '-5px',
            top: '16px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'var(--color-accent)',
            boxShadow: '0 0 8px var(--color-accent)',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          left: '-5px',
          top: '16px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--color-surface)',
          border: '2px solid var(--color-border)',
        }} />
      )}
      {children}
    </motion.div>
  )
}
