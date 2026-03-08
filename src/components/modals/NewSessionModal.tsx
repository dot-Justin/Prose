import { useState } from 'react'
import {
  Dialog,
  Portal,
  NumberInput,
  NativeSelect,
} from '@chakra-ui/react'
import { CaretDown, CaretUp, X, ArrowRight } from '@phosphor-icons/react'
import { NewSessionFormData } from '../../types'

const STYLE_PRESETS = [
  'Academic Writing',
  'Blog Post — First Person',
  'Professional Email',
  'Twitter / X Thread',
  'Technical Documentation',
  'Casual / Conversational',
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewSessionFormData) => void
  initialText?: string
}

export function NewSessionModal({ open, onClose, onSubmit, initialText = '' }: Props) {
  const [inputText, setInputText] = useState(initialText)
  const [style, setStyle] = useState('')
  const [requirements, setRequirements] = useState('')
  const [maxRevisions, setMaxRevisions] = useState('10')
  const [targetPct, setTargetPct] = useState('25')

  function handleSubmit() {
    if (!inputText.trim()) return
    onSubmit({
      inputText: inputText.trim(),
      style,
      requirements,
      maxRevisions: parseInt(maxRevisions) || 10,
      targetDetectionPct: parseInt(targetPct) || 25,
    })
    // Reset
    setInputText('')
    setStyle('')
    setRequirements('')
    setMaxRevisions('10')
    setTargetPct('25')
    onClose()
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => { if (!e.open) onClose() }}
      placement="center"
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)' }} />
        <Dialog.Positioner>
          <Dialog.Content style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Dialog.Header style={{
              padding: '20px 24px 0',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '16px',
              flexShrink: 0,
            }}>
              <Dialog.Title style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: '-0.01em',
              }}>
                New Session
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <button type="button" aria-label="Close new session" style={iconCloseBtnStyle}>
                  <X size={16} />
                </button>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body style={{
              padding: '20px 24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}>
              {/* 1. Input text */}
              <Field
                label="Your text"
                required
                helper="Recommended: 2–10 paragraphs. No strict minimum."
              >
                <textarea
                  rows={8}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Paste the text you want to humanize..."
                  style={textareaStyle}
                />
              </Field>

              {/* 2. Style / purpose */}
              <Field label="Style & purpose">
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={style}
                    onChange={e => setStyle(e.currentTarget.value)}
                    style={selectStyle}
                  >
                    <option value="">Select or describe your own…</option>
                    {STYLE_PRESETS.map(s => (
                      <option key={s} value={s} style={{ background: 'var(--color-surface)' }}>{s}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator style={{ color: 'var(--color-text-subtle)' }}>
                    <CaretDown size={14} />
                  </NativeSelect.Indicator>
                </NativeSelect.Root>
              </Field>

              {/* 3. Requirements */}
              <Field
                label="Requirements"
                helper="Paste assignment instructions, style guides, or specific constraints here."
              >
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  placeholder="e.g. no em dashes, maintain formal tone, avoid passive voice…"
                  style={textareaStyle}
                />
              </Field>

              {/* 4. Session settings */}
              <div>
                <div style={labelStyle}>Session settings</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={sublabelStyle}>Max revisions</div>
                    <NumberInput.Root
                      min={1}
                      max={20}
                      value={maxRevisions}
                      onValueChange={e => setMaxRevisions(e.value)}
                      style={{ marginTop: '4px' }}
                    >
                      <NumberInput.Input style={inputStyle} />
                      <NumberInput.Control>
                        <NumberInput.IncrementTrigger style={stepBtnStyle}>
                          <CaretUp size={10} />
                        </NumberInput.IncrementTrigger>
                        <NumberInput.DecrementTrigger style={stepBtnStyle}>
                          <CaretDown size={10} />
                        </NumberInput.DecrementTrigger>
                      </NumberInput.Control>
                    </NumberInput.Root>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={sublabelStyle}>Target detection %</div>
                    <NumberInput.Root
                      min={5}
                      max={75}
                      value={targetPct}
                      onValueChange={e => setTargetPct(e.value)}
                      style={{ marginTop: '4px' }}
                    >
                      <NumberInput.Input style={inputStyle} />
                      <NumberInput.Control>
                        <NumberInput.IncrementTrigger style={stepBtnStyle}>
                          <CaretUp size={10} />
                        </NumberInput.IncrementTrigger>
                        <NumberInput.DecrementTrigger style={stepBtnStyle}>
                          <CaretDown size={10} />
                        </NumberInput.DecrementTrigger>
                      </NumberInput.Control>
                    </NumberInput.Root>
                  </div>
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                  You can request more revisions mid-session at any time.
                </div>
              </div>
            </Dialog.Body>

            <Dialog.Footer style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0,
            }}>
              <button onClick={onClose} style={cancelBtnStyle}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!inputText.trim()}
                style={{
                  ...submitBtnStyle,
                  opacity: inputText.trim() ? 1 : 0.5,
                  cursor: inputText.trim() ? 'pointer' : 'default',
                }}
                onMouseEnter={e => {
                  if (inputText.trim()) e.currentTarget.style.background = 'var(--color-accent-hover)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--color-accent)'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>Start Session</span>
                  <ArrowRight size={14} />
                </span>
              </button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// Sub-components
function Field({ label, required, helper, children }: {
  label: string
  required?: boolean
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: 'var(--color-accent)', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {helper && <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: 1.4 }}>{helper}</p>}
    </div>
  )
}

// Shared styles
const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: 'var(--font-mono)',
}

const sublabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-text-subtle)',
  fontFamily: 'var(--font-mono)',
}

const fieldBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  lineHeight: 1.6,
  outline: 'none',
  resize: 'vertical',
}

const textareaStyle: React.CSSProperties = {
  ...fieldBase,
  padding: '10px 12px',
}

const selectStyle: React.CSSProperties = {
  ...fieldBase,
  padding: '8px 12px',
  resize: undefined,
  cursor: 'pointer',
  appearance: 'none',
}

const inputStyle: React.CSSProperties = {
  ...fieldBase,
  padding: '8px 12px',
  resize: undefined,
}

const stepBtnStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: 'none',
  color: 'var(--color-text-subtle)',
  cursor: 'pointer',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const iconCloseBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '20px',
  color: 'var(--color-text-subtle)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'border-color 0.12s, color 0.12s',
}

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: 'var(--color-accent)',
  border: 'none',
  borderRadius: '6px',
  color: '#0f0e0d',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'background 0.12s',
}
