import { Session, TimelineNode, Revision } from '../types'

// ── Shared detector names ────────────────────────────────────────────────────
const DETECTORS = ['AIDetector', 'NoteGPT', 'youscan', 'decopy.ai', 'aiscan24', 'CopyLeaks']

// ── Mock AI text (realistic "AI slop") ───────────────────────────────────────
const originalText = `It is important to note that artificial intelligence has fundamentally transformed the landscape of modern education. Furthermore, the implementation of these cutting-edge technologies has enabled students to leverage unprecedented learning opportunities. In this rapidly evolving digital age, educational institutions must navigate the complex interplay between traditional pedagogical approaches and innovative technological solutions. It is worth noting that this paradigm shift presents both significant challenges and remarkable opportunities for stakeholders across the educational ecosystem. Ultimately, the key to success lies in striking the right balance between human expertise and machine intelligence.`

const rev2Text = `Artificial intelligence has changed how we teach and learn — though not always in ways educators expected. Schools now use AI tools that can adapt to individual students, flag gaps in understanding, and surface resources at the right moment. The challenge isn't whether to adopt these tools. It's figuring out which ones actually help, and which ones just add noise. Teachers who've used AI assistants describe a recurring frustration: the technology handles the easy cases well, but struggles with the messy, contextual work that defines real teaching. That tension isn't going away.`

const rev3Text = `Artificial intelligence has changed how we teach and learn — though not always in ways educators expected. Schools now use AI tools that adapt to individual students and surface resources at the right moment. The challenge isn't whether to adopt these tools. It's figuring out which ones actually help. Teachers who've used AI assistants describe a recurring frustration: the technology handles the easy cases, but struggles with the messy, contextual work that defines real teaching. That tension isn't going away anytime soon.`

