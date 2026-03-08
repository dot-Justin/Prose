import fs from 'fs'
import path from 'path'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { Settings } from './storage'

const FALLBACK_SKILL_MD = 'Rewrite the sentence to sound like a human wrote it. Vary sentence length, remove AI vocabulary (utilize->use, leverage->use, delve, etc.), and break predictable rhythm.'

let cachedSkillMd: string | null = null

function fallbackTitle(inputText: string): string {
  return inputText.slice(0, 50).trim() + '...'
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function applyCredential(settings: Settings): void {
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN

  if (!settings.claudeCredential) return

  if (settings.claudeAuthType === 'oauth') {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = settings.claudeCredential
    return
  }

  process.env.ANTHROPIC_API_KEY = settings.claudeCredential
}

export function loadSkillMd(): string {
  if (cachedSkillMd !== null) return cachedSkillMd

  const candidates = [
    path.resolve(process.cwd(), '.claude', 'research', 'Humanizer Skill', 'SKILL.md'),
    path.resolve(process.cwd(), '..', '.claude', 'research', 'Humanizer Skill', 'SKILL.md'),
  ]

  for (const skillPath of candidates) {
    try {
      cachedSkillMd = fs.readFileSync(skillPath, 'utf-8')
      return cachedSkillMd
    } catch {
      continue
    }
  }

  cachedSkillMd = FALLBACK_SKILL_MD
  return cachedSkillMd
}

export function formatClaudeError(err: unknown): string {
  const message = toErrorMessage(err)

  if (/claude code cli|@anthropic-ai\/claude-code|spawn .*enoent|executable/i.test(message)) {
    return 'Claude Code CLI not found. Run: npm install -g @anthropic-ai/claude-code'
  }

  return message
}

export function isClaudeAuthError(err: unknown): boolean {
  const message = formatClaudeError(err).toLowerCase()

  if (message.includes('claude code cli not found')) return false

  return /\b401\b|unauthorized|authentication|invalid api key|api key .*invalid|oauth token|token expired|expired token|invalid token|auth/.test(message)
}

async function runQuery(prompt: string, systemPrompt?: string): Promise<string> {
  for await (const msg of query({
    prompt,
    options: {
      systemPrompt,
      allowedTools: [],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
    },
  })) {
    if (msg.type !== 'result') continue

    if (msg.subtype !== 'success' || msg.is_error) {
      const errors = 'errors' in msg && Array.isArray(msg.errors) ? msg.errors : []
      throw new Error(errors.join('; ') || 'Claude request failed')
    }

    return msg.result.trim()
  }

  throw new Error('No result from Claude')
}

export async function generateTitle(
  inputText: string,
  settings: Settings,
): Promise<string> {
  applyCredential(settings)

  const prompt = [
    'Generate a short 5-7 word title for this text.',
    'Return ONLY the title - no quotes, no explanation.',
    '',
    inputText.slice(0, 400),
  ].join('\n')

  try {
    const result = await runQuery(prompt)
    return result || fallbackTitle(inputText)
  } catch (err) {
    throw new Error(formatClaudeError(err))
  }
}

export interface RewriteResult {
  rewritten: string
  pattern: string
}

export async function rewriteSentence(
  workingText: string,
  targetSentence: string,
  suggestion: string,
  style: string,
  requirements: string,
  skillMd: string,
  settings: Settings,
): Promise<RewriteResult> {
  applyCredential(settings)

  const lines = [
    'Full text:',
    '"""',
    workingText,
    '"""',
    '',
    'Target sentence flagged by detectors:',
    `"${targetSentence}"`,
  ]

  if (suggestion) lines.push('', `youscan alternative: "${suggestion}"`)

  lines.push('', `Style: ${style || 'General'}`)

  if (requirements) lines.push(`Requirements: ${requirements}`)

  lines.push(
    '',
    'Rewrite ONLY the target sentence - do not change anything else.',
    '',
    'Return a JSON object on a single line with exactly these two fields:',
    '{"rewritten": "<your rewritten sentence>", "pattern": "<AI pattern addressed, e.g. Removed copula avoidance: serves as -> is>"}',
    '',
    'Return ONLY the JSON - no markdown, no explanation, no code fences.',
  )

  try {
    const text = await runQuery(lines.join('\n'), skillMd)
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    try {
      const parsed = JSON.parse(clean) as Partial<RewriteResult>
      return {
        rewritten: typeof parsed.rewritten === 'string' ? parsed.rewritten.trim() : targetSentence,
        pattern: typeof parsed.pattern === 'string' ? parsed.pattern : 'parse error - sentence unchanged',
      }
    } catch {
      return { rewritten: targetSentence, pattern: 'parse error - sentence unchanged' }
    }
  } catch (err) {
    throw new Error(formatClaudeError(err))
  }
}

export async function testSavedAuth(settings: Settings): Promise<Settings['claudeAuthType']> {
  applyCredential(settings)
  await runQuery('Say "ok"')
  return settings.claudeAuthType
}
