import { DetectorResult } from './types'

export async function runAIScan24(text: string): Promise<DetectorResult> {
  const name = 'aiscan24'

  const wordCount = text.trim().split(/\s+/).length
  if (wordCount < 80) {
    return { name, score: null, skipped: true, skipReason: `Text too short (${wordCount} words, need 80+)` }
  }

  try {
    // ZWJ prefix is required — the server returns 0 without it
    const body = `txt=%E2%80%8D${encodeURIComponent(text)}&mode=0`
    const res = await fetch('https://aiscan24.com/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = await res.text()
    const score = parseInt(raw.split(';')[0].trim(), 10)
    if (isNaN(score)) throw new Error(`Unexpected response: ${raw}`)
    return { name, score }
  } catch (err) {
    return { name, score: null, skipped: true, skipReason: String(err) }
  }
}
