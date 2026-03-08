import { useState, useEffect, useCallback } from 'react'
import { Dialog, Portal } from '@chakra-ui/react'
import { CheckCircle, X, XCircle } from '@phosphor-icons/react'
import { ClaudeAuthType, SettingsSummary } from '../../types'

interface Settings extends SettingsSummary {}

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
  onSaved?: () => void
  preferredAuthType?: ClaudeAuthType | null
}

function getAuthCopy(authType: ClaudeAuthType) {
  if (authType === 'oauth') {
    return {
      label: 'OAuth Token',
      placeholder: 'sk-ant-oat01-...',
      helper: 'Run `claude setup-token` in your terminal to generate this. Valid for 1 year. Requires Claude Pro or Max subscription.',
      savedLabel: 'Token saved - enter new to replace',
      success: 'Connected (OAuth)',
      failure: 'Invalid token - run `claude setup-token` again',
    }
  }

  return {
    label: 'API Key',
    placeholder: 'sk-ant-api03-...',
    helper: 'Get your key at console.anthropic.com',
    savedLabel: 'Key saved - enter new to replace',
    success: 'Connected (API Key)',
    failure: 'Invalid API key',
  }
}

export function SettingsModal({ open, onClose, onSaved, preferredAuthType }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [authType, setAuthType] = useState<ClaudeAuthType>('oauth')
  const [credentialInput, setCredentialInput] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [aidetectorQuota, setAidetectorQuota] = useState<{ remaining: number; allowed: number } | null>(null)

  const authCopy = getAuthCopy(authType)

  const loadData = useCallback(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Settings) => {
        setSettings(s)
        setAuthType(preferredAuthType ?? s.claudeAuthType)
        setCredentialInput('')
        setTestStatus('idle')
        setTestMessage('')
      })
      .catch(console.error)

    fetch('/api/settings/aidetector-quota')
      .then(r => r.json())
      .then(setAidetectorQuota)
      .catch(() => {})
  }, [preferredAuthType])

  useEffect(() => {
    if (!open) return
    loadData()
  }, [open, loadData])

  function toggleDetector(name: string) {
    if (!settings) return
    const enabled = settings.enabledDetectors
    const next = enabled.includes(name)
      ? enabled.filter(d => d !== name)
      : [...enabled, name]
    setSettings({ ...settings, enabledDetectors: next })
  }

  async function persistSettings(): Promise<boolean> {
    if (!settings) return false

    const trimmedCredential = credentialInput.trim()

    if (settings.claudeCredential && authType !== settings.claudeAuthType && !trimmedCredential) {
      setTestStatus('error')
      setTestMessage(`Enter a new ${authType === 'oauth' ? 'token' : 'API key'} to switch auth type`)
      return false
    }

    const payload: Partial<Settings> = {
      claudeAuthType: authType,
      enabledDetectors: settings.enabledDetectors,
      defaults: settings.defaults,
    }

    if (trimmedCredential) payload.claudeCredential = trimmedCredential

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error('Failed to save settings')
    }

    await new Promise<void>((resolve) => {
      fetch('/api/settings')
        .then(r => r.json())
        .then((next: Settings) => {
          setSettings(next)
          setAuthType(next.claudeAuthType)
          setCredentialInput('')
          resolve()
        })
        .catch((err) => {
          console.error(err)
          resolve()
        })
    })

    onSaved?.()
    return true
  }

  async function testConnection() {
    if (!settings) return

    setTestStatus('testing')
    setTestMessage('')

    try {
      const saved = await persistSettings()
      if (!saved) return

      const res = await fetch('/api/settings/test-auth', { method: 'POST' })
      const body = await res.json() as { success: boolean; authType?: ClaudeAuthType; error?: string }

      if (res.ok && body.success) {
        setTestStatus('ok')
        setTestMessage(body.authType === 'oauth' ? 'Connected (OAuth)' : 'Connected (API Key)')
      } else {
        setTestStatus('error')
        setTestMessage(body.error ?? authCopy.failure)
      }
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Network error')
    }
  }

  async function save() {
    if (!settings) return
    setSaving(true)

    try {
      const saved = await persistSettings()
      if (!saved) return
      onClose()
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
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
                <button type="button" aria-label="Close settings" style={iconCloseBtnStyle}>
                  <X size={16} />
                </button>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section>
                <div style={sectionLabel}>Claude Authentication</div>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={radioRowStyle}>
                    <input
                      type="radio"
                      name="claude-auth-type"
                      checked={authType === 'oauth'}
                      onChange={() => { setAuthType('oauth'); setTestStatus('idle'); setTestMessage('') }}
                    />
                    <div>
                      <div style={radioTitleStyle}>Claude Subscription</div>
                      <div style={radioSubtitleStyle}>Pro / Max</div>
                    </div>
                  </label>
                  <label style={radioRowStyle}>
                    <input
                      type="radio"
                      name="claude-auth-type"
                      checked={authType === 'apikey'}
                      onChange={() => { setAuthType('apikey'); setTestStatus('idle'); setTestMessage('') }}
                    />
                    <div>
                      <div style={radioTitleStyle}>API Key</div>
                      <div style={radioSubtitleStyle}>pay-per-use</div>
                    </div>
                  </label>
                </div>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  <span style={sublabel}>{authCopy.label}</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="password"
                      value={credentialInput}
                      onChange={e => { setCredentialInput(e.target.value); setTestStatus('idle'); setTestMessage('') }}
                      placeholder={settings?.claudeCredential ? authCopy.savedLabel : authCopy.placeholder}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={testConnection}
                      disabled={testStatus === 'testing' || saving}
                      style={{ ...btnStyle, opacity: testStatus === 'testing' || saving ? 0.6 : 1 }}
                    >
                      {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </label>

                <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px', lineHeight: 1.6 }}>
                  {authCopy.helper}
                </p>

                {testStatus !== 'idle' && (
                  <p style={{
                    fontSize: '11px',
                    color: testStatus === 'ok' ? 'var(--color-green)' : testStatus === 'error' ? 'var(--color-yellow)' : 'var(--color-text-subtle)',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    {testStatus === 'ok' && <CheckCircle size={14} color="var(--color-green)" />}
                    {testStatus === 'error' && <XCircle size={14} color="var(--color-yellow)" />}
                    <span>{testStatus === 'ok' ? testMessage || authCopy.success : testStatus === 'error' ? testMessage || authCopy.failure : 'Testing Claude connection...'}</span>
                  </p>
                )}
              </section>

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
                {saving ? 'Saving...' : 'Save'}
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

const radioRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 0',
  color: 'var(--color-text)',
}

const radioTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
}

const radioSubtitleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-text-subtle)',
}
