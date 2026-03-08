import { motion } from 'framer-motion'
import { ClaudeAuthType } from '../../types'

interface Props {
  hasCredential: boolean
  onNewSession: () => void
  onOpenSettings: (authType: ClaudeAuthType) => void
}

const cardStyle: React.CSSProperties = {
  flex: '1 1 260px',
  minWidth: '240px',
  maxWidth: '320px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: '18px',
  padding: '22px',
  background: 'linear-gradient(180deg, rgba(201,151,74,0.08), rgba(255,255,255,0.02))',
  border: '1px solid rgba(201,151,74,0.18)',
  borderRadius: '10px',
  textAlign: 'left',
}

const openSettingsBtnStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '9px 14px',
  background: 'var(--color-accent)',
  color: '#0f0e0d',
  border: 'none',
  borderRadius: '6px',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

export function EmptyState({ hasCredential, onNewSession, onOpenSettings }: Props) {
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
        padding: '40px',
        width: '100%',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '840px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        textAlign: 'center',
      }}>

        {hasCredential ? (
          <>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '1rem',
              color: 'var(--color-text-muted)',
              maxWidth: '320px',
              lineHeight: 1.6,
            }}>
              Paste your text. We&apos;ll make it sound human.
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
          </>
        ) : (
          <>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '1.05rem',
              color: 'var(--color-text)',
              maxWidth: '420px',
              lineHeight: 1.6,
            }}>
              Connect Claude to get started
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px',
              width: '100%',
              maxWidth: '760px',
              margin: '0 auto',
            }}>
              <div style={cardStyle}>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>
                    Claude Subscription
                  </div>
                  <p style={{ margin: '10px 0 0', color: 'var(--color-text-muted)', lineHeight: 1.65, fontSize: '13px' }}>
                    Use your Pro or Max subscription. Run `claude setup-token` to get your token.
                  </p>
                </div>
                <button style={openSettingsBtnStyle} onClick={() => onOpenSettings('oauth')}>
                  Open Settings
                </button>
              </div>

              <div style={cardStyle}>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>
                    API Key
                  </div>
                  <p style={{ margin: '10px 0 0', color: 'var(--color-text-muted)', lineHeight: 1.65, fontSize: '13px' }}>
                    Pay-per-use via console.anthropic.com.
                  </p>
                </div>
                <button style={openSettingsBtnStyle} onClick={() => onOpenSettings('apikey')}>
                  Open Settings
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
