'use client'

import { type RefObject, useEffect } from 'react'

// The desk's widths, measured in pixels
export type DeskWidths = {
  // Inside the desk's padding
  available: number
  // Between two columns
  gap: number
  // The binder's column as it is (open, or its small button)
  binder: number
  page: number
  // The synonyms panel open
  panel: number
}

// Whether the synonyms panel fits beside the sheet, the binder on the other side
export const panelFits = ({ available, gap, binder, page, panel }: DeskWidths) =>
  available >= binder + gap + page + gap + panel

/*
 * Whether the synonyms panel has room beside the sheet, measured on the desk again whenever
 * it or the binder changes size (the window, the binder folded, another page format). The
 * panel's own width comes from `panelProbe`, an element as wide as the open panel.
 */
export function useSideRoom(
  desk: RefObject<HTMLElement | null>,
  binder: RefObject<HTMLElement | null>,
  panelProbe: RefObject<HTMLElement | null>,
  pageWidth: number,
  setRoom: (room: boolean) => void,
) {
  useEffect(() => {
    const deskElement = desk.current
    const binderElement = binder.current
    if (!deskElement || !binderElement) return
    const measure = () => {
      const style = getComputedStyle(deskElement)
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      setRoom(
        panelFits({
          available: deskElement.clientWidth - padding,
          gap: parseFloat(style.columnGap),
          binder: binderElement.getBoundingClientRect().width,
          page: pageWidth,
          panel: panelProbe.current?.getBoundingClientRect().width ?? 0,
        }),
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(deskElement)
    observer.observe(binderElement)
    return () => observer.disconnect()
  }, [desk, binder, panelProbe, pageWidth, setRoom])
}
