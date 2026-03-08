import { useEffect } from 'react'
import { TimelineNode } from '../types'

function deserializeNode(raw: Record<string, unknown>): TimelineNode {
  return {
    ...raw,
    timestamp: new Date((raw.timestamp as string) ?? Date.now()),
  } as unknown as TimelineNode
}

export function useSessionStream(
  sessionId: string | null,
  onNode: (node: TimelineNode) => void,
  onComplete: (score: number, passed: boolean) => void,
  onConnectionError: (message: string) => void,
  onDone: () => void,
) {
  useEffect(() => {
    if (!sessionId) return

    const es = new EventSource(`/api/sessions/${sessionId}/stream`)

    es.onmessage = (e) => {
      let parsed: { type: string; payload: Record<string, unknown> }
      try {
        parsed = JSON.parse(e.data)
      } catch {
        return
      }

      const { type, payload } = parsed
      if (type === 'DONE') {
        es.close()
        onDone()
        return
      }

      if (type === 'CONNECTION_ERROR') {
        onConnectionError((payload.message as string) ?? 'Claude connection failed')
        return
      }

      const node = deserializeNode({ ...payload, type })
      onNode(node)

      if (type === 'SESSION_COMPLETE') {
        onComplete(
          (payload.finalScore as number) ?? 0,
          (payload.passed as boolean) ?? false,
        )
      }
    }

    es.onerror = () => {
      es.close()
      onDone()
    }

    return () => es.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])
}
