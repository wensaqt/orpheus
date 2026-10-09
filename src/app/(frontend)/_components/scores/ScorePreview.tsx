'use client'

import { useEffect, useRef, useState } from 'react'

type ScorePreviewProps = { xml: string; className?: string; onNoteClick?: (index: number) => void }
const DISPLAY_OPTIONS = { backend: 'svg' as const, autoResize: false, drawTitle: false }

// An import must not replace the current document if OSMD cannot display the new MusicXML.
export async function verifyScoreRender(xml: string): Promise<void> {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-10000px;top:0;width:60rem;visibility:hidden'
  document.body.append(container)
  try {
    const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay')
    const display = new OpenSheetMusicDisplay(container, DISPLAY_OPTIONS)
    await display.load(xml)
    display.render()
  } finally {
    container.remove()
  }
}

export function ScorePreview({ xml, className, onNoteClick }: ScorePreviewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onNoteClickRef = useRef(onNoteClick)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onNoteClickRef.current = onNoteClick
    const container = ref.current
    if (container) {
      if (onNoteClick && container.onclick) container.dataset.selectable = 'true'
      else delete container.dataset.selectable
    }
  }, [onNoteClick])

  useEffect(() => {
    let canceled = false
    const container = ref.current
    if (!container) return
    container.onclick = null
    delete container.dataset.selectable
    container.replaceChildren()
    void import('opensheetmusicdisplay')
      .then(async ({ OpenSheetMusicDisplay, PointF2D }) => {
        if (canceled) return
        const display = new OpenSheetMusicDisplay(container, DISPLAY_OPTIONS)
        await display.load(xml)
        if (!canceled) {
          display.render()
          setError(null)
          const noteIndexes = indexRenderedNotes(display, xml)
          if (noteIndexes) {
            if (onNoteClickRef.current) container.dataset.selectable = 'true'
            container.onclick = (event) => {
              if (!onNoteClickRef.current || !(event.target instanceof SVGElement)) return
              const svg = event.target.closest('svg')
              if (!svg) return
              const pages = Array.from(container.querySelectorAll('svg'))
              const page = display.GraphicSheet.MusicPages[pages.indexOf(svg)]
              const matrix = svg.getScreenCTM()
              if (!page || !matrix) return
              const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(
                matrix.inverse(),
              )
              const point = display.GraphicSheet.svgToOsmd(new PointF2D(local.x, local.y))
              const note = display.GraphicSheet.GetNearestNote(point, new PointF2D(2, 2), page)
              if (!note) return
              const position = note.PositionAndShape.AbsolutePosition
              if (Math.abs(position.x - point.x) > 2 || Math.abs(position.y - point.y) > 2) return
              const index = noteIndexes.get(note.sourceNote)
              if (index !== undefined) onNoteClickRef.current(index)
            }
          }
        }
      })
      .catch((cause: unknown) => {
        if (!canceled) setError(cause instanceof Error ? cause.message : 'Rendu impossible.')
      })
    return () => {
      canceled = true
      container.onclick = null
      delete container.dataset.selectable
      container.replaceChildren()
    }
  }, [xml])

  return (
    <>
      {error && <p role="alert">Erreur de rendu : {error}</p>}
      <div ref={ref} className={className} />
    </>
  )
}

type Display = InstanceType<typeof import('opensheetmusicdisplay').OpenSheetMusicDisplay>

// This prototype accepts one part and no overlapping voices. Match the note order in each
// MusicXML measure to OSMD's source notes; disable picking if an import breaks that assumption.
function indexRenderedNotes(display: Display, xml: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  // The ordinal bridge below is safe only for the prototype's simple, sequential notation.
  // Polyphony, multiple staves and chords need the timed identity bridge from the next phase.
  if (document.querySelector('backup, forward, voice, staff, chord, grace, time-modification'))
    return null
  const measures = Array.from(document.querySelectorAll('part > measure'))
  if (measures.length !== display.Sheet.SourceMeasures.length) return null

  const indexes = new WeakMap<object, number>()
  let index = 0
  for (const [measureIndex, measure] of measures.entries()) {
    const pitched = Array.from(measure.children).filter(
      (node) =>
        node.localName === 'note' &&
        Array.from(node.children).some((part) => part.localName === 'pitch'),
    )
    const sourceNotes = display.Sheet.SourceMeasures[
      measureIndex
    ].VerticalSourceStaffEntryContainers.flatMap((container) => container.StaffEntries)
      .flatMap((entry) => entry.VoiceEntries)
      .flatMap((entry) => entry.Notes)
      .filter((note) => !note.isRest())
    if (pitched.length !== sourceNotes.length) return null
    for (const note of sourceNotes) indexes.set(note, index++)
  }
  return indexes
}
