import { useState, useEffect, useCallback } from 'react'
import { Dialog, Portal, CloseButton } from '@chakra-ui/react'
import { ClaudeAuthType, SettingsSummary } from '../../types'

type Settings = SettingsSummary

const ALL_DETECTORS = [
  { name: 'NoteGPT',     type: 'Direct HTTP', notes: 'Open API, per-sentence flagging' },
  { name: 'youscan',     type: 'Direct HTTP', notes: 'Open API, humanization suggestions' },
  { name: 'AIDetector',  type: 'Direct HTTP', notes: '100 req/day limit, Grok-4-fast powered' },
  { name: 'decopy.ai',   type: 'Direct HTTP', notes: 'Async job API, up to 30s' },
  { name: 'aiscan24',    type: 'Direct HTTP', notes: 'Requires 80+ words' },
] as const

interface Props {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  preferredAuthType?: ClaudeAuthType | null
}

function getAuthCopy(authType: ClaudeAuthType) {
  if (authType === 'oauth') {
    return {
      label: 'OAuth token',
      placeholder: 'sk-ant-oat01-…',
      helper: 'Run `claude setup-token` in terminal. Valid for 1 year. Requires Claude Pro or Max.',
      savedLabel: 'Token saved — enter new to replace',
      success: 'Connected (OAuth)',
      failure: 'Invalid token — run `claude setup-token` again',
    }
  }
  return {
    label: 'API key',
    placeholder: 'sk-ant-api03-…',
    helper: 'Get your key at console.anthropic.com',
    savedLabel: 'Key saved — enter new to replace',
    success: 'Connected (API key)',
    failure: 'Invalid API key',
  }
}

