import { indexRenderedNotes } from './scoreNoteIndex'
import { ScoreError } from '@/lib/scores/errors'

export { indexRenderedNotes } from './scoreNoteIndex'

type Display = InstanceType<typeof import('opensheetmusicdisplay').OpenSheetMusicDisplay>
type Osmd = typeof import('opensheetmusicdisplay')
type Point = InstanceType<Osmd['PointF2D']>
type GraphicalNote = NonNullable<ReturnType<Display['GraphicSheet']['GetNearestNote']>>
const PICK_DISTANCE = 2

function scorePoint(
  event: MouseEvent,
  svg: SVGSVGElement,
  display: Display,
  osmd: Osmd,
): Point | null {
  const matrix = svg.getScreenCTM()
  if (!matrix) return null
  const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
  return display.GraphicSheet.svgToOsmd(new osmd.PointF2D(local.x, local.y))
}

function isNearNote(note: GraphicalNote, point: Point): boolean {
  const position = note.PositionAndShape.AbsolutePosition
  return (
    Math.abs(position.x - point.x) <= PICK_DISTANCE &&
    Math.abs(position.y - point.y) <= PICK_DISTANCE
  )
}

//TODO: this function can be improved or splitted
function noteAtClick(
  event: MouseEvent,
  container: HTMLElement,
  display: Display,
  osmd: Osmd,
): GraphicalNote | null {
  if (!(event.target instanceof SVGElement)) return null
  const svg = event.target.closest('svg')
  if (!svg) return null
  const page =
    display.GraphicSheet.MusicPages[Array.from(container.querySelectorAll('svg')).indexOf(svg)]
  if (!page) return null
  const point = scorePoint(event, svg, display, osmd)
  if (!point) return null
  const note = display.GraphicSheet.GetNearestNote(
    point,
    new osmd.PointF2D(PICK_DISTANCE, PICK_DISTANCE),
    page,
  )
  return note && isNearNote(note, point) ? note : null
}

function pickedNoteIndex(
  event: MouseEvent,
  container: HTMLElement,
  display: Display,
  osmd: Osmd,
  indexes: WeakMap<object, number>,
): number | null {
  const note = noteAtClick(event, container, display, osmd)
  return note ? (indexes.get(note.sourceNote) ?? null) : null
}

export function createNotePicker(
  display: Display,
  xml: string,
  container: HTMLElement,
  osmd: Osmd,
) {
  try {
    const indexes = indexRenderedNotes(display, xml, osmd.Pitch.OctaveXmlDifference)
    return indexes
      ? (event: MouseEvent) => pickedNoteIndex(event, container, display, osmd, indexes)
      : null
  } catch (cause) {
    // Unsupported structures return null above; unexpected indexing failures need a diagnostic.
    if (!(cause instanceof ScoreError))
      console.warn('Could not index score notes for selection.', cause)
    return null
  }
}
