import { DetectorResult } from './types'

export async function runNoteGPT(text: string): Promise<DetectorResult> {
  const name = 'NoteGPT'
  try {
    const res = await fetch('https://notegpt.io/api/v2/text-detector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as {
      code: number
      data: {
        ai_percentage: number
        ai_sentences: string[]
      }
    }
    if (json.code !== 100000) throw new Error(`code ${json.code}`)
    return {
      name,
      score: json.data.ai_percentage,
      flaggedSentences: json.data.ai_sentences ?? [],
    }
  } catch (err) {
    return { name, score: null, skipped: true, skipReason: String(err) }
  }
}
