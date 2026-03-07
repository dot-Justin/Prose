import { useState } from 'react'
import { motion } from 'framer-motion'
import { Session, NewSessionFormData } from './types'
import { MOCK_SESSIONS } from './data/mockData'
import { truncateTitle } from './utils/formatters'
import { Sidebar } from './components/sidebar/Sidebar'
import { Timeline } from './components/timeline/Timeline'
import { ArtifactPanel } from './components/artifact/ArtifactPanel'
import { EmptyState } from './components/empty/EmptyState'
import { NewSessionModal } from './components/modals/NewSessionModal'

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const col = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS)
  const [activeSessionId, setActiveSessionId] = useState<string | null>('session-a')
  const [modalOpen, setModalOpen] = useState(false)
  const [artifactOpen, setArtifactOpen] = useState(true)
  const [selectedRevision, setSelectedRevision] = useState(2) // show Rev 3 by default
  const [highlightChanges, setHighlightChanges] = useState(true)

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null

  // When switching sessions, reset revision to latest
  function handleSelectSession(id: string) {
    setActiveSessionId(id)
    const s = sessions.find(s => s.id === id)
    if (s) setSelectedRevision(s.revisions.length - 1)
  }

  function handleNewSession(data: NewSessionFormData) {
    const id = `session-${Date.now()}`
    const newSession: Session = {
      id,
      title: truncateTitle(data.inputText),
      createdAt: new Date(),
      status: 'in-progress',
      overallScore: 0,
      nodes: [
        {
          id: `${id}-start`,
          type: 'SESSION_STARTED',
          timestamp: new Date(),
          wordCount: data.inputText.trim().split(/\s+/).length,
          style: data.style || 'General',
          requirements: data.requirements,
          maxRevisions: data.maxRevisions,
          targetDetectionPct: data.targetDetectionPct,
        },
        {
          id: `${id}-running`,
          type: 'CURRENTLY_RUNNING',
          timestamp: new Date(),
          message: 'Running baseline detection…',
        },
      ],
      revisions: [
        { label: 'Original', text: data.inputText, changedSentences: [] },
      ],
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(id)
    setSelectedRevision(0)
  }

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
        />
      </motion.div>

      {/* Main timeline */}
      <motion.div
        variants={col}
        style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}
      >
        {activeSession ? (
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
          session={activeSession}
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
        onSubmit={handleNewSession}
      />
    </motion.div>
  )
}
