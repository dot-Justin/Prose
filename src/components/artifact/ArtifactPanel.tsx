import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Session } from '../../types'
import { RevisionViewer } from './RevisionViewer'

interface Props {
  session: Session | null
  open: boolean
  onToggle: () => void
  selectedRevision: number
  onSelectRevision: (idx: number) => void
  highlightChanges: boolean
  onToggleHighlight: () => void
}

export function ArtifactPanel({
  session,
  open,
  onToggle,
  selectedRevision,
  onSelectRevision,
  highlightChanges,
  onToggleHighlight,
}: Props) {
  const [copied, setCopied] = useState(false)

  const revisions = session?.revisions ?? []
  const clampedIdx = Math.min(selectedRevision, revisions.length - 1)
  const revision = revisions[clampedIdx]

  function handleCopy() {
    if (!revision) return
    navigator.clipboard.writeText(revision.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
      {/* Toggle tab on the left edge */}
      <button
        onClick={onToggle}
        title={open ? 'Close revisions' : 'Open revisions'}
        style={{
          position: 'absolute',
          left: open ? '-20px' : '-20px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRight: 'none',
          borderRadius: '6px 0 0 6px',
          padding: '10px 4px',
          cursor: 'pointer',
          color: 'var(--color-text-subtle)',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-subtle)')}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          {open ? (
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="artifact"
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{
              width: 'var(--artifact-width)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-surface)',
              borderLeft: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 16px 12px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--font-mono)',
                }}>
                  Revisions
                </span>

                {/* Highlight toggle */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: 'var(--color-text-subtle)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  <input
                    type="checkbox"
                    checked={highlightChanges}
                    onChange={onToggleHighlight}
                    style={{ accentColor: 'var(--color-accent)', width: '12px', height: '12px' }}
                  />
                  Highlight changes
                </label>
              </div>

              {/* Revision select */}
              {session && revisions.length > 0 && (
                <select
                  value={clampedIdx}
                  onChange={e => onSelectRevision(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '5px',
                    padding: '6px 10px',
                    color: 'var(--color-text)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {revisions.map((rev, i) => (
                    <option key={i} value={i} style={{ background: 'var(--color-surface-2)' }}>
                      {rev.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Text content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
            }}>
              {revision ? (
                <RevisionViewer revision={revision} highlightChanges={highlightChanges} />
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
                  No revision selected.
                </p>
              )}
            </div>

            {/* Footer actions */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              gap: '8px',
              flexShrink: 0,
            }}>
              <button
                onClick={handleCopy}
                disabled={!revision}
                style={{
                  padding: '7px 14px',
                  background: copied ? 'var(--color-green-dim)' : 'var(--color-surface-2)',
                  border: `1px solid ${copied ? 'rgba(76,175,125,0.3)' : 'var(--color-border)'}`,
                  borderRadius: '5px',
                  color: copied ? 'var(--color-green)' : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  cursor: revision ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
