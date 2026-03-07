import { randomUUID } from 'crypto'
import { Emitter } from './sse'
import { Settings, StoredSession, StoredRevision, saveSession } from './storage'
import { generateTitle, rewriteWithClaude } from './claude'
import {
  runAllDetectors,
  aggregate,
  toFrontendResults,
  pickTargetSentence,
  DetectorResult,
} from './detectors/index'

function makeId() {
  return randomUUID()
}

function now() {
  return new Date().toISOString()
}

export async function runOrchestrator(
  session: StoredSession,
  emit: Emitter,
  settings: Settings,
): Promise<void> {
  const {
    inputText,
    style,
    requirements,
    maxRevisions,
    targetDetectionPct,
  } = session

  let workingText = inputText
  const enabledDetectors = settings.enabledDetectors
  const outliers = new Set<string>()
  const failStreak = new Map<string, number>()
  let lastResults: DetectorResult[] = []
  let beforeResults: DetectorResult[] = []
  let totalRewrites = 0
  let bestScore = 100
  let revNum = 1
  let prevAggScore = 100

  // Helper: append node to session JSON and emit it
  function emitNode(type: string, payload: Record<string, unknown>) {
    const node = { id: makeId(), type, timestamp: now(), ...payload }
    session.nodes.push(node)
    saveSession(session)
    emit(type, node)
  }

  function emitRunning(message: string) {
    // Replace last CURRENTLY_RUNNING node or push new one
    const last = session.nodes[session.nodes.length - 1] as { type?: string } | undefined
    if (last?.type === 'CURRENTLY_RUNNING') {
      session.nodes.pop()
    }
    const node = { id: makeId(), type: 'CURRENTLY_RUNNING', timestamp: now(), message }
    session.nodes.push(node)
    saveSession(session)
    emit('CURRENTLY_RUNNING', node)
  }

  // ── SESSION_STARTED ─────────────────────────────────────────────────────────
  const wordCount = inputText.trim().split(/\s+/).length
  emitNode('SESSION_STARTED', {
    wordCount,
    style: style || 'General',
    requirements,
    maxRevisions,
    targetDetectionPct,
  })

  // ── Baseline detection ──────────────────────────────────────────────────────
  emitRunning('Running baseline detection…')
  lastResults = await runAllDetectors(workingText, enabledDetectors)
  beforeResults = [...lastResults]
  const baseline = aggregate(lastResults, outliers)
  bestScore = Math.min(bestScore, baseline)
  prevAggScore = baseline

  emitNode('DETECTION_RUN', {
    label: 'Baseline detection',
    results: toFrontendResults(lastResults, targetDetectionPct, outliers),
    overallScore: Math.round(baseline),
    iterationNumber: 0,
  })

  // Update revisions with original
  session.revisions = [{ label: 'Original', text: inputText, changedSentences: [] }]
  saveSession(session)

  if (baseline <= targetDetectionPct) {
    emitNode('SESSION_COMPLETE', {
      passed: true,
      beforeResults: toFrontendResults(beforeResults, targetDetectionPct),
      afterResults: toFrontendResults(lastResults, targetDetectionPct, outliers),
      totalRewrites,
      finalScore: Math.round(baseline),
    })
    session.status = 'complete-pass'
    session.overallScore = Math.round(baseline)
    saveSession(session)
    return
  }

  // ── Iteration loop ──────────────────────────────────────────────────────────
  for (let i = 1; i <= maxRevisions; i++) {
    emitRunning(`Iteration ${i} — selecting target sentence…`)

    const target = pickTargetSentence(workingText, lastResults, targetDetectionPct, outliers)

    emitNode('ITERATION_START', {
      iterationNumber: i,
      maxRevisions,
      targetSentence: target.sentence,
      flaggedBy: target.flaggedBy,
      suggestion: target.suggestion,
    })

    // ── Rewrite ───────────────────────────────────────────────────────────────
    emitRunning(`Iteration ${i} — rewriting with Claude…`)

    let rewritten: string
    let pattern: string
    try {
      const result = await rewriteWithClaude(
        workingText,
        target.sentence,
        target.suggestion,
        style,
        requirements,
        settings.claudeApiKey,
      )
      rewritten = result.rewritten
      pattern = result.pattern
    } catch (err) {
      emitNode('SESSION_COMPLETE', {
        passed: false,
        interrupted: true,
        error: String(err),
        beforeResults: toFrontendResults(beforeResults, targetDetectionPct),
        afterResults: toFrontendResults(lastResults, targetDetectionPct, outliers),
        totalRewrites,
        finalScore: Math.round(aggregate(lastResults, outliers)),
        bestScore: Math.round(bestScore),
      })
      session.status = 'complete-fail'
      session.overallScore = Math.round(aggregate(lastResults, outliers))
      saveSession(session)
      return
    }

    emitNode('REWRITE', {
      original: target.sentence,
      rewritten,
      pattern,
    })

    // ── Re-detect ─────────────────────────────────────────────────────────────
    const candidateText = workingText.replace(target.sentence, rewritten)
    emitRunning(`Iteration ${i} — re-detecting…`)

    const newResults = await runAllDetectors(candidateText, enabledDetectors)

    // Compute deltas (only non-skipped, non-outlier detectors)
    const deltas = lastResults
      .filter(r => !outliers.has(r.name) && r.score !== null)
      .map(r => {
        const after = newResults.find(n => n.name === r.name)
        return {
          detector: r.name,
          before: Math.round(r.score ?? 0),
          after: Math.round(after?.score ?? r.score ?? 0),
        }
      })

    const improved = deltas.filter(d => d.after < d.before).length
    const worsened = deltas.filter(d => d.after > d.before).length
    const kept = improved >= worsened

    emitNode('REDETECT_RESULT', {
      deltas,
      kept,
      summary: `${improved} improved, ${worsened} worsened`,
    })

    if (kept) {
      workingText = candidateText
      lastResults = newResults
      totalRewrites++
      const afterScore = aggregate(lastResults, outliers)

      // Add revision
      const revision: StoredRevision = {
        label: `Rev ${revNum++} — ${Math.round(prevAggScore)}% → ${Math.round(afterScore)}%`,
        text: workingText,
        changedSentences: [rewritten],
      }
      session.revisions.push(revision)
      prevAggScore = afterScore
      bestScore = Math.min(bestScore, afterScore)
    }

    // ── Outlier check ─────────────────────────────────────────────────────────
    for (const result of lastResults) {
      if (outliers.has(result.name) || result.skipped || result.score === null) continue

      const othersAllPass = lastResults
        .filter(r => r.name !== result.name && !outliers.has(r.name) && !r.skipped && r.score !== null)
        .every(r => (r.score ?? 0) <= targetDetectionPct)

      if (result.score > targetDetectionPct && othersAllPass) {
        const streak = (failStreak.get(result.name) ?? 0) + 1
        failStreak.set(result.name, streak)
        if (streak >= 3) {
          outliers.add(result.name)
          emitNode('OUTLIER_IGNORED', {
            detectorName: result.name,
            reason: `Stuck above ${targetDetectionPct}% for 3 iterations while all others passed`,
          })
        }
      } else {
        failStreak.set(result.name, 0)
      }
    }

    // ── Pass check ────────────────────────────────────────────────────────────
    const activeResults = lastResults.filter(r => !outliers.has(r.name) && !r.skipped && r.score !== null)
    const currentScore = aggregate(lastResults, outliers)
    bestScore = Math.min(bestScore, currentScore)

    if (activeResults.every(r => (r.score ?? 0) <= targetDetectionPct)) {
      emitNode('SESSION_COMPLETE', {
        passed: true,
        beforeResults: toFrontendResults(beforeResults, targetDetectionPct),
        afterResults: toFrontendResults(lastResults, targetDetectionPct, outliers),
        totalRewrites,
        finalScore: Math.round(currentScore),
      })
      session.status = 'complete-pass'
      session.overallScore = Math.round(currentScore)
      saveSession(session)
      return
    }
  }

  // ── Reached max revisions ─────────────────────────────────────────────────
  const finalScore = aggregate(lastResults, outliers)
  emitNode('SESSION_COMPLETE', {
    passed: false,
    beforeResults: toFrontendResults(beforeResults, targetDetectionPct),
    afterResults: toFrontendResults(lastResults, targetDetectionPct, outliers),
    totalRewrites,
    finalScore: Math.round(finalScore),
    bestScore: Math.round(bestScore),
  })
  session.status = 'complete-fail'
  session.overallScore = Math.round(finalScore)
  saveSession(session)
}
