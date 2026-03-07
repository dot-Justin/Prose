import { Revision } from '../../types'

interface Props {
  revision: Revision
  highlightChanges: boolean
}

export function RevisionViewer({ revision, highlightChanges }: Props) {
  if (!highlightChanges || revision.changedSentences.length === 0) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        lineHeight: 1.8,
        color: 'var(--color-text)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {revision.text}
      </div>
    )
  }

  // Split text into segments, highlighting changed sentences
  let remaining = revision.text
  const segments: { text: string; highlight: boolean }[] = []

  // Sort changed sentences by their position in text
  const sortedChanges = [...revision.changedSentences].sort((a, b) => {
    const ai = remaining.indexOf(a)
    const bi = remaining.indexOf(b)
    return ai - bi
  })

  let workingText = revision.text
  for (const changed of sortedChanges) {
    const idx = workingText.indexOf(changed)
    if (idx === -1) continue
    if (idx > 0) {
      segments.push({ text: workingText.slice(0, idx), highlight: false })
    }
    segments.push({ text: changed, highlight: true })
    workingText = workingText.slice(idx + changed.length)
  }
  if (workingText.length > 0) {
    segments.push({ text: workingText, highlight: false })
  }

  if (segments.length === 0) {
    segments.push({ text: revision.text, highlight: false })
  }

  void remaining

  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      lineHeight: 1.8,
      color: 'var(--color-text)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <span key={i} style={{
            background: 'var(--color-accent-dim)',
            color: 'var(--color-text)',
            borderRadius: '2px',
            padding: '0 1px',
          }}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </div>
  )
}
