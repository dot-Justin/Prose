import { Router, Request, Response } from 'express'
import { formatClaudeError, testSavedAuth } from '../lib/claude'
import { ClaudeAuthType, loadSettings, saveSettings } from '../lib/storage'
import { checkAIDetectorQuota } from '../lib/detectors/index'

const router = Router()

function maskCredential(authType: ClaudeAuthType, credential: string): string {
  if (!credential) return ''

  const prefix = credential.slice(0, 14)
  const hint = authType === 'oauth' ? 'sk-ant-oat01-' : 'sk-ant-api03-'
  return `${prefix || hint}...•••`
}

router.get('/', (_req: Request, res: Response) => {
  const settings = loadSettings()
  res.json({
    ...settings,
    claudeCredential: maskCredential(settings.claudeAuthType, settings.claudeCredential),
  })
})

router.put('/', (req: Request, res: Response) => {
  const current = loadSettings()
  const body = req.body as {
    claudeAuthType?: ClaudeAuthType
    claudeCredential?: string
    enabledDetectors?: string[]
    defaults?: { maxRevisions?: number; targetDetectionPct?: number }
  }

  const nextCredential = typeof body.claudeCredential === 'string'
    ? body.claudeCredential.trim()
    : undefined
  const shouldReplaceCredential = nextCredential !== undefined && nextCredential !== '' && !nextCredential.includes('•')

  const updated = {
    ...current,
    claudeAuthType: body.claudeAuthType === 'apikey' ? 'apikey' : body.claudeAuthType === 'oauth' ? 'oauth' : current.claudeAuthType,
    claudeCredential: shouldReplaceCredential ? nextCredential : current.claudeCredential,
    enabledDetectors: body.enabledDetectors ?? current.enabledDetectors,
    defaults: {
      ...current.defaults,
      ...body.defaults,
    },
  }

  saveSettings(updated)
  res.json({ ok: true })
})

router.post('/test-auth', async (_req: Request, res: Response) => {
  const settings = loadSettings()

  if (!settings.claudeCredential) {
    res.status(400).json({ success: false, error: 'No Claude credential saved' })
    return
  }

  try {
    const authType = await testSavedAuth(settings)
    res.json({ success: true, authType })
  } catch (err) {
    res.status(400).json({ success: false, error: formatClaudeError(err) })
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
