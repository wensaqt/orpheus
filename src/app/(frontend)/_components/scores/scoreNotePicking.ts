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

/** Resolve the renderer page and point together; both depend on the clicked SVG. */
function scoreClickTarget(event: MouseEvent, { container, display, osmd }: PickingContext) {
  if (!(event.target instanceof SVGElement)) return null
  const svg = event.target.closest('svg')
  if (!svg) return null
  const page =
    display.GraphicSheet.MusicPages[Array.from(container.querySelectorAll('svg')).indexOf(svg)]
  const point = scorePoint(event, svg, display, osmd)
  return page && point ? { page, point } : null
}

type PickingContext = { container: HTMLElement; display: Display; osmd: Osmd }

function noteAtClick(event: MouseEvent, context: PickingContext): GraphicalNote | null {
  const target = scoreClickTarget(event, context)
  if (!target) return null
  const { page, point } = target
  const { display, osmd } = context
  const note = display.GraphicSheet.GetNearestNote(
    point,
    new osmd.PointF2D(PICK_DISTANCE, PICK_DISTANCE),
    page,
  )
  return note && isNearNote(note, point) ? note : null
}

function pickedNoteIndex(
  event: MouseEvent,
  context: PickingContext,
  indexes: WeakMap<object, number>,
): number | null {
  const note = noteAtClick(event, context)
  return note ? (indexes.get(note.sourceNote) ?? null) : null
}

/** Associate only verified XML notes with their SVG heads; DOM order can differ from score order. */
function noteHeads(display: Display, indexes: WeakMap<object, number>, container: HTMLElement) {
  const heads = new Map<SVGElement, number>()
  const notes = display.GraphicSheet.MeasureList.flat()
    .filter((measure) => measure && !measure.IsExtraGraphicalMeasure)
    .flatMap((measure) => measure.staffEntries)
    .flatMap((entry) => entry.graphicalVoiceEntries)
    .flatMap((voice) => voice.notes)
  for (const note of notes) {
    const index = indexes.get(note.sourceNote)
    if (index === undefined || !('getNoteheadSVGs' in note)) continue
    if (typeof note.getNoteheadSVGs !== 'function') continue
    const elements: unknown = note.getNoteheadSVGs()
    if (!Array.isArray(elements)) continue
    for (const element of elements) {
      if (!(element instanceof SVGElement) || !container.contains(element)) continue
      element.dataset.scoreNote = String(index)
      heads.set(element, index)
    }
  }
  return heads
}

export function createNotePicker(
  display: Display,
  xml: string,
  container: HTMLElement,
  osmd: Osmd,
) {
  try {
    const indexes = indexRenderedNotes(display, xml, osmd.Pitch.OctaveXmlDifference)
    if (!indexes) return null
    const context = { container, display, osmd }
    const heads = noteHeads(display, indexes, container)
    const pick = (event: MouseEvent) => pickedNoteIndex(event, context, indexes)
    return Object.assign(pick, {
      select(index: number | null) {
        for (const [head, candidate] of heads) {
          if (candidate === index) head.dataset.scoreNoteSelected = 'true'
          else delete head.dataset.scoreNoteSelected
        }
      },
    })
  } catch (cause) {
    // Unsupported structures return null above; unexpected indexing failures need a diagnostic.
    if (!(cause instanceof ScoreError))
      console.warn('Could not index score notes for selection.', cause)
    return null
  }
}
