import { DetectorResult, YouScanSuggestion } from './types'
import { runNoteGPT } from './notegpt'
import { runYouScan } from './youscan'
import { runAIDetector } from './aidetector'
import { runDecopy } from './decopy'
import { runAIScan24 } from './aiscan24'

export type { DetectorResult }

const DETECTOR_MAP: Record<string, (text: string) => Promise<DetectorResult>> = {
  NoteGPT: runNoteGPT,
  youscan: runYouScan,
  AIDetector: runAIDetector,
  'decopy.ai': runDecopy,
  aiscan24: runAIScan24,
}

export async function runAllDetectors(
  text: string,
  enabledNames: string[],
): Promise<DetectorResult[]> {
  const runners = enabledNames
    .filter(name => DETECTOR_MAP[name])
    .map(name => DETECTOR_MAP[name](text))

  const settled = await Promise.allSettled(runners)

  return settled.map((result, i) => {
    const name = enabledNames[i]
    if (result.status === 'rejected') {
      return { name, score: null, skipped: true, skipReason: String(result.reason) } as DetectorResult
    }
    return result.value
  })
}

export function aggregate(results: DetectorResult[], outliers: Set<string> = new Set()): number {
  const active = results.filter(r => !outliers.has(r.name) && r.score !== null)
  if (active.length === 0) return 0
  return active.reduce((sum, r) => sum + (r.score ?? 0), 0) / active.length
}

export function toFrontendResults(
  results: DetectorResult[],
  targetPct: number,
  outliers: Set<string> = new Set(),
): Array<{ name: string; score: number; pass: boolean; skipped?: boolean }> {
  return results.map(r => ({
    name: r.name,
    score: r.score ?? 0,
    pass: !outliers.has(r.name) && r.score !== null && r.score <= targetPct,
    skipped: r.skipped,
  }))
}

export interface TargetSentence {
  sentence: string
  flaggedBy: string[]
  suggestion: string
}

export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.trim())
    .filter(s => s.length > 10)
}

export function pickTargetSentence(
  workingText: string,
  results: DetectorResult[],
  targetPct: number,
  outliers: Set<string>,
  skipSentences: Set<string> = new Set(),
): TargetSentence {
  const allSentences = splitIntoSentences(workingText)
  if (allSentences.length === 0) {
    return { sentence: workingText, flaggedBy: [], suggestion: '' }
  }

  let sentences = allSentences.filter(s => !skipSentences.has(s))
  if (sentences.length === 0) sentences = allSentences  // fallback: ignore skips

  const scoreMap = new Map<string, { flagCount: number; flaggedBy: string[] }>()
  for (const s of sentences) {
    scoreMap.set(s, { flagCount: 0, flaggedBy: [] })
  }

  for (const result of results) {
    if (outliers.has(result.name) || result.skipped || result.score === null) continue
    if (result.score <= targetPct) continue  // this detector already passing

    // NoteGPT: substring match against flaggedSentences
    for (const flagged of result.flaggedSentences ?? []) {
      const match = sentences.find(s => s.includes(flagged) || flagged.includes(s))
      if (match) {
        const entry = scoreMap.get(match)!
        entry.flagCount++
        if (!entry.flaggedBy.includes(result.name)) entry.flaggedBy.push(result.name)
      }
    }

    // decopy: per-sentence score > 0.7
    for (const s of result.sentences ?? []) {
      if (s.score > 0.7) {
        const match = sentences.find(sen => sen.includes(s.content.trim()) || s.content.includes(sen.trim()))
        if (match) {
          const entry = scoreMap.get(match)!
          entry.flagCount++
          if (!entry.flaggedBy.includes(result.name)) entry.flaggedBy.push(result.name)
        }
      }
    }

    // AIDetector: per-sentence ai_probability > targetPct
    for (const s of result.aiDetectorSentences ?? []) {
      if (s.ai_probability > targetPct) {
        const match = sentences.find(sen => sen.includes(s.text.trim()) || s.text.includes(sen.trim()))
        if (match) {
          const entry = scoreMap.get(match)!
          entry.flagCount++
          if (!entry.flaggedBy.includes(result.name)) entry.flaggedBy.push(result.name)
        }
      }
    }
  }

  // Find top sentence (highest flag count, tie-break by position)
  let topSentence = sentences[0]
  let topEntry = scoreMap.get(topSentence) ?? { flagCount: 0, flaggedBy: [] }

  for (const [s, entry] of scoreMap.entries()) {
    if (entry.flagCount > topEntry.flagCount) {
      topSentence = s
      topEntry = entry
    }
  }

  // Find best youscan suggestion for this sentence
  const youscanResult = results.find(r => r.name === 'youscan')
  const suggestion = youscanResult?.suggestions?.find(
    s => topSentence.includes(s.original_phrase) || s.original_phrase.includes(topSentence.slice(0, 30)),
  )?.more_human_alternative ?? ''

  return {
    sentence: topSentence,
    flaggedBy: topEntry.flaggedBy.length > 0 ? topEntry.flaggedBy : results
      .filter(r => !r.skipped && r.score !== null && r.score > targetPct && !outliers.has(r.name))
      .map(r => r.name),
    suggestion,
  }
}

export { checkAIDetectorQuota } from './aidetector'
export type { YouScanSuggestion }