export function SettingsModal({ open, onClose, onSaved, preferredAuthType }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'auth' | 'detectors' | 'defaults'>('auth')
  const [authType, setAuthType] = useState<ClaudeAuthType>('oauth')
  const [credentialInput, setCredentialInput] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [aidetectorQuota, setAidetectorQuota] = useState<{ remaining: number; allowed: number } | null>(null)

  const authCopy = getAuthCopy(authType)

  const resetTest = useCallback(() => { setTestStatus('idle'); setTestMessage('') }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json() as Settings
      setSettings(data)
      setAuthType(preferredAuthType ?? data.claudeAuthType)
      setCredentialInput('')
      resetTest()
      fetch('/api/settings/aidetector-quota')
        .then(r => r.ok ? r.json() : null)
        .then(d => setAidetectorQuota(d))
        .catch(() => setAidetectorQuota(null))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings')
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [preferredAuthType, resetTest])

  useEffect(() => {
    if (open) { setActiveTab('auth'); loadData() }
  }, [open, loadData])

  function toggleDetector(name: string, enabled: boolean) {
    setSettings(s => s ? {
      ...s,
      enabledDetectors: enabled
        ? [...s.enabledDetectors, name]
        : s.enabledDetectors.filter(d => d !== name),
    } : s)
  }

  function updateDefault(key: 'maxRevisions' | 'targetDetectionPct', fallback: number, min: number, max: number, raw: string) {
    const v = Number.parseInt(raw, 10)
    const clamped = Number.isNaN(v) ? fallback : Math.min(max, Math.max(min, v))
    setSettings(s => s ? { ...s, defaults: { ...s.defaults, [key]: clamped } } : s)
  }

  async function persistSettings(): Promise<boolean> {
    if (!settings) return false
    const cred = credentialInput.trim()
    if (settings.claudeCredential && authType !== settings.claudeAuthType && !cred) {
      setTestStatus('error')
      setTestMessage(`Enter a new ${authType === 'oauth' ? 'token' : 'API key'} to switch auth type`)
      return false
    }
    const payload: Partial<Settings> & { claudeCredential?: string } = {
      claudeAuthType: authType,
      enabledDetectors: settings.enabledDetectors,
      defaults: settings.defaults,
    }
    if (cred) payload.claudeCredential = cred
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to save settings')
    const refreshed = await fetch('/api/settings').then(r => r.json()) as Settings
    setSettings(refreshed)
    setAuthType(refreshed.claudeAuthType)
    setCredentialInput('')
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
        setTestMessage(body.authType === 'oauth' ? 'Connected (OAuth)' : 'Connected (API key)')
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
      if (saved) onClose()
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
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
            width: '540px',
            maxWidth: 'calc(100vw - 32px)',
          }}>

            {/* Header */}
            <Dialog.Header style={{ padding: '20px 24px 0', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
              <Dialog.Title style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                Settings
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" style={{ position: 'absolute', top: '16px', right: '20px', color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }} />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 24px', flexShrink: 0 }}>
              {(['auth', 'detectors', 'defaults'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                    color: activeTab === tab ? 'var(--color-text)' : 'var(--color-text-subtle)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '12px',
                    fontWeight: activeTab === tab ? 600 : 400,
                    cursor: 'pointer',
                    padding: '10px 14px 9px',
                    marginBottom: '-1px',
                    transition: 'color 0.12s',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Body */}
            <Dialog.Body style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  Loading settings…
                </div>
              ) : loadError ? (
                <div style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-red)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                    {loadError}
                  </div>
                  <button onClick={() => void loadData()} style={btnOutline}>Retry</button>
                </div>
              ) : settings && activeTab === 'auth' ? (
                <AuthTab
                  settings={settings}
                  authType={authType}
                  setAuthType={(t) => { setAuthType(t); resetTest() }}
                  credentialInput={credentialInput}
                  setCredentialInput={(v) => { setCredentialInput(v); resetTest() }}
                  testStatus={testStatus}
                  testMessage={testMessage}
                  onTest={testConnection}
                  authCopy={authCopy}
                />
              ) : settings && activeTab === 'detectors' ? (
                <DetectorsTab
                  settings={settings}
                  aidetectorQuota={aidetectorQuota}
                  toggleDetector={toggleDetector}
                />
              ) : settings && activeTab === 'defaults' ? (
                <DefaultsTab
                  settings={settings}
                  updateDefault={updateDefault}
                />
              ) : null}
            </Dialog.Body>

            {/* Footer */}
            <Dialog.Footer style={{ padding: '14px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
              <button onClick={onClose} style={btnOutline}>Cancel</button>
              <button
                onClick={save}
                disabled={saving || loading || !settings}
                style={{ ...btnPrimary, opacity: (saving || loading || !settings) ? 0.6 : 1 }}
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

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

function AuthTab({ settings, authType, setAuthType, credentialInput, setCredentialInput, testStatus, testMessage, onTest, authCopy }: {
  settings: Settings
  authType: ClaudeAuthType
  setAuthType: (t: ClaudeAuthType) => void
  credentialInput: string
  setCredentialInput: (v: string) => void
  testStatus: 'idle' | 'testing' | 'ok' | 'error'
  testMessage: string
  onTest: () => void
  authCopy: ReturnType<typeof getAuthCopy>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={sectionLabel}>Authentication method</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
          {(['oauth', 'apikey'] as const).map(type => {
            const selected = authType === type
            return (
              <button
                key={type}
                onClick={() => setAuthType(type)}
                style={{
                  background: selected ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
                  border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: '8px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '3px' }}>
                  {type === 'oauth' ? 'Claude Subscription' : 'API Key'}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: 1.4 }}>
                  {type === 'oauth' ? 'Pro or Max via `claude setup-token`' : 'Pay-per-use via console.anthropic.com'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label style={sectionLabel}>{authCopy.label}</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <input
            type="password"
            value={credentialInput}
            onChange={e => setCredentialInput(e.target.value)}
            placeholder={settings.claudeCredential ? authCopy.savedLabel : authCopy.placeholder}
            style={{ ...fieldBase, flex: 1, padding: '8px 12px' }}
          />
          <button
            onClick={onTest}
            disabled={testStatus === 'testing'}
            style={{ ...btnOutline, minWidth: '120px', opacity: testStatus === 'testing' ? 0.6 : 1 }}
          >
            {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '5px', lineHeight: 1.4 }}>
          {authCopy.helper}
        </p>
      </div>

      {testStatus !== 'idle' && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          border: `1px solid ${testStatus === 'ok' ? 'rgba(76,175,125,0.4)' : testStatus === 'error' ? 'rgba(201,90,74,0.4)' : 'var(--color-border)'}`,
          background: testStatus === 'ok' ? 'rgba(76,175,125,0.08)' : testStatus === 'error' ? 'rgba(201,90,74,0.08)' : 'var(--color-surface-2)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: testStatus === 'ok' ? 'var(--color-green)' : testStatus === 'error' ? 'var(--color-red)' : 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}>
          {testStatus === 'testing' ? 'Testing Claude connection…' : testMessage || (testStatus === 'ok' ? authCopy.success : authCopy.failure)}
        </div>
      )}
    </div>
  )
}

function DetectorsTab({ settings, aidetectorQuota, toggleDetector }: {
  settings: Settings
  aidetectorQuota: { remaining: number; allowed: number } | null
  toggleDetector: (name: string, enabled: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={sectionLabel}>Enabled detectors</div>
        {aidetectorQuota && (
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: aidetectorQuota.remaining < 10 ? 'var(--color-yellow)' : 'var(--color-text-subtle)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            padding: '2px 7px',
          }}>
            AIDetector: {aidetectorQuota.remaining}/{aidetectorQuota.allowed} today
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {ALL_DETECTORS.map(det => {
          const enabled = settings.enabledDetectors.includes(det.name)
          return (
            <label key={det.name} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '11px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: enabled ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
              border: `1px solid ${enabled ? 'rgba(201,151,74,0.3)' : 'var(--color-border)'}`,
              transition: 'background 0.12s, border-color 0.12s',
            }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => toggleDetector(det.name, e.target.checked)}
                style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px', marginTop: '1px', flexShrink: 0, cursor: 'pointer' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                    {det.name}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-accent)',
                    background: 'var(--color-accent-dim)',
                    border: '1px solid rgba(201,151,74,0.2)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}>
                    {det.type}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: 1.4 }}>
                  {det.notes}
                </span>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function DefaultsTab({ settings, updateDefault }: {
  settings: Settings
  updateDefault: (key: 'maxRevisions' | 'targetDetectionPct', fallback: number, min: number, max: number, raw: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={sectionLabel}>Max revisions</label>
          <input
            type="number"
            min={1}
            max={20}
            value={settings.defaults.maxRevisions}
            onChange={e => updateDefault('maxRevisions', 10, 1, 20, e.target.value)}
            style={{ ...fieldBase, padding: '8px 12px', marginTop: '6px', width: '100%' }}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
            Rewrite passes before stopping
          </p>
        </div>
        <div>
          <label style={sectionLabel}>Target detection %</label>
          <input
            type="number"
            min={5}
            max={75}
            value={settings.defaults.targetDetectionPct}
            onChange={e => updateDefault('targetDetectionPct', 25, 5, 75, e.target.value)}
            style={{ ...fieldBase, padding: '8px 12px', marginTop: '6px', width: '100%' }}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
            Stop when aggregate drops below this
          </p>
        </div>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
        These prefill new sessions. You can override them per session.
      </p>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-text-subtle)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  fontFamily: 'var(--font-mono)',
  display: 'block',
}

const fieldBase: React.CSSProperties = {
  display: 'block',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  outline: 'none',
}

const btnOutline: React.CSSProperties = {
  padding: '7px 14px',
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'border-color 0.12s',
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 20px',
  background: 'var(--color-accent)',
  border: 'none',
  borderRadius: '6px',
  color: '#0f0e0d',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.12s',
}
