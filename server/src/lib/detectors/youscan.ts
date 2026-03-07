import { DetectorResult, YouScanSuggestion } from './types'

export async function runYouScan(text: string): Promise<DetectorResult> {
  const name = 'youscan'
  try {
    const res = await fetch('https://youscan.io/api/detect-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as {
      ai_generated_likelihood: number
      suggestions: YouScanSuggestion[]
    }
    return {
      name,
      score: json.ai_generated_likelihood,
      suggestions: json.suggestions ?? [],
    }
  } catch (err) {
    return { name, score: null, skipped: true, skipReason: String(err) }
  }
}
