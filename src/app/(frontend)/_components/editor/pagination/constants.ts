// CSS pixels per millimetre (96 px per inch, also what print uses)
export const MM_TO_PX = 96 / 25.4

// Measured sizes are rounded to fractions of a pixel: within this, two of them are equal
export const SUBPIXEL_TOLERANCE = 0.5

// How far inside a text area a point must be to hit a line, rather than the area's edge
export const LINE_INSET = 2

// DOM markers of the pages, for the code (and the tests) that read them on screen

// On the pages' root, holding how many pages there are
export const PAGES_ATTRIBUTE = 'data-pages'

// On each sheet drawn behind the text
export const PAGE_SHEET_ATTRIBUTE = 'data-page-sheet'
