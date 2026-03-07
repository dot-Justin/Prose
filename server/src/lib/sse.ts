import { Response } from 'express'

export type Emitter = (type: string, payload: object) => void

export function createEmitter(res: Response): Emitter {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  return function emit(type: string, payload: object) {
    res.write(`data: ${JSON.stringify({ type, payload })}\n\n`)
  }
}
