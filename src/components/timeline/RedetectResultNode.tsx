import { ArrowDown, ArrowUp, CheckCircle, Minus, XCircle } from '@phosphor-icons/react'
import { RedetectResultNode as NodeType } from '../../types'
import { TimelineNodeWrapper } from './TimelineNodeWrapper'
import { deltaColor } from '../../utils/formatters'

interface Props { node: NodeType; index: number }

export function RedetectResultNode({ node, index }: Props) {
  function deltaIcon(before: number, after: number, color: string) {
    const diff = after - before
    if (diff === 0) return <Minus size={10} color={color} />
    return diff < 0 ? <ArrowDown size={10} color={color} /> : <ArrowUp size={10} color={color} />
  }

  return (
    <TimelineNodeWrapper index={index}>
      <div style={{
        padding: '14px 0',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
        }}>
          Re-detection
        </div>

        {/* Delta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {node.deltas.map(d => {
            const color = deltaColor(d.before, d.after)
            const diff = Math.abs(d.after - d.before)
            return (
              <span key={d.detector} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color,
                background: `${color}18`,
                border: `1px solid ${color}30`,
                borderRadius: '4px',
                padding: '2px 7px',
                whiteSpace: 'nowrap',
              }}>
                <span>{d.detector}</span>
                {deltaIcon(d.before, d.after, color)}
                <span>{diff}pt</span>
              </span>
            )
          })}
        </div>

        {/* Decision */}
        <div style={{
          fontSize: '13px',
          fontFamily: 'var(--font-mono)',
          color: node.kept ? 'var(--color-green)' : 'var(--color-red)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {node.kept ? <CheckCircle size={14} color="var(--color-green)" /> : <XCircle size={14} color="var(--color-red)" />}
          <span>{node.kept ? 'Kept' : 'Reverted'}</span>
          <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
            — {node.summary}
          </span>
        </div>
      </div>
    </TimelineNodeWrapper>
  )
}
