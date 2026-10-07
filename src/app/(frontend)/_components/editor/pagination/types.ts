// A page's size and margins, in CSS pixels
export type PageGeometry = {
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

// A page break in the flow: where it starts, and where the text before it ends
export type PageBreakPlace = {
  start: number
  // The bottom of the block before it, margins left out (its own start when it opens the text)
  textEnd: number
}

// A point on screen
export type Point = { x: number; y: number }

// The pages as laid out right now: where the text flow starts on screen, and how many pages
export type PagesOnScreen = { flowTop: number; page: PageGeometry; gap: number; pages: number }
