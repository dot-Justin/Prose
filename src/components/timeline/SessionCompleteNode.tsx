import { SessionCompleteNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'
import { scoreToColor, scoreLabel } from '../../utils/formatters'

interface Props { node: NodeType; index: number }

export function SessionCompleteNode({ node, index }: Props) {
  return (
    <TimelineNodeWrapper index={index}>
      <div style={{ padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '10px',
        }}>
          Session complete
        </div>

        {/* Pass/fail banner */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '14px',
          background: node.passed ? 'var(--color-green-dim)' : 'var(--color-red-dim)',
          border: `1px solid ${node.passed ? 'rgba(76,175,125,0.3)' : 'rgba(201,90,74,0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            fontSize: '20px',
            color: node.passed ? 'var(--color-green)' : 'var(--color-red)',
          }}>
            {node.passed ? '✓' : '✗'}
          </span>
          <div>
            <div style={{
              fontWeight: 600,
              fontSize: '14px',
              color: node.passed ? 'var(--color-green)' : 'var(--color-red)',
              fontFamily: 'var(--font-mono)',
            }}>
              {node.passed
                ? 'All detectors below target'
                : `Reached revision limit`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {node.passed
                ? `Final aggregate: ${scoreLabel(node.finalScore)} · ${node.totalRewrites} rewrite${node.totalRewrites !== 1 ? 's' : ''} applied`
                : `Best aggregate: ${scoreLabel(node.bestScore ?? node.finalScore)} · ${node.totalRewrites} rewrite${node.totalRewrites !== 1 ? 's' : ''} applied`}
            </div>
          </div>
        </div>

        {/* Before / after table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Detector', 'Before', 'After'].map(h => (
                <th key={h} style={{
                  textAlign: h === 'Detector' ? 'left' : 'right',
                  padding: '4px 8px',
                  color: 'var(--color-text-subtle)',
                  fontWeight: 500,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {node.beforeResults.map((before, i) => {
              const after = node.afterResults[i]
              return (
                <tr key={before.name} style={{ borderBottom: '1px solid var(--color-border)22' }}>
                  <td style={{ padding: '5px 8px', color: 'var(--color-text-muted)' }}>{before.name}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: scoreToColor(before.score) }}>
                    {scoreLabel(before.score)}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: scoreToColor(after.score), fontWeight: 600 }}>
                    {scoreLabel(after.score)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TimelineNodeWrapper>
  )
}
