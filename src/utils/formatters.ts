export function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function truncateTitle(text: string, maxLen = 40): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen).trimEnd() + '…' : trimmed
}

export function scoreToColor(score: number): string {
  if (score < 25) return 'var(--color-green)'
  if (score <= 60) return 'var(--color-yellow)'
  return 'var(--color-red)'
}

export function scoreLabel(score: number): string {
  return `${Math.round(score)}%`
}

export function deltaIcon(before: number, after: number): string {
  const diff = after - before
  if (diff === 0) return '→'
  return diff < 0 ? '↓' : '↑'
}

export function deltaColor(before: number, after: number): string {
  return after < before ? 'var(--color-green)' : after > before ? 'var(--color-red)' : 'var(--color-text-muted)'
}
