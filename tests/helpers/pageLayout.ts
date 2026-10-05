// What the reader sees of the pages, measured once in the browser, then judged here (pure)

export type Box = { top: number; bottom: number; left: number; width: number; height: number }

// A line on screen: of text, or empty (a block holding only a line break)
export type ScreenLine = { text: string; box: Box; empty: boolean }

export type Screen = {
  // The page count the layout announces, and the sheets it draws
  pages: number
  pagesTop: number
  sheets: Box[]
  // Where the text's lines end on the right
  textRight: number
  lines: ScreenLine[]
}

export type Layout = { pages: number; sheets: number; outside: string[]; linesPerPage: number[] }

/*
 * A text rectangle spans the font's height, which engines place a pixel or two apart within
 * the line box (more for a large heading): a real overflow is a line's height
 */
const TOLERANCE = 4

// The sheet a line or point at this height is on, or -1
export const sheetIndexAt = (sheets: Box[], top: number) =>
  sheets.findIndex((sheet) => top >= sheet.top - 1 && top < sheet.bottom)

/*
 * Every line with the sheet it sits on. A line is "outside" when it is not fully within its
 * sheet's text area (between the top and bottom margins), or when an empty line is squeezed
 * beside a band, against the text's right edge: what pagination must never allow.
 */
export function classifyLines(
  { pages, sheets, textRight, lines }: Screen,
  margins: { top: number; bottom: number },
): Layout {
  const outside: string[] = []
  const linesPerPage = sheets.map(() => 0)
  for (const { text, box, empty } of lines) {
    if (box.height === 0) continue
    const index = sheetIndexAt(sheets, box.top)
    const sheet = sheets[index]
    if (
      !sheet ||
      box.top < sheet.top + margins.top - TOLERANCE ||
      box.bottom > sheet.bottom - margins.bottom + TOLERANCE ||
      (empty && box.left >= textRight - TOLERANCE)
    ) {
      const label = empty ? '(empty line)' : text.slice(0, 30)
      outside.push(`${label}… at ${Math.round(box.top - (sheet?.top ?? 0))}px`)
    } else {
      linesPerPage[index]++
    }
  }
  return { pages, sheets: sheets.length, outside, linesPerPage }
}

// The lowest line of text fully on sheet n (1-based)
export function lastLineOn({ sheets, lines }: Screen, n: number): ScreenLine | undefined {
  const sheet = sheets[n - 1]
  return lines
    .filter(({ box, empty }) => !empty && box.top >= sheet.top && box.bottom <= sheet.bottom)
    .reduce<ScreenLine | undefined>(
      (last, line) => (last && last.box.top >= line.box.top ? last : line),
      undefined,
    )
}