// ── Session A — complete / passing ───────────────────────────────────────────
const sessionANodes: TimelineNode[] = [
  {
    id: 'a-start',
    type: 'SESSION_STARTED',
    timestamp: new Date(Date.now() - 2 * 3600000),
    wordCount: 94,
    style: 'Academic Writing',
    requirements: 'No em dashes. Maintain formal but approachable tone. Max 10 revisions.',
    maxRevisions: 10,
    targetDetectionPct: 25,
  },
  {
    id: 'a-detect-1',
    type: 'DETECTION_RUN',
    timestamp: new Date(Date.now() - 2 * 3600000 + 30000),
    label: 'Baseline detection',
    iterationNumber: 0,
    overallScore: 86,
    results: [
      { name: 'AIDetector',  score: 91, pass: false },
      { name: 'NoteGPT',     score: 88, pass: false },
      { name: 'youscan',     score: 82, pass: false },
      { name: 'decopy.ai',   score: 79, pass: false },
      { name: 'aiscan24',    score: 84, pass: false },
      { name: 'CopyLeaks',   score: 90, pass: false },
    ],
  },
  {
    id: 'a-iter-1',
    type: 'ITERATION_START',
    timestamp: new Date(Date.now() - 2 * 3600000 + 60000),
    iterationNumber: 1,
    maxRevisions: 10,
    targetSentence: 'It is important to note that artificial intelligence has fundamentally transformed the landscape of modern education.',
    flaggedBy: ['AIDetector', 'NoteGPT', 'youscan'],
    suggestion: 'Consider rephrasing to avoid "it is important to note" and "fundamentally transformed" — both high-frequency AI markers.',
  },
  {
    id: 'a-rewrite-1',
    type: 'REWRITE',
    timestamp: new Date(Date.now() - 2 * 3600000 + 90000),
    original: 'It is important to note that artificial intelligence has fundamentally transformed the landscape of modern education.',
    rewritten: 'Artificial intelligence has changed how we teach and learn — though not always in ways educators expected.',
  },
  {
    id: 'a-redetect-1',
    type: 'REDETECT_RESULT',
    timestamp: new Date(Date.now() - 2 * 3600000 + 120000),
    deltas: [
      { detector: 'AIDetector', before: 91, after: 74 },
      { detector: 'NoteGPT',    before: 88, after: 69 },
      { detector: 'youscan',    before: 82, after: 61 },
      { detector: 'decopy.ai',  before: 79, after: 68 },
      { detector: 'aiscan24',   before: 84, after: 72 },
      { detector: 'CopyLeaks',  before: 90, after: 78 },
    ],
    kept: true,
    summary: '6 improved, 0 worsened',
  },
  {
    id: 'a-iter-2',
    type: 'ITERATION_START',
    timestamp: new Date(Date.now() - 2 * 3600000 + 150000),
    iterationNumber: 2,
    maxRevisions: 10,
    targetSentence: 'Furthermore, the implementation of these cutting-edge technologies has enabled students to leverage unprecedented learning opportunities.',
    flaggedBy: ['AIDetector', 'NoteGPT', 'decopy.ai', 'CopyLeaks'],
    suggestion: 'Replace "cutting-edge", "leverage", and "unprecedented" — frequent AI vocabulary. Consider a concrete example instead.',
  },
  {
    id: 'a-rewrite-2',
    type: 'REWRITE',
    timestamp: new Date(Date.now() - 2 * 3600000 + 180000),
    original: 'Furthermore, the implementation of these cutting-edge technologies has enabled students to leverage unprecedented learning opportunities.',
    rewritten: 'Schools now use AI tools that adapt to individual students and surface resources at the right moment.',
  },
  {
    id: 'a-redetect-2',
    type: 'REDETECT_RESULT',
    timestamp: new Date(Date.now() - 2 * 3600000 + 210000),
    deltas: [
      { detector: 'AIDetector', before: 74, after: 19 },
      { detector: 'NoteGPT',    before: 69, after: 15 },
      { detector: 'youscan',    before: 61, after: 18 },
      { detector: 'decopy.ai',  before: 68, after: 21 },
      { detector: 'aiscan24',   before: 72, after: 17 },
      { detector: 'CopyLeaks',  before: 78, after: 22 },
    ],
    kept: true,
    summary: '6 improved, 0 worsened',
  },
  {
    id: 'a-complete',
    type: 'SESSION_COMPLETE',
    timestamp: new Date(Date.now() - 2 * 3600000 + 240000),
    beforeResults: [
      { name: 'AIDetector', score: 91, pass: false },
      { name: 'NoteGPT',    score: 88, pass: false },
      { name: 'youscan',    score: 82, pass: false },
      { name: 'decopy.ai',  score: 79, pass: false },
      { name: 'aiscan24',   score: 84, pass: false },
      { name: 'CopyLeaks',  score: 90, pass: false },
    ],
    afterResults: [
      { name: 'AIDetector', score: 19, pass: true },
      { name: 'NoteGPT',    score: 15, pass: true },
      { name: 'youscan',    score: 18, pass: true },
      { name: 'decopy.ai',  score: 21, pass: true },
      { name: 'aiscan24',   score: 17, pass: true },
      { name: 'CopyLeaks',  score: 22, pass: true },
    ],
    totalRewrites: 2,
    finalScore: 18,
    passed: true,
  },
]

const sessionARevisions: Revision[] = [
  {
    label: 'Original',
    text: originalText,
    changedSentences: [],
  },
  {
    label: 'Rev 2 — 86% → 52%',
    text: rev2Text,
    changedSentences: [
      'Artificial intelligence has changed how we teach and learn — though not always in ways educators expected.',
      'Schools now use AI tools that can adapt to individual students, flag gaps in understanding, and surface resources at the right moment.',
    ],
  },
  {
    label: 'Rev 3 — 52% → 18%',
    text: rev3Text,
    changedSentences: [
      'Schools now use AI tools that adapt to individual students and surface resources at the right moment.',
      "The challenge isn't whether to adopt these tools.",
      "It's figuring out which ones actually help.",
      'That tension isn\'t going away anytime soon.',
    ],
  },
]

