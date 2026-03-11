import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { Settings } from './storage'
import { DetectorResult } from './detectors/types'

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

async function withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError && attempt < maxRetries) {
        const delay = Math.min(2 ** attempt * 2000, 30000)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}

function buildDetectorStatusBlock(results: DetectorResult[], targetPct: number, outliers: Set<string> = new Set()): string {
  const active = results
    .filter(r => !outliers.has(r.name) && !r.skipped && r.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  if (active.length === 0) return ''
  const primaryBlocker = active.find(r => (r.score ?? 0) > targetPct)
  const lines = [`Current detector scores (target: ${targetPct}%):`, '']
  for (const r of active) {
    const pct = Math.round(r.score ?? 0)
    const passing = pct <= targetPct
    const marker = r === primaryBlocker ? ' ← primary blocker' : passing ? ' (passing)' : ''
    lines.push(`- ${r.name}: ${pct}%${marker}`)
  }
  if (primaryBlocker) {
    lines.push('')
    lines.push(`The primary blocker is ${primaryBlocker.name}. Prioritize breaking the patterns it targets: formal academic register, smooth logical transitions (consequently/therefore/thus), passive constructions, copula avoidance, and characteristic AI vocabulary.`)
  }
  return lines.join('\n')
}

export async function rewriteFullText(
  workingText: string,
  currentScore: number,
  style: string,
  requirements: string,
  skillMd: string,
  settings: Settings,
  detectorResults: DetectorResult[] = [],
  targetPct: number = 25,
  outliers: Set<string> = new Set(),
): Promise<string> {
  const client = makeClient(settings)
  const statusBlock = buildDetectorStatusBlock(detectorResults, targetPct, outliers)
  const lines = [
    `This text scores ~${Math.round(currentScore)}% on AI detectors. Apply ALL humanizer patterns to rewrite it completely. Be aggressive:`,
    '',
    '- Vary sentence length drastically — some very short, some longer',
    '- Replace ALL AI vocabulary: utilize, leverage, delve, showcase, pivotal, crucial, additionally, underscore, tapestry, testament, highlight (verb), intricate, foster, enhance, vibrant, exemplify, embody',
    '- Fix copula avoidance: "serves as"/"stands as"/"represents" → "is"/"was"',
    '- Remove em dashes — replace with comma, period, or colon',
    '- Break up rule-of-three constructions',
    '- Cut superficial -ing endings (symbolizing, highlighting, reflecting)',
    '- Cut significance inflation (pivotal moment, vital role, testament to)',
    '- Add concrete specificity where text is vague',
    '- Do NOT use markdown: no headers (#), no bold (**), no bullets, no em dashes — plain prose paragraphs only',
    '',
    `Style: ${style || 'General'}`,
  ]
  if (requirements) lines.push(`Requirements: ${requirements}`)
  if (statusBlock) lines.push('', statusBlock)
  lines.push('', 'Return ONLY the rewritten text. No explanation.', '', 'Text:', '"""', workingText, '"""')

  const msg = await withRateLimitRetry(() => client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: skillMd,
    messages: [{ role: 'user', content: lines.join('\n') }],
  }))

  const block = msg.content.find(b => b.type === 'text')
  return block?.type === 'text' ? block.text.trim() : workingText
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
  detectorResults: DetectorResult[] = [],
  targetPct: number = 25,
  outliers: Set<string> = new Set(),
): Promise<RewriteResult> {
  const client = makeClient(settings)
  const statusBlock = buildDetectorStatusBlock(detectorResults, targetPct, outliers)

  const lines = [
    'Full text:',
    '"""',
    workingText,
    '"""',
    '',
    `Target sentence flagged by detectors:\n"${targetSentence}"`,
  ]
  if (statusBlock) lines.push('', statusBlock)
  if (suggestion) lines.push('', `youscan direction (use as inspiration for what to change, not literal wording — match the ${style || 'General'} register): "${suggestion}"`)
  if (previousRewrites.length > 0) {
    lines.push('', 'Previous rewrite attempts on this sentence FAILED to reduce detection scores:')
    for (const prev of previousRewrites) lines.push(`  - "${prev}"`)
    lines.push('Make a FUNDAMENTALLY DIFFERENT structural choice — restructure, reframe, split into two sentences, change perspective, or alter construction and rhythm entirely. Do NOT produce minor variations of the previous attempts.')
  }
  lines.push('', `Style: ${style || 'General'}`)
  if (requirements) lines.push(`Requirements: ${requirements}`)
  lines.push('', 'Rewrite ONLY the target sentence — do not change anything else. Submit using submit_rewrite.')

  const msg = await withRateLimitRetry(() => client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: skillMd,
    tools: [REWRITE_TOOL],
    tool_choice: { type: 'any' },
    messages: [{ role: 'user', content: lines.join('\n') }],
  }))

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
