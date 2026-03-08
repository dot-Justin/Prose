// ── Session ─────────────────────────────────────────────────────────────────

export type SessionStatus = 'complete-pass' | 'complete-fail' | 'in-progress'

export type ClaudeAuthType = 'oauth' | 'apikey'

export interface SettingsSummary {
  claudeAuthType: ClaudeAuthType
  claudeCredential: string
  enabledDetectors: string[]
  defaults: { maxRevisions: number; targetDetectionPct: number }
}

export interface Revision {
  label: string      // "Original" | "Rev 2 — 86% → 52%" etc.
  text: string
  changedSentences: string[]  // sentences that differ from previous revision
}

export interface Session {
  id: string
  title: string       // first 40 chars of input text
  createdAt: Date
  status: SessionStatus
  overallScore: number  // 0-100, used for sidebar badge
  nodes: TimelineNode[]
  revisions: Revision[]
}

// ── Timeline Nodes ───────────────────────────────────────────────────────────

export type NodeType =
  | 'SESSION_STARTED'
  | 'DETECTION_RUN'
  | 'ITERATION_START'
  | 'REWRITE'
  | 'REDETECT_RESULT'
  | 'OUTLIER_IGNORED'
  | 'SESSION_COMPLETE'
  | 'CURRENTLY_RUNNING'

interface BaseNode {
  id: string
  type: NodeType
  timestamp: Date
}

export interface SessionStartedNode extends BaseNode {
  type: 'SESSION_STARTED'
  wordCount: number
  style: string
  requirements: string
  maxRevisions: number
  targetDetectionPct: number
}

export interface DetectorResult {
  name: string
  score: number | null  // null when skipped
  pass: boolean
  skipped?: boolean
}

export interface DetectionRunNode extends BaseNode {
  type: 'DETECTION_RUN'
  label: string   // "Baseline detection" | "Re-detection after iteration 2"
  results: DetectorResult[]
  overallScore: number
  iterationNumber: number
}

export interface IterationStartNode extends BaseNode {
  type: 'ITERATION_START'
  iterationNumber: number
  maxRevisions: number
  // New (batch):
  targets?: Array<{ sentence: string; flaggedBy: string[]; suggestion: string }>
  // Old (single) — compat with stored sessions:
  targetSentence?: string
  flaggedBy?: string[]
  suggestion?: string
}

export interface RewriteNode extends BaseNode {
  type: 'REWRITE'
  // New (batch):
  rewrites?: Array<{ original: string; rewritten: string; pattern?: string }>
  isFullPass?: boolean
  sentenceCount?: number  // for full-text passes, approximate count of affected sentences
  // Old (single) — compat with stored sessions:
  original?: string
  rewritten?: string
}

export interface ScoreDelta {
  detector: string
  before: number
  after: number
}

export interface RedetectResultNode extends BaseNode {
  type: 'REDETECT_RESULT'
  deltas: ScoreDelta[]
  kept: boolean
  summary: string   // "4 improved, 1 worsened"
}

export interface OutlierIgnoredNode extends BaseNode {
  type: 'OUTLIER_IGNORED'
  detectorName: string
  reason: string
}

export interface SessionCompleteNode extends BaseNode {
  type: 'SESSION_COMPLETE'
  beforeResults: DetectorResult[]
  afterResults: DetectorResult[]
  totalRewrites: number
  finalScore: number
  passed: boolean
  interrupted?: boolean
  expiredToken?: boolean
  error?: string
  bestScore?: number   // if not passed, the best aggregate reached
}

export interface CurrentlyRunningNode extends BaseNode {
  type: 'CURRENTLY_RUNNING'
  message: string
}

export type TimelineNode =
  | SessionStartedNode
  | DetectionRunNode
  | IterationStartNode
  | RewriteNode
  | RedetectResultNode
  | OutlierIgnoredNode
  | SessionCompleteNode
  | CurrentlyRunningNode

// ── New Session Form ─────────────────────────────────────────────────────────

export interface NewSessionFormData {
  inputText: string
  style: string
  requirements: string
  maxRevisions: number
  targetDetectionPct: number
}