// ── Session B — complete / failing ───────────────────────────────────────────
const sessionBText = `In conclusion, it is evident that the utilization of social media platforms has had a profound and multifaceted impact on contemporary society. The aforementioned analysis demonstrates that both positive and negative consequences have emerged from this technological phenomenon. Moving forward, it is imperative that individuals, organizations, and policymakers work collaboratively to harness the benefits while mitigating the potential harms associated with social media usage.`

const sessionBNodes: TimelineNode[] = [
  {
    id: 'b-start',
    type: 'SESSION_STARTED',
    timestamp: new Date(Date.now() - 5 * 3600000),
    wordCount: 68,
    style: 'Blog Post — First Person',
    requirements: '',
    maxRevisions: 5,
    targetDetectionPct: 25,
  },
  {
    id: 'b-detect-1',
    type: 'DETECTION_RUN',
    timestamp: new Date(Date.now() - 5 * 3600000 + 20000),
    label: 'Baseline detection',
    iterationNumber: 0,
    overallScore: 94,
    results: [
      { name: 'AIDetector', score: 97, pass: false },
      { name: 'NoteGPT',    score: 93, pass: false },
      { name: 'youscan',    score: 91, pass: false },
      { name: 'decopy.ai',  score: 89, pass: false },
      { name: 'aiscan24',   score: 95, pass: false },
      { name: 'CopyLeaks',  score: 96, pass: false },
    ],
  },
  {
    id: 'b-iter-1',
    type: 'ITERATION_START',
    timestamp: new Date(Date.now() - 5 * 3600000 + 40000),
    iterationNumber: 1,
    maxRevisions: 5,
    targetSentence: 'In conclusion, it is evident that the utilization of social media platforms has had a profound and multifaceted impact on contemporary society.',
    flaggedBy: ['AIDetector', 'NoteGPT', 'youscan', 'aiscan24', 'CopyLeaks'],
    suggestion: '"In conclusion", "it is evident", "utilization", "multifaceted" — all high-signal AI markers. Rewrite without the conclusion frame.',
  },
  {
    id: 'b-rewrite-1',
    type: 'REWRITE',
    timestamp: new Date(Date.now() - 5 * 3600000 + 60000),
    original: 'In conclusion, it is evident that the utilization of social media platforms has had a profound and multifaceted impact on contemporary society.',
    rewritten: 'Social media has changed things — though exactly how depends on who you ask and what platform you\'re talking about.',
  },
  {
    id: 'b-redetect-1',
    type: 'REDETECT_RESULT',
    timestamp: new Date(Date.now() - 5 * 3600000 + 80000),
    deltas: [
      { detector: 'AIDetector', before: 97, after: 78 },
      { detector: 'NoteGPT',    before: 93, after: 71 },
      { detector: 'youscan',    before: 91, after: 68 },
      { detector: 'decopy.ai',  before: 89, after: 65 },
      { detector: 'aiscan24',   before: 95, after: 74 },
      { detector: 'CopyLeaks',  before: 96, after: 80 },
    ],
    kept: true,
    summary: '6 improved, 0 worsened',
  },
  {
    id: 'b-outlier',
    type: 'OUTLIER_IGNORED',
    timestamp: new Date(Date.now() - 5 * 3600000 + 90000),
    detectorName: 'CopyLeaks',
    reason: 'Stuck above 25% for 3 iterations while all others have improved past threshold. Excluding from pass criteria.',
  },
  {
    id: 'b-complete',
    type: 'SESSION_COMPLETE',
    timestamp: new Date(Date.now() - 5 * 3600000 + 100000),
    beforeResults: [
      { name: 'AIDetector', score: 97, pass: false },
      { name: 'NoteGPT',    score: 93, pass: false },
      { name: 'youscan',    score: 91, pass: false },
      { name: 'decopy.ai',  score: 89, pass: false },
      { name: 'aiscan24',   score: 95, pass: false },
      { name: 'CopyLeaks',  score: 96, pass: false },
    ],
    afterResults: [
      { name: 'AIDetector', score: 68, pass: false },
      { name: 'NoteGPT',    score: 61, pass: false },
      { name: 'youscan',    score: 58, pass: false },
      { name: 'decopy.ai',  score: 55, pass: false },
      { name: 'aiscan24',   score: 71, pass: false },
      { name: 'CopyLeaks',  score: 80, pass: false },
    ],
    totalRewrites: 1,
    finalScore: 71,
    passed: false,
    bestScore: 65,
  },
]

