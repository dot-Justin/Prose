import { motion } from 'framer-motion'

interface Props {
  onNewSession: () => void
}

export function EmptyState({ onNewSession }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '16px',
        padding: '40px',
        textAlign: 'center',
      }}
    >
      <h1 style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 'clamp(3rem, 8vw, 5rem)',
        fontWeight: 700,
        color: 'var(--color-text)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        Prose
      </h1>
      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '1rem',
        color: 'var(--color-text-muted)',
        maxWidth: '320px',
        lineHeight: 1.6,
      }}>
        Paste your text. We'll make it sound human.
      </p>
      <button
        onClick={onNewSession}
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          background: 'var(--color-accent)',
          color: '#0f0e0d',
          border: 'none',
          borderRadius: '6px',
          fontFamily: 'var(--font-ui)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent)')}
      >
        New Session
      </button>
    </motion.div>
  )
}
