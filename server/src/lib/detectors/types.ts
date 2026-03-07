export interface DetectorSentence {
  content: string
  score: number  // 0-1
}

export interface AISentence {
  text: string
  ai_probability: number  // 0-100
  reason?: string
}

export interface YouScanSuggestion {
  original_phrase: string
  more_human_alternative: string
}

export interface DetectorResult {
  name: string
  score: number | null         // 0-100, null if skipped/failed
  skipped?: boolean
  skipReason?: string
  flaggedSentences?: string[]  // NoteGPT: full sentence strings
  sentences?: DetectorSentence[]  // decopy: per-sentence with 0-1 score
  aiDetectorSentences?: AISentence[]  // AIDetector: per-sentence with 0-100 score
  suggestions?: YouScanSuggestion[]  // youscan
}
