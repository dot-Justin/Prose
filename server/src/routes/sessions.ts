import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { loadSettings, loadSession, listSessions, saveSession } from '../lib/storage'
import { generateTitle } from '../lib/claude'
import { createEmitter } from '../lib/sse'
import { runOrchestrator } from '../lib/orchestrator'
import { NewSessionFormData } from '../types'

const router = Router()

// Track in-progress streams to prevent double-running
const runningStreams = new Set<string>()

router.get('/', (_req: Request, res: Response) => {
  const sessions = listSessions().map(s => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    status: s.status,
    overallScore: s.overallScore,
  }))
  res.json({ sessions })
})

router.get('/:id', (req: Request, res: Response) => {
  const session = loadSession(req.params.id)
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  res.json(session)
})

router.post('/', async (req: Request, res: Response) => {
  const settings = loadSettings()

  if (!settings.claudeApiKey) {
    res.status(400).json({ error: 'NO_API_KEY', message: 'Add a Claude API key in Settings first' })
    return
  }

  const body = req.body as NewSessionFormData
  if (!body.inputText?.trim()) {
    res.status(400).json({ error: 'inputText is required' })
    return
  }

  const id = randomUUID()
  const createdAt = new Date().toISOString()

  // Generate title with Haiku
  let title: string
  try {
    title = await generateTitle(body.inputText, settings.claudeApiKey)
  } catch {
    title = body.inputText.trim().slice(0, 40) + (body.inputText.length > 40 ? '…' : '')
  }

  const session = {
    id,
    title,
    createdAt,
    status: 'in-progress' as const,
    overallScore: 0,
    inputText: body.inputText.trim(),
    style: body.style ?? '',
    requirements: body.requirements ?? '',
    maxRevisions: body.maxRevisions ?? settings.defaults.maxRevisions,
    targetDetectionPct: body.targetDetectionPct ?? settings.defaults.targetDetectionPct,
    nodes: [],
    revisions: [],
  }

  saveSession(session)
  res.json({ id, title, createdAt })
})

router.get('/:id/stream', async (req: Request, res: Response) => {
  const session = loadSession(req.params.id)
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  const emit = createEmitter(res)

  // Complete session: replay all nodes then close
  if (session.status !== 'in-progress') {
    for (const node of session.nodes) {
      emit((node as { type: string }).type, node as object)
    }
    res.write('data: {"type":"DONE"}\n\n')
    res.end()
    return
  }

  // In-progress: prevent double streaming
  if (runningStreams.has(session.id)) {
    res.status(409).json({ error: 'Session already streaming' })
    return
  }

  const settings = loadSettings()
  if (!settings.claudeApiKey) {
    res.write(`data: ${JSON.stringify({ type: 'ERROR', payload: { message: 'No API key configured' } })}\n\n`)
    res.write('data: {"type":"DONE"}\n\n')
    res.end()
    return
  }

  runningStreams.add(session.id)

  // Handle client disconnect
  req.on('close', () => {
    runningStreams.delete(session.id)
  })

  try {
    await runOrchestrator(session, emit, settings)
  } catch (err) {
    console.error('Orchestrator error:', err)
  } finally {
    runningStreams.delete(session.id)
    res.write('data: {"type":"DONE"}\n\n')
    res.end()
  }
})

export default router
