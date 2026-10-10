import { describe, expect, it, vi } from 'vitest'
import { hasInstrumentTranspose } from '@/lib/scores'
import { MAX_SCORE_BYTES, readScoreMetadata, validateScoreImport } from '@/lib/scores/validation'
import { SAMPLE_SCORE } from '@/lib/scores/sample'

describe('shared MusicXML validation', () => {
  it('reads a namespaced key without relying on text matching', () => {
    const xml = SAMPLE_SCORE.replace(
      '<score-partwise version="4.0">',
      '<score-partwise xmlns="urn:musicxml" version="4.0">',
    )
    expect(readScoreMetadata(xml)).toEqual({ fifths: 0, hasInstrumentTranspose: false })
  })
  it.each([
    '<score-partwise>',
    '<other><!-- <score-partwise --> </other>',
    '<score-partwise><part id="missing"><measure/></part></score-partwise>',
    SAMPLE_SCORE.replace('<part id="P1">', '<part id="unknown">'),
    SAMPLE_SCORE + '<other/>',
  ])('rejects malformed or structurally inconsistent XML', (xml) => {
    expect(() => validateScoreImport(xml)).toThrow()
  })
  it('applies the size limit to bytes, including non-ASCII text', () => {
    expect(() => validateScoreImport('é'.repeat(MAX_SCORE_BYTES / 2 + 1))).toThrow('fileTooLarge')
  })
  it('detects instrument metadata without a browser DOM', () => {
    const xml = SAMPLE_SCORE.replace(
      '</attributes>',
      '<transpose><chromatic>-2</chromatic></transpose></attributes>',
    )
    vi.stubGlobal('DOMParser', undefined)
    try {
      expect(hasInstrumentTranspose(xml)).toBe(true)
      expect(hasInstrumentTranspose(SAMPLE_SCORE)).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
