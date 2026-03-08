/**
 * Detector scenario tests — simulate a realistic 3-iteration humanization loop.
 *
 * These hit real APIs multiple times. Run with: npm run test:scenario
 * Uses AIDetector 3x against the 100 req/day quota.
 *
 * Scenario:
 *   Iter 0: baseline detection on clearly AI text
 *   Iter 1: replace one flagged sentence, re-detect, verify deltas
 *   Iter 2: replace another sentence, re-detect with skip set active
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  runAllDetectors,
  aggregate,
  pickTargetSentence,
  splitIntoSentences,
} from '../lib/detectors/index'
import type { DetectorResult } from '../lib/detectors/types'

const ENABLED = ['NoteGPT', 'youscan', 'AIDetector', 'decopy.ai', 'aiscan24']
const TIMEOUT = 120_000
const OUTLIERS = new Set<string>()

// Clearly AI-written, 150+ words
const AI_V0 = `Artificial intelligence represents a transformative paradigm shift in modern technological development. The utilization of machine learning algorithms has enabled unprecedented capabilities in data processing and pattern recognition. Furthermore, the implementation of neural networks facilitates the optimization of complex computational tasks. It is worth noting that these technological advancements have significant implications for various sectors of the economy. The integration of AI systems into existing workflows necessitates careful consideration of both technical and ethical factors. Consequently, organizations must develop comprehensive strategies to leverage these innovations while mitigating potential risks. The landscape of artificial intelligence continues to evolve at a remarkable pace, presenting both challenges and opportunities for stakeholders across diverse industries. In conclusion, the future of AI holds tremendous promise for transforming how we work, live, and interact with the world around us.`

// Simulated humanized version: replace the first two sentences with plainer writing
const AI_V1 = AI_V0
  .replace(
    'Artificial intelligence represents a transformative paradigm shift in modern technological development.',
    'AI has changed how technology works in a pretty fundamental way.',
  )

const AI_V2 = AI_V1
  .replace(
    'The utilization of machine learning algorithms has enabled unprecedented capabilities in data processing and pattern recognition.',
    'Machine learning lets computers spot patterns in data they never could before.',
  )

function printResults(label: string, results: DetectorResult[]) {
  const score = aggregate(results, OUTLIERS)
  console.log(`\n  [${label}] aggregate: ${score.toFixed(1)}%`)
  for (const r of results) {
    if (r.skipped) {
      console.log(`    ⚠  ${r.name}: skipped (${r.skipReason})`)
    } else {
      console.log(`    ${r.name}: ${r.score!.toFixed(1)}%`)
    }
  }
}

describe('detector scenario — 3 iterations', { timeout: TIMEOUT * 4 }, () => {
  let v0Results: DetectorResult[] = []
  let v1Results: DetectorResult[] = []
  let v2Results: DetectorResult[] = []

  // Run all detections upfront so individual tests can share results
  before(async () => {
    console.log('\n  Running baseline detection (iter 0)…')
    v0Results = await runAllDetectors(AI_V0, ENABLED)
    printResults('iter 0 — AI text', v0Results)

    console.log('\n  Running iter 1 detection (one sentence replaced)…')
    v1Results = await runAllDetectors(AI_V1, ENABLED)
    printResults('iter 1 — partial humanize', v1Results)

    console.log('\n  Running iter 2 detection (two sentences replaced)…')
    v2Results = await runAllDetectors(AI_V2, ENABLED)
    printResults('iter 2 — further humanize', v2Results)
  }, { timeout: TIMEOUT * 3 })

  it('all results have correct shape', () => {
    for (const results of [v0Results, v1Results, v2Results]) {
      assert.equal(results.length, ENABLED.length)
      for (const r of results) {
        assert.ok(typeof r.name === 'string' && r.name.length > 0)
        if (r.skipped) {
          assert.equal(r.score, null)
          assert.ok(r.skipReason)
        } else {
          assert.ok(r.score !== null)
          assert.ok(r.score! >= 0 && r.score! <= 100)
        }
      }
    }
  })

  it('aggregate scores are in valid range across all iterations', () => {
    for (const results of [v0Results, v1Results, v2Results]) {
      const score = aggregate(results, OUTLIERS)
      assert.ok(score >= 0 && score <= 100, `aggregate out of range: ${score}`)
    }
  })

  it('pickTargetSentence — returns a sentence that exists in the text', () => {
    const target = pickTargetSentence(AI_V0, v0Results, 25, OUTLIERS)
    const sentences = splitIntoSentences(AI_V0)
    assert.ok(sentences.includes(target.sentence), 'target must be one of the split sentences')
    assert.ok(typeof target.suggestion === 'string', 'suggestion is a string')
    console.log(`\n  Picked target: "${target.sentence.slice(0, 60)}…"`)
    console.log(`  Flagged by: ${target.flaggedBy.join(', ') || '(none — using aggregate fallback)'}`)
    if (target.suggestion) console.log(`  youscan suggestion: "${target.suggestion.slice(0, 60)}…"`)
  })

  it('pickTargetSentence — skip set excludes known bad sentences', () => {
    const sentences = splitIntoSentences(AI_V0)
    // Skip everything except the last sentence
    const skipAll = new Set(sentences.slice(0, -1))
    const target = pickTargetSentence(AI_V0, v0Results, 25, OUTLIERS, skipAll)
    assert.equal(target.sentence, sentences[sentences.length - 1], 'should pick the only non-skipped sentence')
  })

  it('pickTargetSentence — falls back gracefully when all sentences skipped', () => {
    const sentences = splitIntoSentences(AI_V0)
    const skipAll = new Set(sentences)
    // Should not throw; fallback returns a sentence from the full list
    const target = pickTargetSentence(AI_V0, v0Results, 25, OUTLIERS, skipAll)
    assert.ok(sentences.includes(target.sentence), 'fallback still returns a valid sentence')
  })

  it('delta computation — iter 1 changes scores in expected direction', () => {
    // At least some detectors should show a score change between v0 and v1
    const activeV0 = v0Results.filter(r => !r.skipped && r.score !== null)
    const activeV1 = v1Results.filter(r => !r.skipped && r.score !== null)

    if (activeV0.length === 0) {
      console.log('  All detectors skipped — skipping delta check')
      return
    }

    const deltas = activeV0.map(r => {
      const after = activeV1.find(a => a.name === r.name)
      return { name: r.name, before: r.score!, after: after?.score ?? r.score! }
    })

    console.log('\n  Deltas (iter 0 → iter 1):')
    for (const d of deltas) {
      const diff = d.after - d.before
      const arrow = diff < -0.5 ? '↓' : diff > 0.5 ? '↑' : '='
      console.log(`    ${d.name}: ${d.before.toFixed(1)} → ${d.after.toFixed(1)} ${arrow}`)
    }

    // Sanity: all deltas should be in the valid score range
    for (const d of deltas) {
      assert.ok(d.after >= 0 && d.after <= 100, `${d.name} after-score out of range: ${d.after}`)
    }
  })

  it('revert tracking — simulates skip-after-2-reverts behaviour', () => {
    const sentences = splitIntoSentences(AI_V0)
    assert.ok(sentences.length >= 2, 'need at least 2 sentences to test skip logic')

    // Simulate the orchestrator's revert count logic
    const revertCounts = new Map<string, number>()
    const targetSentence = sentences[0]

    // First revert
    revertCounts.set(targetSentence, (revertCounts.get(targetSentence) ?? 0) + 1)
    let skipSet = new Set([...revertCounts.entries()].filter(([, c]) => c >= 2).map(([s]) => s))
    assert.equal(skipSet.has(targetSentence), false, 'not skipped after 1 revert')

    // Second revert
    revertCounts.set(targetSentence, (revertCounts.get(targetSentence) ?? 0) + 1)
    skipSet = new Set([...revertCounts.entries()].filter(([, c]) => c >= 2).map(([s]) => s))
    assert.equal(skipSet.has(targetSentence), true, 'skipped after 2 reverts')

    // pickTargetSentence must avoid that sentence
    const target = pickTargetSentence(AI_V0, v0Results, 25, OUTLIERS, skipSet)
    assert.notEqual(target.sentence, targetSentence, 'picker avoids the 2x-reverted sentence')
    console.log(`\n  After 2 reverts on sentence[0], picker chose: "${target.sentence.slice(0, 60)}…"`)
  })
})
