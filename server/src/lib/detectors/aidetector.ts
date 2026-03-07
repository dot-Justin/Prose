import { DetectorResult, AISentence } from './types'

export async function checkAIDetectorQuota(): Promise<{ remaining: number; allowed: number; resetAt: string }> {
  const res = await fetch('https://api.aidetector.com/api/v1/detect/limit', {
    signal: AbortSignal.timeout(10000),
  })
  const json = await res.json() as {
    limits: { remaining: number; allowed: number; reset_at: string }
  }
  return {
    remaining: json.limits.remaining,
    allowed: json.limits.allowed,
    resetAt: json.limits.reset_at,
  }
}

export async function runAIDetector(text: string): Promise<DetectorResult> {
  const name = 'AIDetector'
  try {
    // Check quota first
    const quota = await checkAIDetectorQuota()
    if (quota.remaining === 0) {
      return { name, score: null, skipped: true, skipReason: 'Daily quota exhausted (100 req/day)' }
    }

    // Overall score
    const overallRes = await fetch('https://api.aidetector.com/api/v1/detect/overall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30000),
    })
    if (!overallRes.ok) throw new Error(`HTTP ${overallRes.status}`)
    const overall = await overallRes.json() as {
      status: string
      result: { ai_probability: number }
    }
    if (overall.status !== 'ok') throw new Error('status not ok')

    // Sentence stream
    const sentences: AISentence[] = []
    try {
      const streamRes = await fetch('https://api.aidetector.com/api/v1/detect/sentences/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(30000),
      })
      if (streamRes.ok) {
        const raw = await streamRes.text()
        let currentEvent = ''
        for (const line of raw.split('\n')) {
          const l = line.trim()
          if (l.startsWith('event:')) {
            currentEvent = l.slice(6).trim()
          } else if (l.startsWith('data:') && currentEvent === 'sentence') {
            const dataStr = l.slice(5).trim()
            try {
              const parsed = JSON.parse(dataStr) as AISentence
              if (parsed.text) sentences.push(parsed)
            } catch { /* skip malformed */ }
            currentEvent = ''
          }
        }
      }
    } catch { /* sentence stream is optional */ }

    return {
      name,
      score: overall.result.ai_probability,
      aiDetectorSentences: sentences,
    }
  } catch (err) {
    return { name, score: null, skipped: true, skipReason: String(err) }
  }
}
