import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

export type ClaudeAuthType = 'oauth' | 'apikey'

// Ensure directories exist
fs.mkdirSync(SESSIONS_DIR, { recursive: true })

export interface Settings {
  claudeAuthType: ClaudeAuthType
  claudeCredential: string
  enabledDetectors: string[]
  defaults: {
    maxRevisions: number
    targetDetectionPct: number
  }
}

interface LegacySettings {
  claudeApiKey?: string
  claudeAuthType?: ClaudeAuthType
  claudeCredential?: string
  enabledDetectors?: unknown
  defaults?: {
    maxRevisions?: unknown
    targetDetectionPct?: unknown
  }
}

const DEFAULT_SETTINGS: Settings = {
  claudeAuthType: 'oauth',
  claudeCredential: '',
  enabledDetectors: ['NoteGPT', 'youscan', 'AIDetector', 'decopy.ai', 'aiscan24'],
  defaults: { maxRevisions: 10, targetDetectionPct: 25 },
}

export interface StoredRevision {
  label: string
  text: string
  changedSentences: string[]
}

export interface StoredSession {
  id: string
  title: string
  createdAt: string
  status: 'in-progress' | 'complete-pass' | 'complete-fail'
  overallScore: number
  inputText: string
  style: string
  requirements: string
  maxRevisions: number
  targetDetectionPct: number
  nodes: object[]
  revisions: StoredRevision[]
}

function normalizeSettings(input: LegacySettings): Settings {
  const maxRevisions = typeof input.defaults?.maxRevisions === 'number'
    ? input.defaults.maxRevisions
    : DEFAULT_SETTINGS.defaults.maxRevisions
  const targetDetectionPct = typeof input.defaults?.targetDetectionPct === 'number'
    ? input.defaults.targetDetectionPct
    : DEFAULT_SETTINGS.defaults.targetDetectionPct

  return {
    claudeAuthType: input.claudeAuthType === 'apikey' ? 'apikey' : 'oauth',
    claudeCredential: typeof input.claudeCredential === 'string' ? input.claudeCredential : '',
    enabledDetectors: Array.isArray(input.enabledDetectors)
      ? input.enabledDetectors.filter((value): value is string => typeof value === 'string')
      : [...DEFAULT_SETTINGS.enabledDetectors],
    defaults: {
      maxRevisions,
      targetDetectionPct,
    },
  }
}

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as LegacySettings
    const migrated = 'claudeApiKey' in parsed
      ? normalizeSettings({
          ...parsed,
          claudeAuthType: parsed.claudeApiKey ? 'apikey' : parsed.claudeAuthType,
          claudeCredential: typeof parsed.claudeApiKey === 'string' ? parsed.claudeApiKey : parsed.claudeCredential,
        })
      : normalizeSettings(parsed)

    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      saveSettings(migrated)
    }

    return migrated
  } catch {
    saveSettings(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

export function saveSession(session: StoredSession): void {
  const file = path.join(SESSIONS_DIR, `${session.id}.json`)
  fs.writeFileSync(file, JSON.stringify(session, null, 2))
}

export function loadSession(id: string): StoredSession | null {
  const file = path.join(SESSIONS_DIR, `${id}.json`)
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

export function listSessions(): StoredSession[] {
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))
    return files
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8')) as StoredSession
        } catch {
          return null
        }
      })
      .filter((s): s is StoredSession => s !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

export function markInterruptedSessions(): void {
  const sessions = listSessions()
  for (const s of sessions) {
    if (s.status === 'in-progress') {
      s.status = 'complete-fail'
      s.nodes.push({
        id: `interrupted-${Date.now()}`,
        type: 'SESSION_COMPLETE',
        timestamp: new Date().toISOString(),
        passed: false,
        interrupted: true,
        beforeResults: [],
        afterResults: [],
        totalRewrites: 0,
        finalScore: 100,
      })
      saveSession(s)
    }
  }
}
