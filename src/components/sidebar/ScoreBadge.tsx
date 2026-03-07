import { scoreToColor, scoreLabel } from '../../utils/formatters'

interface Props {
  score: number
}

export function ScoreBadge({ score }: Props) {
  const color = scoreToColor(score)

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 600,
      color,
      background: `${color}18`,
      border: `1px solid ${color}30`,
      borderRadius: '4px',
      padding: '1px 6px',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {scoreLabel(score)}
    </span>
  )
}
