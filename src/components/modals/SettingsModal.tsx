import { useState, useEffect } from 'react'
import { Dialog, Portal, CloseButton } from '@chakra-ui/react'

interface Settings {
  claudeApiKey: string
  enabledDetectors: string[]
  defaults: { maxRevisions: number; targetDetectionPct: number }
}

const ALL_DETECTORS = [
  { name: 'NoteGPT', type: 'Direct HTTP', notes: 'Open API, per-sentence flagging' },
  { name: 'youscan', type: 'Direct HTTP', notes: 'Open API, humanization suggestions' },
  { name: 'AIDetector', type: 'Direct HTTP', notes: '100 req/day limit, Grok-4-fast powered' },
  { name: 'decopy.ai', type: 'Direct HTTP', notes: 'Async job API, up to 30s' },
  { name: 'aiscan24', type: 'Direct HTTP', notes: 'Requires 80+ words' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [saving, setSaving] = useState(false)
  const [aidetectorQuota, setAidetectorQuota] = useState<{ remaining: number; allowed: number } | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Settings) => {
        setSettings(s)
        setApiKeyInput(s.claudeApiKey.includes('•') ? '' : s.claudeApiKey)
      })
      .catch(console.error)

    fetch('/api/settings/aidetector-quota')
      .then(r => r.json())
      .then(setAidetectorQuota)
      .catch(() => {})
  }, [open])

  async function testKey() {
    if (!apiKeyInput.trim()) return
    setTestStatus('testing')
    setTestError('')
    try {
      const res = await fetch('/api/settings/test-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      })
      if (res.ok) {
        setTestStatus('ok')
      } else {
        const err = await res.json() as { error: string }
        setTestStatus('error')
        setTestError(err.error ?? 'Invalid key')
      }
    } catch {
      setTestStatus('error')
      setTestError('Network error')
    }
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const payload: Partial<Settings> & { claudeApiKey?: string } = {
        enabledDetectors: settings.enabledDetectors,
        defaults: settings.defaults,
      }
      if (apiKeyInput.trim()) payload.claudeApiKey = apiKeyInput.trim()

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function toggleDetector(name: string) {
    if (!settings) return
    const enabled = settings.enabledDetectors
    const next = enabled.includes(name)
      ? enabled.filter(d => d !== name)
      : [...enabled, name]
    setSettings({ ...settings, enabledDetectors: next })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) onClose() }} placement="center" size="lg">
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
            minWidth: '480px',
          }}>
            <Dialog.Header style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}>
              <Dialog.Title style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                Settings
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" style={{ position: 'absolute', top: '16px', right: '20px', color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }} />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Claude API */}
              <section>
                <div style={sectionLabel}>Claude API</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => { setApiKeyInput(e.target.value); setTestStatus('idle') }}
                    placeholder={settings?.claudeApiKey.includes('•') ? 'Key saved — enter new to replace' : 'sk-ant-…'}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={testKey}
                    disabled={!apiKeyInput.trim() || testStatus === 'testing'}
                    style={{ ...btnStyle, opacity: apiKeyInput.trim() ? 1 : 0.5 }}
                  >
                    {testStatus === 'testing' ? '…' : testStatus === 'ok' ? '✓ Valid' : 'Test'}
                  </button>
                </div>
                {testStatus === 'ok' && (
                  <p style={{ fontSize: '11px', color: 'var(--color-green)', marginTop: '4px' }}>Key is valid</p>
                )}
                {testStatus === 'error' && (
                  <p style={{ fontSize: '11px', color: 'var(--color-red)', marginTop: '4px' }}>{testError}</p>
                )}
              </section>

              {/* Detectors */}
              <section>
                <div style={sectionLabel}>Detectors</div>
                {aidetectorQuota && (
                  <p style={{ fontSize: '11px', color: aidetectorQuota.remaining < 10 ? 'var(--color-yellow)' : 'var(--color-text-subtle)', marginBottom: '8px' }}>
                    AIDetector quota: {aidetectorQuota.remaining}/{aidetectorQuota.allowed} remaining today
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' }}>
                  {ALL_DETECTORS.map(det => {
                    const enabled = settings?.enabledDetectors.includes(det.name) ?? false
                    return (
                      <label key={det.name} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: enabled ? 'var(--color-surface-2)' : 'transparent',
                        transition: 'background 0.12s',
                      }}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleDetector(det.name)}
                          style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-text)' }}>
                              {det.name}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--color-accent)',
                              background: 'var(--color-accent-dim)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}>
                              {det.type}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '1px' }}>
                            {det.notes}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </section>

              {/* Defaults */}
              <section>
                <div style={sectionLabel}>Defaults</div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  <label style={defaultFieldStyle}>
                    <span style={sublabel}>Max revisions</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings?.defaults.maxRevisions ?? 10}
                      onChange={e => settings && setSettings({ ...settings, defaults: { ...settings.defaults, maxRevisions: parseInt(e.target.value) || 10 } })}
                      style={{ ...inputStyle, width: '70px' }}
                    />
                  </label>
                  <label style={defaultFieldStyle}>
                    <span style={sublabel}>Target detection %</span>
                    <input
                      type="number"
                      min={5}
                      max={75}
                      value={settings?.defaults.targetDetectionPct ?? 25}
                      onChange={e => settings && setSettings({ ...settings, defaults: { ...settings.defaults, targetDetectionPct: parseInt(e.target.value) || 25 } })}
                      style={{ ...inputStyle, width: '70px' }}
                    />
                  </label>
                </div>
              </section>
            </Dialog.Body>

            <Dialog.Footer style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                style={{ ...saveBtnStyle, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-text-subtle)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  fontFamily: 'var(--font-mono)',
}

const sublabel: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-text-subtle)',
  fontFamily: 'var(--font-mono)',
  display: 'block',
  marginBottom: '4px',
}

const defaultFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  padding: '7px 10px',
  outline: 'none',
}

const btnStyle: React.CSSProperties = {
  padding: '7px 14px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-ui)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
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
}

const saveBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: 'var(--color-accent)',
  border: 'none',
  borderRadius: '6px',
  color: '#0f0e0d',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}
