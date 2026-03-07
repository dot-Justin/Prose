import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { loadSettings, saveSettings } from '../lib/storage'
import { checkAIDetectorQuota } from '../lib/detectors/index'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const settings = loadSettings()
  // Mask API key
  const masked = settings.claudeApiKey
    ? `${settings.claudeApiKey.slice(0, 10)}${'•'.repeat(20)}`
    : ''
  res.json({ ...settings, claudeApiKey: masked })
})

router.put('/', (req: Request, res: Response) => {
  const current = loadSettings()
  const body = req.body as {
    claudeApiKey?: string
    enabledDetectors?: string[]
    defaults?: { maxRevisions?: number; targetDetectionPct?: number }
  }

  // Only update claudeApiKey if a real key is sent (not the masked version)
  const newKey = body.claudeApiKey
  const isRealKey = newKey && !newKey.includes('•')

  const updated = {
    ...current,
    claudeApiKey: isRealKey ? newKey : current.claudeApiKey,
    enabledDetectors: body.enabledDetectors ?? current.enabledDetectors,
    defaults: {
      ...current.defaults,
      ...body.defaults,
    },
  }

  saveSettings(updated)
  res.json({ ok: true })
})

router.post('/test-claude', async (req: Request, res: Response) => {
  const { apiKey } = req.body as { apiKey: string }
  if (!apiKey) {
    res.status(400).json({ error: 'No API key provided' })
    return
  }
  try {
    const client = new Anthropic({ apiKey })
    await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

router.get('/aidetector-quota', async (_req: Request, res: Response) => {
  try {
    const quota = await checkAIDetectorQuota()
    res.json(quota)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
