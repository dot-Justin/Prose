import { DetectorResult, DetectorSentence } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function randomSerial(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

function buildHeaders(serial: string, serialHeader: string, origin: string) {
  return {
    [serialHeader]: serial,
    Authorization: '',
    'User-Agent': UA,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: origin,
    Referer: `${origin}/`,
  }
}

interface JobOpts {
  url: string
  serial: string
  serialHeader: string
  origin: string
  extraBody?: Record<string, string>
}

interface JobOutput {
  totalScore: number
  sentences: Array<{ content: string; score: number }>
}

async function createJob(text: string, opts: JobOpts): Promise<string> {
  await new Promise(r => setTimeout(r, 100 + Math.random() * 400))
  const body = new FormData()
  body.append('content', text)
  if (opts.extraBody) {
    for (const [k, v] of Object.entries(opts.extraBody)) body.append(k, v)
  }
  const res = await fetch(opts.url, {
    method: 'POST',
    headers: buildHeaders(opts.serial, opts.serialHeader, opts.origin),
    body,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { code: number; result: { job_id: string } }
  if (json.code !== 100000) throw new Error(`code ${json.code}`)
  return json.result.job_id
}

async function pollJob(jobId: string, opts: JobOpts): Promise<JobOutput> {
  const startTime = Date.now()
  let delay = 500
  const pollUrl = `${opts.url}/${jobId}`
  while (Date.now() - startTime < 30000) {
    await new Promise(r => setTimeout(r, delay))
    delay = Math.min(delay * 2, 5000)
    const res = await fetch(pollUrl, {
      headers: buildHeaders(opts.serial, opts.serialHeader, opts.origin),
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
  throw new Error('Timeout waiting for job')
}

function toResult(name: string, output: JobOutput): DetectorResult {
  const sentences: DetectorSentence[] = (output.sentences ?? []).map(s => ({
    content: s.content,
    score: s.score,
  }))
  return { name, score: output.totalScore * 100, sentences }
}

export async function runDecopy(text: string): Promise<DetectorResult> {
  const name = 'decopy.ai'

  // Try mydetector.ai first (same platform, more reliable anonymous quota)
  try {
    const serial = randomSerial()
    const jobId = await createJob(text, {
      url: 'https://api.mydetector.ai/api/ai-detector/v2/create-job',
      serial, serialHeader: 'product-serial',
      origin: 'https://mydetector.ai',
      extraBody: { version: '1' },
    })
    const output = await pollJob(jobId, {
      url: 'https://api.mydetector.ai/api/ai-detector/get-job',
      serial, serialHeader: 'product-serial',
      origin: 'https://mydetector.ai',
    })
    return toResult(name, output)
  } catch (primaryErr) {
    // Fallback: decopy.ai
    try {
      const serial = randomSerial()
      const jobId = await createJob(text, {
        url: 'https://api.decopy.ai/api/decopy/ai-detector/create-job',
        serial, serialHeader: 'Product-Serial',
        origin: 'https://decopy.ai',
      })
      const output = await pollJob(jobId, {
        url: 'https://api.decopy.ai/api/decopy/ai-detector/get-job',
        serial, serialHeader: 'Product-Serial',
        origin: 'https://decopy.ai',
      })
      return toResult(name, output)
    } catch (fallbackErr) {
      return {
        name, score: null, skipped: true,
        skipReason: `mydetector: ${primaryErr} | decopy: ${fallbackErr}`,
      }
    }
  }
}
