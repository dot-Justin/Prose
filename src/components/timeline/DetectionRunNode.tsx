import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { CaretDown, CheckCircle, XCircle } from '@phosphor-icons/react'
import { DetectionRunNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'
import { scoreToColor, scoreLabel } from '../../utils/formatters'

interface Props { node: NodeType; index: number }

export function DetectionRunNode({ node, index }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasAnimated = useRef(false)

  const failCount = node.results.filter(r => !r.pass && !r.skipped).length
  const errorCount = node.results.filter(r => r.skipped).length
  const detectorNames = node.results.slice(0, 3).map(r => r.name).join(' · ')

  function handleExpand() {
    if (!hasAnimated.current) hasAnimated.current = true
    setExpanded(e => !e)
  }

  return (
    <TimelineNodeWrapper index={index}>
      <div style={{
        padding: '14px 0',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {/* Header row */}
        <button
          onClick={handleExpand}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}>
              {node.label}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: scoreToColor(node.overallScore), fontWeight: 600 }}>
                {scoreLabel(node.overallScore)}
              </span>
              {' · '}
              <span>{failCount}/{node.results.length} failing</span>
              {errorCount > 0 && (
                <span style={{ color: 'var(--color-text-subtle)' }}>
                  {' · '}{errorCount} errored
                </span>
              )}
              {!expanded && (
                <span style={{ color: 'var(--color-text-subtle)', marginLeft: '4px' }}>
                  · {detectorNames} …
                </span>
              )}
            </div>
          </div>
          <CaretDown
            size={14}
            style={{
              flexShrink: 0,
              color: 'var(--color-text-subtle)',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {/* Expanded table */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginTop: '12px' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Detector', 'Score', '%', 'Pass'].map(h => (
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
                {node.results.map(result => {
                  const color = result.skipped ? 'var(--color-text-subtle)' : scoreToColor(result.score)
                  return (
                    <tr key={result.name} style={{ borderBottom: '1px solid var(--color-border)22', opacity: result.skipped ? 0.5 : 1 }}>
                      <td style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>
                        {result.name}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {!result.skipped && (
                          <div style={{
                            width: '100px',
                            height: '4px',
                            background: 'var(--color-surface-2)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            marginLeft: 'auto',
                          }}>
                            <motion.div
                              initial={{ width: hasAnimated.current ? `${result.score}%` : '0%' }}
                              animate={{ width: `${result.score}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
                              style={{
                                height: '100%',
                                background: color,
                                borderRadius: '2px',
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color, fontWeight: 600 }}>
                        {result.skipped ? '—' : scoreLabel(result.score)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {result.skipped ? (
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-subtle)' }}>ERR</span>
                        ) : result.pass ? (
                          <CheckCircle size={14} color="var(--color-green)" />
                        ) : (
                          <XCircle size={14} color="var(--color-red)" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </TimelineNodeWrapper>
  )
}
