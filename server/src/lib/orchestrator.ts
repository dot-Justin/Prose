import { randomUUID } from 'crypto'
import { Emitter } from './sse'
import { Settings, StoredSession, StoredRevision, saveSession } from './storage'
import { isClaudeAuthError, loadSkillMd, rewriteSentence, rewriteFullText } from './claude'
import {
  runAllDetectors,
  aggregate,
  toFrontendResults,
  pickTopNSentences,
  splitIntoSentences,
  DetectorResult,
} from './detectors/index'

const BATCH_SIZE = 5

const skillMd = loadSkillMd()

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
  const revertCounts = new Map<string, number>()
  const attemptCounts = new Map<string, number>()
  const previousRewrites = new Map<string, string[]>()
  let stallCount = 0

  for (let i = 1; i <= maxRevisions; i++) {
    // ── Full-text pass when stalled ──────────────────────────────────────────
    if (stallCount >= 2) {
      emitRunning(`Iteration ${i} — running full-text humanization pass…`)
      stallCount = 0

      const currentAgg = aggregate(lastResults, outliers)
      let newFullText = workingText
      try {
        newFullText = await rewriteFullText(workingText, currentAgg, style, requirements, skillMd, settings)
      } catch (_err) {
        // fall through to normal sentence pass
      }

      if (newFullText !== workingText) {
        const oldSents = splitIntoSentences(workingText)
        const newSents = splitIntoSentences(newFullText)
        const sentenceCount = Math.max(oldSents.length, newSents.length)

        emitNode('REWRITE', { rewrites: [], isFullPass: true, sentenceCount })

        emitRunning(`Iteration ${i} — re-detecting…`)
        const newResults = await runAllDetectors(newFullText, enabledDetectors)
        const newAgg2 = aggregate(newResults, outliers)
        const oldAgg2 = aggregate(lastResults, outliers)
        const fullPassKept = newAgg2 < oldAgg2

        const deltas2 = lastResults
          .filter(r => !outliers.has(r.name) && r.score !== null)
          .map(r => {
            const after = newResults.find(n => n.name === r.name)
            return { detector: r.name, before: Math.round(r.score ?? 0), after: Math.round(after?.score ?? r.score ?? 0) }
          })
        const improved2 = deltas2.filter(d => d.after < d.before).length
        const worsened2 = deltas2.filter(d => d.after > d.before).length
        emitNode('REDETECT_RESULT', { deltas: deltas2, kept: fullPassKept, summary: `${improved2} improved, ${worsened2} worsened` })

        if (fullPassKept) {
          workingText = newFullText
          lastResults = newResults
          totalRewrites += sentenceCount
          const afterScore2 = aggregate(lastResults, outliers)
          session.revisions.push({
            label: `Rev ${revNum++} — ${Math.round(prevAggScore)}% → ${Math.round(afterScore2)}%`,
            text: workingText,
            changedSentences: newSents,
          })
          prevAggScore = afterScore2
          bestScore = Math.min(bestScore, afterScore2)
        }

        // Outlier + pass check after full-text pass
        for (const result of lastResults) {
          if (outliers.has(result.name) || result.skipped || result.score === null) continue
          const peers = lastResults.filter(r => r.name !== result.name && !outliers.has(r.name) && !r.skipped && r.score !== null)
          const othersAllPass = peers.length >= 2 && peers.every(r => (r.score ?? 0) <= targetDetectionPct)
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
        const activeAfterFull = lastResults.filter(r => !outliers.has(r.name) && !r.skipped && r.score !== null)
        const scoreAfterFull = aggregate(lastResults, outliers)
        bestScore = Math.min(bestScore, scoreAfterFull)
        if (activeAfterFull.length > 0 && activeAfterFull.every(r => (r.score ?? 0) <= targetDetectionPct)) {
          emitNode('SESSION_COMPLETE', {
            passed: true,
            beforeResults: toFrontendResults(beforeResults, targetDetectionPct),
            afterResults: toFrontendResults(lastResults, targetDetectionPct, outliers),
            totalRewrites,
            finalScore: Math.round(scoreAfterFull),
          })
          session.status = 'complete-pass'
          session.overallScore = Math.round(scoreAfterFull)
          saveSession(session)
          return
        }
      }
      continue
    }

    emitRunning(`Iteration ${i} — selecting target sentences…`)

    const skipSentences = new Set(
      [...attemptCounts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([s]) => s)
    )
    const targets = pickTopNSentences(workingText, lastResults, targetDetectionPct, outliers, skipSentences, BATCH_SIZE)

    for (const t of targets) {
      attemptCounts.set(t.sentence, (attemptCounts.get(t.sentence) ?? 0) + 1)
    }

    emitNode('ITERATION_START', {
      iterationNumber: i,
      maxRevisions,
      targets: targets.map(t => ({ sentence: t.sentence, flaggedBy: t.flaggedBy, suggestion: t.suggestion })),
    })

    // ── Rewrite all targets in parallel ───────────────────────────────────────
    emitRunning(`Iteration ${i} — rewriting with Claude…`)

    let rewriteResults: Array<{ rewritten: string; pattern: string }>
    try {
      rewriteResults = await Promise.all(
        targets.map(t => rewriteSentence(
          workingText,
          t.sentence,
          t.suggestion,
          style,
          requirements,
          skillMd,
          settings,
          previousRewrites.get(t.sentence) ?? [],
        ))
      )
    } catch (err) {
      const expiredToken = isClaudeAuthError(err)
      if (expiredToken) {
        emit('CONNECTION_ERROR', { message: 'Claude token expired — update it in Settings' })
      }

      emitNode('SESSION_COMPLETE', {
        passed: false,
        interrupted: true,
        expiredToken,
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

    const rewrites = targets.map((t, idx) => ({
      original: t.sentence,
      rewritten: rewriteResults[idx].rewritten,
      pattern: rewriteResults[idx].pattern,
    }))

    emitNode('REWRITE', { rewrites })

    // ── Apply all rewrites to candidate, then re-detect once ─────────────────
    let candidateText = workingText
    for (const r of rewrites) {
      if (r.rewritten !== r.original) {
        candidateText = candidateText.replace(r.original, r.rewritten)
      }
    }

    emitRunning(`Iteration ${i} — re-detecting…`)
    const newResults = await runAllDetectors(candidateText, enabledDetectors)

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
    const newAgg = aggregate(newResults, outliers)
    const oldAgg = aggregate(lastResults, outliers)
    const kept = newAgg < oldAgg

    emitNode('REDETECT_RESULT', {
      deltas,
      kept,
      summary: `${improved} improved, ${worsened} worsened`,
    })

    // Track rewrites per sentence
    for (const r of rewrites) {
      const prev = previousRewrites.get(r.original) ?? []
      if (r.rewritten !== r.original) previousRewrites.set(r.original, [...prev, r.rewritten])
      if (!kept) {
        revertCounts.set(r.original, (revertCounts.get(r.original) ?? 0) + 1)
      }
    }

    if (!kept) {
      stallCount++
    }

    if (kept) {
      const improvement = oldAgg - newAgg
      stallCount = improvement < 3 ? stallCount + 1 : 0
      workingText = candidateText
      lastResults = newResults
      const changedSentences = rewrites.filter(r => r.rewritten !== r.original).map(r => r.rewritten)
      totalRewrites += changedSentences.length
      const afterScore = aggregate(lastResults, outliers)

      // Transfer attempt counts to new sentence text so skip logic fires correctly next iteration
      for (const r of rewrites) {
        if (r.rewritten !== r.original) {
          const count = attemptCounts.get(r.original) ?? 0
          attemptCounts.delete(r.original)
          attemptCounts.set(r.rewritten, count)
          previousRewrites.delete(r.original)
        }
      }

      const revision: StoredRevision = {
        label: `Rev ${revNum++} — ${Math.round(prevAggScore)}% → ${Math.round(afterScore)}%`,
        text: workingText,
        changedSentences,
      }
      session.revisions.push(revision)
      prevAggScore = afterScore
      bestScore = Math.min(bestScore, afterScore)
    }

    // ── Outlier check ─────────────────────────────────────────────────────────
    for (const result of lastResults) {
      if (outliers.has(result.name) || result.skipped || result.score === null) continue

      const peers = lastResults.filter(r => r.name !== result.name && !outliers.has(r.name) && !r.skipped && r.score !== null)
      const othersAllPass = peers.length >= 2 && peers.every(r => (r.score ?? 0) <= targetDetectionPct)

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

    if (activeResults.length > 0 && activeResults.every(r => (r.score ?? 0) <= targetDetectionPct)) {
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
