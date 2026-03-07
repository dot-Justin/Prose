import { DetectorResult, DetectorSentence } from './types'

const PRODUCT_SERIAL = 'deadbeef12345678deadbeef12345678'
const BASE_URL = 'https://api.decopy.ai/api/decopy/ai-detector'
const HEADERS = {
  'Product-Serial': PRODUCT_SERIAL,
  Authorization: '',
}

async function createJob(text: string): Promise<string> {
  const body = new FormData()
  body.append('content', text)
  const res = await fetch(`${BASE_URL}/create-job`, {
    method: 'POST',
    headers: HEADERS,
    body,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { code: number; result: { job_id: string } }
  if (json.code !== 100000) throw new Error(`code ${json.code}`)
  return json.result.job_id
}

interface JobOutput {
  totalScore: number
  sentences: Array<{ content: string; score: number }>
}

async function pollJob(jobId: string): Promise<JobOutput> {
  const startTime = Date.now()
  let delay = 500
  while (Date.now() - startTime < 30000) {
    await new Promise(r => setTimeout(r, delay))
    delay = Math.min(delay * 2, 5000)

    const res = await fetch(`${BASE_URL}/get-job/${jobId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as {
      code: number
      result: { output: JobOutput | null }
    }
    if (json.code !== 100000) throw new Error(`code ${json.code}`)
    if (json.result.output !== null) return json.result.output
  }
  throw new Error('Timeout waiting for decopy job')
}

export async function runDecopy(text: string): Promise<DetectorResult> {
  const name = 'decopy.ai'
  try {
    const jobId = await createJob(text)
    const output = await pollJob(jobId)
    const sentences: DetectorSentence[] = (output.sentences ?? []).map(s => ({
      content: s.content,
      score: s.score,
    }))
    return {
      name,
      score: output.totalScore * 100,
      sentences,
    }
  } catch (err) {
    return { name, score: null, skipped: true, skipReason: String(err) }
  }
}
