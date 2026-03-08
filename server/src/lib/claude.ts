import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { Settings } from './storage'

const FALLBACK_SKILL_MD = 'Rewrite the sentence to sound like a human wrote it. Vary sentence length, remove AI vocabulary (utilize→use, leverage→use, delve, etc.), and break predictable rhythm.'

let cachedSkillMd: string | null = null

export function loadSkillMd(): string {
  if (cachedSkillMd !== null) return cachedSkillMd

  const candidates = [
    path.resolve(process.cwd(), '.claude', 'research', 'Humanizer Skill', 'SKILL.md'),
    path.resolve(process.cwd(), '..', '.claude', 'research', 'Humanizer Skill', 'SKILL.md'),
  ]

  for (const p of candidates) {
    try {
      cachedSkillMd = fs.readFileSync(p, 'utf-8')
      return cachedSkillMd
    } catch { /* try next */ }
  }

  cachedSkillMd = FALLBACK_SKILL_MD
  return cachedSkillMd
}

function makeClient(settings: Settings): Anthropic {
  // OAuth tokens (sk-ant-oat01-*) → Authorization: Bearer + oauth-2025-04-20 beta header
  // API keys (sk-ant-api03-*) → X-Api-Key header
  if (settings.claudeAuthType === 'oauth') {
    return new Anthropic({
      authToken: settings.claudeCredential,
      defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
    })
  }
  return new Anthropic({ apiKey: settings.claudeCredential })
}

export function formatClaudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Invalid or expired credential. Re-enter it in Settings → Auth.'
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'Permission denied. Check your Claude plan allows API access.'
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate limit reached. Wait a moment and try again.'
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error ${err.status}: ${err.message}`
  }
  return err instanceof Error ? err.message : String(err)
}

export function isClaudeAuthError(err: unknown): boolean {
  return err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError
}

export async function testSavedAuth(settings: Settings): Promise<Settings['claudeAuthType']> {
  const client = makeClient(settings)
  await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'ok' }],
  })
  return settings.claudeAuthType
}

export async function generateTitle(inputText: string, settings: Settings): Promise<string> {
  const client = makeClient(settings)
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 30,
    system: 'Generate a short 5–7 word title for this text. Return ONLY the title — no quotes, no punctuation at the end.',
    messages: [{ role: 'user', content: inputText.slice(0, 400) }],
  })
  const block = msg.content.find(b => b.type === 'text')
  return block?.type === 'text' ? block.text.trim() : inputText.slice(0, 40).trimEnd()
}

export interface RewriteResult {
  rewritten: string
  pattern: string
}

const REWRITE_TOOL: Anthropic.Tool = {
  name: 'submit_rewrite',
  description: 'Submit the rewritten sentence',
  input_schema: {
    type: 'object' as const,
    required: ['rewritten', 'pattern'],
    properties: {
      rewritten: {
        type: 'string',
        description: 'The rewritten sentence only — not the full text',
      },
      pattern: {
        type: 'string',
        description: 'The AI writing pattern addressed, e.g. "Removed copula avoidance: serves as → is", "Replaced AI vocabulary: leverage → use"',
      },
    },
  },
}

export async function rewriteSentence(
  workingText: string,
  targetSentence: string,
  suggestion: string,
  style: string,
  requirements: string,
  skillMd: string,
  settings: Settings,
  previousRewrites: string[] = [],
): Promise<RewriteResult> {
  const client = makeClient(settings)

  const lines = [
    'Full text:',
    '"""',
    workingText,
    '"""',
    '',
    `Target sentence flagged by detectors:\n"${targetSentence}"`,
  ]
  if (suggestion) lines.push('', `youscan suggestion: "${suggestion}"`)
  if (previousRewrites.length > 0) {
    lines.push('', 'Previous rewrite attempts on this sentence FAILED to reduce detection scores:')
    for (const prev of previousRewrites) lines.push(`  - "${prev}"`)
    lines.push('Make a FUNDAMENTALLY DIFFERENT structural choice — restructure, reframe, split into two sentences, change perspective, or alter construction and rhythm entirely. Do NOT produce minor variations of the previous attempts.')
  }
  lines.push('', `Style: ${style || 'General'}`)
  if (requirements) lines.push(`Requirements: ${requirements}`)
  lines.push('', 'Rewrite ONLY the target sentence — do not change anything else. Submit using submit_rewrite.')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: skillMd,
    tools: [REWRITE_TOOL],
    tool_choice: { type: 'any' },
    messages: [{ role: 'user', content: lines.join('\n') }],
  })

  const toolUse = msg.content.find(b => b.type === 'tool_use')
  if (toolUse?.type === 'tool_use') {
    const input = toolUse.input as { rewritten?: string; pattern?: string }
    return {
      rewritten: input.rewritten?.trim() ?? targetSentence,
      pattern: input.pattern ?? 'Humanized sentence',
    }
  }

  // Fallback: shouldn't happen with tool_choice: any
  const text = msg.content.find(b => b.type === 'text')
  return {
    rewritten: text?.type === 'text' ? text.text.trim() : targetSentence,
    pattern: 'Humanized sentence',
  }
}
