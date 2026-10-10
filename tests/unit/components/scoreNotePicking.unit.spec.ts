import { expect, it } from 'vitest'
import { indexRenderedNotes } from '@front/_components/scores/scoreNotePicking'

const xml = `<score-partwise><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note><note><rest/><duration>4</duration></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note></measure></part></score-partwise>`
const note = (onset: number, duration: number, fundamental: number) => ({
  isRest: () => false,
  ParentVoiceEntry: { Timestamp: { Numerator: onset, Denominator: 4 } },
  Length: { Numerator: duration, Denominator: 4 },
  Pitch: { FundamentalNote: fundamental, Octave: 1, AccidentalHalfTones: 0 },
})
const display = (notes: ReturnType<typeof note>[]) =>
  ({
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

it.each([
  [1, 2, 2], // wrong onset
  [2, 1, 2], // wrong duration
  [2, 2, 4], // wrong pitch
])('disables picking on a mismatched renderer note', (onset, duration, pitch) => {
  expect(
    indexRenderedNotes(display([note(0, 1, 0), note(onset, duration, pitch)]), xml, 3),
  ).toBeNull()
})
