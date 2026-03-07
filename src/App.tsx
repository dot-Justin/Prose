import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Session, TimelineNode, NewSessionFormData, Revision } from './types'
import { Sidebar } from './components/sidebar/Sidebar'
import { Timeline } from './components/timeline/Timeline'
import { ArtifactPanel } from './components/artifact/ArtifactPanel'
import { EmptyState } from './components/empty/EmptyState'
import { NewSessionModal } from './components/modals/NewSessionModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { useSessionStream } from './hooks/useSessionStream'

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const col = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// Deserialize a raw API session into a Session with proper Date objects
function deserializeSession(raw: Record<string, unknown>): Session {
  const nodes = ((raw.nodes ?? []) as Record<string, unknown>[]).map(n => ({
    ...n,
    timestamp: new Date((n.timestamp as string) ?? Date.now()),
  })) as unknown as TimelineNode[]

  return {
    id: raw.id as string,
    title: raw.title as string,
    createdAt: new Date((raw.createdAt as string) ?? Date.now()),
    status: raw.status as Session['status'],
    overallScore: (raw.overallScore as number) ?? 0,
    nodes,
    revisions: (raw.revisions as Revision[]) ?? [],
  }
}

// Build revisions from session nodes + inputText (for in-progress sessions)
function buildRevisions(inputText: string, nodes: TimelineNode[]): Revision[] {
  const revisions: Revision[] = [{ label: 'Original', text: inputText, changedSentences: [] }]
  let workingText = inputText
  let revNum = 1
  let prevScore = 100
  let pendingRewrite: { original: string; rewritten: string } | null = null

  for (const node of nodes) {
    if (node.type === 'DETECTION_RUN' && node.iterationNumber === 0) {
      prevScore = node.overallScore
    }
    if (node.type === 'REWRITE') {
      pendingRewrite = { original: node.original, rewritten: node.rewritten }
    }
    if (node.type === 'REDETECT_RESULT' && pendingRewrite) {
      if (node.kept) {
        workingText = workingText.replace(pendingRewrite.original, pendingRewrite.rewritten)
        const afterDeltas = node.deltas
        const afterScore = afterDeltas.length > 0
          ? afterDeltas.reduce((sum, d) => sum + d.after, 0) / afterDeltas.length
          : prevScore
        revisions.push({
          label: `Rev ${revNum++} — ${Math.round(prevScore)}% → ${Math.round(afterScore)}%`,
          text: workingText,
          changedSentences: [pendingRewrite.rewritten],
        })
        prevScore = afterScore
      }
      pendingRewrite = null
    }
  }
  return revisions
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [inputTexts, setInputTexts] = useState<Record<string, string>>({})
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [streamSessionId, setStreamSessionId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [artifactOpen, setArtifactOpen] = useState(true)
  const [selectedRevision, setSelectedRevision] = useState(0)
  const [highlightChanges, setHighlightChanges] = useState(true)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null
  const activeInputText = activeSessionId ? (inputTexts[activeSessionId] ?? '') : ''

  // Load sessions on mount
  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then((data: { sessions: Record<string, unknown>[] }) => {
        setSessions(data.sessions.map(deserializeSession))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function handleSelectSession(id: string) {
    setActiveSessionId(id)
    const s = sessions.find(s => s.id === id)
    if (!s) return

    // If session has revisions, show the last one
    const revCount = s.revisions.length
    setSelectedRevision(revCount > 0 ? revCount - 1 : 0)

    // Load full session data if it's complete and we don't have nodes yet
    if (s.status !== 'in-progress' && s.nodes.length === 0) {
      fetch(`/api/sessions/${id}`)
        .then(r => r.json())
        .then((full: Record<string, unknown>) => {
          const fullSession = deserializeSession(full)
          setSessions(prev => prev.map(ss => ss.id === id ? fullSession : ss))
          if (full.inputText) {
            setInputTexts(prev => ({ ...prev, [id]: full.inputText as string }))
          }
          const revs = (full.revisions as Revision[] | undefined) ?? []
          setSelectedRevision(revs.length > 0 ? revs.length - 1 : 0)
        })
        .catch(console.error)
    }
  }

  const handleSSENode = useCallback((node: TimelineNode) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== streamSessionId) return s
      const nodes = [...s.nodes]
      // Replace CURRENTLY_RUNNING if the new node is also CURRENTLY_RUNNING
      if (node.type === 'CURRENTLY_RUNNING' && nodes.length > 0 && nodes[nodes.length - 1].type === 'CURRENTLY_RUNNING') {
        nodes[nodes.length - 1] = node
      } else {
        nodes.push(node)
      }
      return { ...s, nodes }
    }))
  }, [streamSessionId])

  const handleSSEComplete = useCallback((score: number, passed: boolean) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== streamSessionId) return s
      return {
        ...s,
        status: passed ? 'complete-pass' : 'complete-fail',
        overallScore: score,
      }
    }))
  }, [streamSessionId])

  const handleSSEDone = useCallback(() => {
    setStreamSessionId(null)
    // Load full session to get final revisions
    if (streamSessionId) {
      fetch(`/api/sessions/${streamSessionId}`)
        .then(r => r.json())
        .then((full: Record<string, unknown>) => {
          const fullSession = deserializeSession(full)
          setSessions(prev => prev.map(ss => ss.id === streamSessionId ? fullSession : ss))
          if (full.inputText) {
            setInputTexts(prev => ({ ...prev, [streamSessionId]: full.inputText as string }))
          }
          const revs = (full.revisions as Revision[] | undefined) ?? []
          setSelectedRevision(revs.length > 0 ? revs.length - 1 : 0)
        })
        .catch(console.error)
    }
  }, [streamSessionId])

  useSessionStream(streamSessionId, handleSSENode, handleSSEComplete, handleSSEDone)

  async function handleNewSession(data: NewSessionFormData) {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json() as { error: string; message?: string }
        if (err.error === 'NO_API_KEY') {
          setToast('Add a Claude API key in Settings first')
          setSettingsOpen(true)
        } else {
          setToast(err.message ?? 'Failed to create session')
        }
        return
      }

      const { id, title, createdAt } = await res.json() as { id: string; title: string; createdAt: string }

      const newSession: Session = {
        id,
        title,
        createdAt: new Date(createdAt),
        status: 'in-progress',
        overallScore: 0,
        nodes: [],
        revisions: [{ label: 'Original', text: data.inputText, changedSentences: [] }],
      }

      setInputTexts(prev => ({ ...prev, [id]: data.inputText }))
      setSessions(prev => [newSession, ...prev])
      setActiveSessionId(id)
      setSelectedRevision(0)
      setStreamSessionId(id)
    } catch (err) {
      setToast('Network error — is the server running?')
      console.error(err)
    }
  }

  // Compute revisions for the active session
  const activeRevisions: Revision[] = activeSession
    ? (activeSession.revisions.length > 0
        ? activeSession.revisions
        : buildRevisions(activeInputText, activeSession.nodes))
    : []

  const displaySession = activeSession
    ? { ...activeSession, revisions: activeRevisions }
    : null

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      {/* Left sidebar */}
      <motion.div variants={col} style={{ display: 'flex', flexShrink: 0 }}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={() => setModalOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </motion.div>

      {/* Main timeline */}
      <motion.div
        variants={col}
        style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}
      >
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            Loading sessions…
          </div>
        ) : activeSession ? (
          <Timeline session={activeSession} />
        ) : (
          <EmptyState onNewSession={() => setModalOpen(true)} />
        )}
      </motion.div>

      {/* Right artifact panel */}
      <motion.div
        variants={col}
        style={{ position: 'relative', display: 'flex', flexShrink: 0 }}
      >
        <ArtifactPanel
          session={displaySession}
          open={artifactOpen}
          onToggle={() => setArtifactOpen(o => !o)}
          selectedRevision={selectedRevision}
          onSelectRevision={setSelectedRevision}
          highlightChanges={highlightChanges}
          onToggleHighlight={() => setHighlightChanges(h => !h)}
        />
      </motion.div>

      {/* New Session modal */}
      <NewSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => {
          setModalOpen(false)
          handleNewSession(data)
        }}
      />

      {/* Settings modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '10px 18px',
          fontFamily: 'var(--font-ui)',
          fontSize: '13px',
          color: 'var(--color-text)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </motion.div>
  )
}

