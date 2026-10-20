import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import {
  appendMeasure,
  deleteMeasure,
  duplicateMeasure,
  insertMeasureAfter,
  scoreMeasures,
} from '@/lib/scores/measures'
import { indexScore } from '@/lib/scores/indexScore'
import { SAMPLE_SCORE } from '@/lib/scores/sample'

const read = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml')
const piano = readFileSync('tests/fixtures/scores/polyphonic-piano.musicxml', 'utf8')

describe('score measures', () => {
  it('inserts a rest immediately after the selected measure without changing following notes', () => {
    const output = read(insertMeasureAfter(SAMPLE_SCORE, 0))
    expect(output.querySelectorAll('measure')).toHaveLength(3)
    expect(output.querySelector('measure[number="2"] rest')?.getAttribute('measure')).toBe('yes')
    expect(output.querySelector('measure[number="3"] pitch > step')?.textContent).toBe('D')
    expect(output.querySelectorAll('pitch')).toHaveLength(7)
  })

  it('duplicates notes and rhythm after the selected measure and keeps later measures intact', () => {
    const xml = duplicateMeasure(SAMPLE_SCORE, 0)
    const output = read(xml)
    expect(output.querySelectorAll('pitch')).toHaveLength(11)
    const pitches = (number: string) =>
      Array.from(
        output.querySelectorAll(`measure[number="${number}"] pitch`),
        (node) => node.textContent,
      )
    expect(pitches('1')).toEqual(pitches('2'))
    expect(pitches('3')).toEqual(['D5', 'C5', 'B4'])
    expect(output.querySelector('measure[number="2"] print')).toBeNull()
    expect(() => appendMeasure(xml)).not.toThrow()
  })

  it('does not copy IDs or orphan ties when duplicating', () => {
    expect(() =>
      duplicateMeasure(
        SAMPLE_SCORE.replace('<note default-x="80"', '<note id="note-1" default-x="80"'),
        0,
      ),
    ).toThrow('unsupportedMeasureStructure')
    expect(() =>
      duplicateMeasure(
        SAMPLE_SCORE.replace('<type>quarter</type>', '<tie type="start"/><type>quarter</type>'),
        0,
      ),
    ).toThrow('unsupportedMeasureStructure')
    expect(() => insertMeasureAfter(SAMPLE_SCORE, 99)).toThrow('measureMissing')
  })
  it('keeps one declaration when the browser serializer already preserves it', () => {
    const serialize = XMLSerializer.prototype.serializeToString
    const spy = vi
      .spyOn(XMLSerializer.prototype, 'serializeToString')
      .mockImplementationOnce(function (this: XMLSerializer, node) {
        return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize.call(this, node)}`
      })
    try {
      const xml = appendMeasure(SAMPLE_SCORE)
      expect(xml.match(/<\?xml/g)).toHaveLength(1)
      expect(scoreMeasures(xml)).toHaveLength(3)
      expect(scoreMeasures(deleteMeasure(xml, 0))).toHaveLength(2)
    } finally {
      spy.mockRestore()
    }
  })

  it('appends a full-measure rest and preserves the existing notes', () => {
    const xml = appendMeasure(SAMPLE_SCORE)
    expect(xml.startsWith('<?xml')).toBe(true)
    const output = read(xml)
    expect(output.querySelectorAll('measure')).toHaveLength(3)
    expect(output.querySelectorAll('pitch')).toHaveLength(7)
    const last = output.querySelector('measure[number="3"]')!
    expect(last.querySelector('rest')?.getAttribute('measure')).toBe('yes')
    expect(last.querySelector('duration')?.textContent).toBe('40320')
  })

  it('uses the latest divisions and additive time signature', () => {
    const xml = SAMPLE_SCORE.replace(
      '<measure implicit="no" number="2" width="120">',
      '<measure number="2"><attributes><divisions>8</divisions><time><beats>3+2</beats><beat-type>8</beat-type></time></attributes>',
    )
    expect(
      read(appendMeasure(xml)).querySelector('measure[number="3"] duration')?.textContent,
    ).toBe('20')
  })

  it('creates simultaneous rests for both piano staves', () => {
    const output = appendMeasure(piano)
    const events = indexScore(output).measures[1].events
    expect(events).toHaveLength(2)
    expect(events.map((event) => event.position.onset)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 0, denominator: 1 },
    ])
    expect(events.map((event) => event.duration)).toEqual([
      { numerator: 4, denominator: 1 },
      { numerator: 4, denominator: 1 },
    ])
    expect(
      Array.from(
        read(output).querySelectorAll('measure[number="2"] note > staff'),
        (node) => node.textContent,
      ),
    ).toEqual(['1', '2'])
  })

  it('adds and removes aligned measures across instrumental parts', () => {
    const xml = SAMPLE_SCORE.replace(
      '</part-list>',
      '<score-part id="P2"><part-name>Violin</part-name></score-part></part-list>',
    ).replace(
      '</score-partwise>',
      '<part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes></measure><measure number="2"/></part></score-partwise>',
    )
    const appended = appendMeasure(xml)
    expect(
      Array.from(
        read(appended).querySelectorAll('part'),
        (part) => part.querySelectorAll('measure').length,
      ),
    ).toEqual([3, 3])
    const removed = read(deleteMeasure(appended, 1))
    expect(
      Array.from(
        removed.querySelectorAll('part'),
        (part) => part.querySelectorAll('measure').length,
      ),
    ).toEqual([2, 2])
    expect(removed.querySelector('part[id="P2"] measure[number="2"] duration')?.textContent).toBe(
      '3',
    )
  })

  it('preserves initial attributes after removing the first measure', () => {
    const output = read(deleteMeasure(SAMPLE_SCORE, 0))
    expect(output.querySelectorAll('measure')).toHaveLength(1)
    expect(output.querySelector('measure')?.getAttribute('number')).toBe('1')
    expect(output.querySelector('attributes > divisions')?.textContent).toBe('10080')
    expect(output.querySelector('attributes > clef > sign')?.textContent).toBe('G')
    expect(output.querySelectorAll('pitch')).toHaveLength(3)
    expect(() => appendMeasure(new XMLSerializer().serializeToString(output))).not.toThrow()
  })

  it('keeps later explicit attributes authoritative after deleting a change', () => {
    const xml = SAMPLE_SCORE.replace(
      '<measure implicit="no" number="2" width="120">',
      '<measure number="2"><attributes><key><fifths>2</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time></attributes>',
    )
    const removed = deleteMeasure(xml, 0)
    expect(
      Array.from(read(removed).querySelectorAll('key > fifths'), (node) => node.textContent),
    ).toEqual(['2'])
    expect(
      read(appendMeasure(removed)).querySelector('measure[number="2"] duration')?.textContent,
    ).toBe('30240')
  })

  it('moves the final barline when adding or deleting the last measure', () => {
    const xml = SAMPLE_SCORE.replace(
      '</part>',
      '<measure number="3"><barline location="right"><bar-style>light-heavy</bar-style></barline></measure></part>',
    )
    expect(
      read(appendMeasure(xml)).querySelector('barline')?.parentElement?.getAttribute('number'),
    ).toBe('4')
    expect(
      read(deleteMeasure(xml, 2)).querySelector('barline')?.parentElement?.getAttribute('number'),
    ).toBe('2')
  })

  it('retains pickup numbering and namespaces', () => {
    const xml = SAMPLE_SCORE.replace(
      '<score-partwise version="4.0">',
      '<score-partwise xmlns="http://www.musicxml.org/ns/musicxml" version="4.0">',
    ).replace('implicit="no" number="1"', 'implicit="yes" number="0"')
    const output = appendMeasure(xml)
    expect(scoreMeasures(output).map((measure) => measure.number)).toEqual(['0', '1', '2'])
    expect(output).not.toContain('xmlns=""')
  })

  it('rejects deleting the last measure, invalid indices and unsupported spanners', () => {
    expect(() => deleteMeasure(piano, 0)).toThrow('lastMeasure')
    expect(() => deleteMeasure(SAMPLE_SCORE, -1)).toThrow('measureMissing')
    expect(() => deleteMeasure(SAMPLE_SCORE, 0.5)).toThrow('measureMissing')
    expect(() =>
      deleteMeasure(
        SAMPLE_SCORE.replace('<type>quarter</type>', '<tie type="start"/><type>quarter</type>'),
        0,
      ),
    ).toThrow('unsupportedMeasureStructure')
  })

  describe.each(['dashes', 'bracket'])('paired %s directions', (name) => {
    it.each([
      ['delete', deleteMeasure],
      ['duplicate', duplicateMeasure],
      ['insert after', insertMeasureAfter],
    ] as const)('rejects %s instead of orphaning or copying endpoints', (_action, edit) => {
      const document = read(SAMPLE_SCORE)
      const measures = document.querySelectorAll('measure')
      for (const [index, type] of ['start', 'stop'].entries()) {
        const direction = document.createElement('direction')
        const directionType = document.createElement('direction-type')
        const endpoint = document.createElement(name)
        endpoint.setAttribute('type', type)
        endpoint.setAttribute('number', '1')
        if (name === 'bracket') endpoint.setAttribute('line-end', 'none')
        directionType.append(endpoint)
        direction.append(directionType)
        measures[index].append(direction)
      }
      const xml = new XMLSerializer().serializeToString(document)
      expect(() => edit(xml, 0)).toThrow('unsupportedMeasureStructure')
    })
  })

  it('rejects unknown durations, staff-specific meters and unaligned parts', () => {
    expect(() => appendMeasure(SAMPLE_SCORE.replace('<time>', '<time number="1">'))).toThrow(
      'unsupportedMeasureStructure',
    )
    expect(() => appendMeasure(SAMPLE_SCORE.replace('<divisions>10080</divisions>', ''))).toThrow(
      'unsupportedMeasureStructure',
    )
    const xml = SAMPLE_SCORE.replace(
      '</part-list>',
      '<score-part id="P2"><part-name>Violin</part-name></score-part></part-list>',
    ).replace('</score-partwise>', '<part id="P2"><measure number="1"/></part></score-partwise>')
    expect(() => appendMeasure(xml)).toThrow('unsupportedMeasureStructure')
    expect(() => deleteMeasure(xml, 0)).toThrow('unsupportedMeasureStructure')
  })
})
