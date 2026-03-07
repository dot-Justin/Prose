import express from 'express'
import cors from 'cors'
import { markInterruptedSessions } from './lib/storage'
import sessionsRouter from './routes/sessions'
import settingsRouter from './routes/settings'

const PORT = 3001

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '2mb' }))

app.use('/api/sessions', sessionsRouter)
app.use('/api/settings', settingsRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Mark any sessions that were in-progress when the server last died
markInterruptedSessions()

app.listen(PORT, () => {
  console.log(`Prose server running on http://localhost:${PORT}`)
})