const sessionBRevisions: Revision[] = [
  {
    label: 'Original',
    text: sessionBText,
    changedSentences: [],
  },
  {
    label: 'Rev 2 — 94% → 71%',
    text: sessionBText.replace(
      'In conclusion, it is evident that the utilization of social media platforms has had a profound and multifaceted impact on contemporary society.',
      "Social media has changed things — though exactly how depends on who you ask and what platform you're talking about."
    ),
    changedSentences: ["Social media has changed things — though exactly how depends on who you ask and what platform you're talking about."],
  },
]

// ── Session C — in progress ───────────────────────────────────────────────────
const sessionCText = `The implementation of renewable energy solutions represents a pivotal step toward addressing the pressing challenges of climate change. Through the strategic deployment of solar, wind, and other clean energy technologies, societies around the globe have an unprecedented opportunity to transition away from fossil fuels. This transformative shift not only promises to reduce greenhouse gas emissions but also holds the potential to create millions of sustainable jobs and drive economic growth across diverse sectors.`

const sessionCNodes: TimelineNode[] = [
  {
    id: 'c-start',
    type: 'SESSION_STARTED',
    timestamp: new Date(Date.now() - 15 * 60000),
    wordCount: 72,
    style: 'Technical Documentation',
    requirements: 'Avoid passive voice. Keep sentences short. No jargon.',
    maxRevisions: 10,
    targetDetectionPct: 25,
  },
  {
    id: 'c-detect-1',
    type: 'DETECTION_RUN',
    timestamp: new Date(Date.now() - 14 * 60000),
    label: 'Baseline detection',
    iterationNumber: 0,
    overallScore: 88,
    results: [
      { name: 'AIDetector', score: 92, pass: false },
      { name: 'NoteGPT',    score: 86, pass: false },
      { name: 'youscan',    score: 85, pass: false },
      { name: 'decopy.ai',  score: 81, pass: false },
      { name: 'aiscan24',   score: 89, pass: false },
      { name: 'CopyLeaks',  score: 93, pass: false },
    ],
  },
  {
    id: 'c-running',
    type: 'CURRENTLY_RUNNING',
    timestamp: new Date(Date.now() - 30000),
    message: 'Iteration 1 — running re-detection after rewrite…',
  },
]

const sessionCRevisions: Revision[] = [
  {
    label: 'Original',
    text: sessionCText,
    changedSentences: [],
  },
]

// ── Exported mock sessions ───────────────────────────────────────────────────
export const MOCK_SESSIONS: Session[] = [
  {
    id: 'session-c',
    title: 'The implementation of renewable energy…',
    createdAt: new Date(Date.now() - 15 * 60000),
    status: 'in-progress',
    overallScore: 88,
    nodes: sessionCNodes,
    revisions: sessionCRevisions,
  },
  {
    id: 'session-a',
    title: 'It is important to note that artificial…',
    createdAt: new Date(Date.now() - 2 * 3600000),
    status: 'complete-pass',
    overallScore: 18,
    nodes: sessionANodes,
    revisions: sessionARevisions,
  },
  {
    id: 'session-b',
    title: 'In conclusion, it is evident that the…',
    createdAt: new Date(Date.now() - 5 * 3600000),
    status: 'complete-fail',
    overallScore: 71,
    nodes: sessionBNodes,
    revisions: sessionBRevisions,
  },
]

export { DETECTORS }
