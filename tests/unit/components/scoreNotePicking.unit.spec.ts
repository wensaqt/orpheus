import { expect, it } from 'vitest'
import * as osmd from 'opensheetmusicdisplay'
import { createNotePicker, indexRenderedNotes } from '@front/_components/scores/scoreNotePicking'

const xml = `<score-partwise><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note><note><rest/><duration>4</duration></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note></measure></part></score-partwise>`
const note = (onset: number, duration: number, fundamental: number) => ({
  isRest: () => false,
  ParentVoiceEntry: { Timestamp: { Numerator: onset, Denominator: 4 } },
  Length: { Numerator: duration, Denominator: 4 },
  Pitch: { FundamentalNote: fundamental, Octave: 1, AccidentalHalfTones: 0 },
})
type VisualNote = { sourceNote: ReturnType<typeof note>; getNoteheadSVGs: () => Element[] }
const display = (notes: ReturnType<typeof note>[], visualNotes: VisualNote[] = []) =>
  ({
    GraphicSheet: {
      MeasureList: [
        [{ staffEntries: [{ graphicalVoiceEntries: [{ notes: visualNotes }] }] }],
      ],
    },
    Sheet: {
      SourceMeasures: [
        {
          VerticalSourceStaffEntryContainers: [
            { StaffEntries: [{ VoiceEntries: [{ Notes: notes }] }] },
          ],
        },
      ],
    },
  }) as unknown as Parameters<typeof indexRenderedNotes>[0]

it('matches notes by time, duration and pitch despite reordered renderer entries and intervening rests', () => {
  const first = note(0, 1, 0)
  const second = note(2, 2, 2)
  const indexes = indexRenderedNotes(display([second, first]), xml, 3)
  expect(indexes?.get(first)).toBe(0)
  expect(indexes?.get(second)).toBe(1)
})

it('highlights only mapped SVG heads by source identity and clears the previous selection', () => {
  const first = note(0, 1, 0)
  const second = note(2, 2, 2)
  const unknown = note(0, 1, 0)
  const container = document.createElement('div')
  const head = () => document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const firstHead = head()
  const secondHead = head()
  const unknownHead = head()
  const detachedHead = head()
  container.append(secondHead, unknownHead, firstHead)
  firstHead.setAttribute('transform', 'translate(10 20)')
  const pick = createNotePicker(
    display([second, first], [
      { sourceNote: second, getNoteheadSVGs: () => [secondHead] },
      { sourceNote: unknown, getNoteheadSVGs: () => [unknownHead] },
      { sourceNote: first, getNoteheadSVGs: () => [firstHead, detachedHead] },
    ]),
    xml,
    container,
    osmd,
  )
  expect(pick).not.toBeNull()
  pick?.select(0)
  expect(firstHead.dataset.scoreNoteSelected).toBe('true')
  expect(firstHead.getAttribute('transform')).toBe('translate(10 20)')
  expect(secondHead.dataset.scoreNote).toBe('1')
  expect(secondHead.dataset.scoreNoteSelected).toBeUndefined()
  expect(unknownHead.dataset.scoreNote).toBeUndefined()
  expect(detachedHead.dataset.scoreNote).toBeUndefined()
  pick?.select(1)
  expect(firstHead.dataset.scoreNoteSelected).toBeUndefined()
  expect(secondHead.dataset.scoreNoteSelected).toBe('true')
  pick?.select(null)
  expect(container.querySelector('[data-score-note-selected]')).toBeNull()
})

it.each([
  [1, 2, 2], // wrong onset
  [2, 1, 2], // wrong duration
  [2, 2, 4], // wrong pitch
])('disables picking on a mismatched renderer note', (onset, duration, pitch) => {
  expect(
    indexRenderedNotes(display([note(0, 1, 0), note(onset, duration, pitch)]), xml, 3),
  ).toBeNull()
})
