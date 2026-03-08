/**
 * Detector smoke tests — one live call per detector.
 *
 * These hit real APIs. Run with: npm run test:smoke
 * AIDetector counts against the 100 req/day quota.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runNoteGPT } from '../lib/detectors/notegpt'
import { runYouScan } from '../lib/detectors/youscan'
import { runAIDetector } from '../lib/detectors/aidetector'
import { runDecopy } from '../lib/detectors/decopy'
import { runAIScan24 } from '../lib/detectors/aiscan24'
import { runAllDetectors, aggregate } from '../lib/detectors/index'
import type { DetectorResult } from '../lib/detectors/types'

// Clearly AI-written, 130+ words, satisfies aiscan24 80-word minimum
const AI_TEXT = `Artificial intelligence represents a transformative paradigm shift in modern technological development. The utilization of machine learning algorithms has enabled unprecedented capabilities in data processing and pattern recognition. Furthermore, the implementation of neural networks facilitates the optimization of complex computational tasks. It is worth noting that these technological advancements have significant implications for various sectors of the economy. The integration of AI systems into existing workflows necessitates careful consideration of both technical and ethical factors. Consequently, organizations must develop comprehensive strategies to leverage these innovations while mitigating potential risks and challenges. The landscape of artificial intelligence continues to evolve at a remarkable pace, presenting both opportunities and challenges for stakeholders across diverse industries. In conclusion, the future of artificial intelligence holds tremendous promise for transforming how we work and live.`

const TIMEOUT = 60_000

function assertValidResult(result: DetectorResult) {
  if (result.skipped) {
    assert.equal(result.score, null, 'skipped → score must be null')
    assert.ok(result.skipReason?.length, 'skipped → skipReason must be set')
    console.log(`  ⚠  ${result.name} skipped: ${result.skipReason}`)
  } else {
    assert.notEqual(result.score, null, 'score must not be null')
    assert.ok(result.score! >= 0 && result.score! <= 100, `score must be 0–100, got ${result.score}`)
    console.log(`  ✓  ${result.name}: ${result.score!.toFixed(1)}%`)
  }
}

describe('detector smoke tests', { timeout: TIMEOUT * 6 }, () => {
  it('NoteGPT — returns score + flaggedSentences', { timeout: TIMEOUT }, async () => {
    const result = await runNoteGPT(AI_TEXT)
    assertValidResult(result)
    if (!result.skipped) {
      assert.ok(Array.isArray(result.flaggedSentences), 'flaggedSentences is array')
    }
  })

  it('youscan — returns score + suggestions', { timeout: TIMEOUT }, async () => {
    const result = await runYouScan(AI_TEXT)
    assertValidResult(result)
    if (!result.skipped) {
      assert.ok(Array.isArray(result.suggestions), 'suggestions is array')
    }
  })

  it('AIDetector — returns score + sentence stream', { timeout: TIMEOUT }, async () => {
    const result = await runAIDetector(AI_TEXT)
    assertValidResult(result)
    if (!result.skipped) {
      assert.ok(Array.isArray(result.aiDetectorSentences), 'aiDetectorSentences is array')
      console.log(`     sentence count: ${result.aiDetectorSentences!.length}`)
    }
  })

  it('decopy.ai — returns score + per-sentence scores', { timeout: TIMEOUT }, async () => {
    const result = await runDecopy(AI_TEXT)
    assertValidResult(result)
    if (!result.skipped) {
      assert.ok(Array.isArray(result.sentences), 'sentences is array')
      // decopy scores are 0-1 internally, converted to 0-100
      assert.ok(result.score! >= 0 && result.score! <= 100)
    }
  })

  it('aiscan24 — returns score (80+ word requirement)', { timeout: TIMEOUT }, async () => {
    const result = await runAIScan24(AI_TEXT)
    assertValidResult(result)
    // Also verify short text is correctly rejected
    const short = await runAIScan24('Too short.')
    assert.equal(short.skipped, true, 'short text must be skipped')
    assert.match(short.skipReason!, /too short/i)
  })

  it('runAllDetectors — aggregates all enabled detectors', { timeout: TIMEOUT }, async () => {
    const all = ['NoteGPT', 'youscan', 'AIDetector', 'decopy.ai', 'aiscan24']
    const results = await runAllDetectors(AI_TEXT, all)

    assert.equal(results.length, all.length, 'one result per detector')

    for (const r of results) {
      assertValidResult(r)
    }

    const score = aggregate(results)
    assert.ok(score >= 0 && score <= 100, `aggregate in range: ${score}`)
    console.log(`\n  Aggregate (active detectors): ${score.toFixed(1)}%`)

    const active = results.filter(r => !r.skipped)
    const skipped = results.filter(r => r.skipped)
    console.log(`  Active: ${active.length}  Skipped: ${skipped.length}`)
  })
})
