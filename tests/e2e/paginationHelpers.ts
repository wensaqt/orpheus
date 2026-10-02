import type { Page } from '@playwright/test'

import { DEFAULT_PAGE, toPageSettings } from '@/lib/pageFormats'
import type { Composition } from '@/payload-types'

import { type PageGeometry, toGeometry } from '@front/_components/editor/pagination/pageGeometry'

import { type Account, expect } from './fixtures'

// Helpers for the pagination tests: open a document, wait for its layout, read what is on screen

export const editable = '[contenteditable="true"]'
// To the end of the text, and to the start of a line: macOS has its own shortcuts
export const END_OF_TEXT = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End'
export const LINE_START = process.platform === 'darwin' ? 'Meta+ArrowLeft' : 'Home'
export const LINE_END = process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End'
// The sheets drawn behind the text, in order
export const sheetSelector = '[data-pages] > div[aria-hidden] > div'

// The editor reads a moved selection a frame later: a hand is never faster than that
export const selectionRead = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))

// The sheet (1-based) a text is on
export const sheetOf = (page: Page, text: string) =>
  page.evaluate(
    ({ text, sheetSelector }) => {
      const element = [...document.querySelectorAll('[contenteditable="true"] *')].find(
        (candidate) => candidate.childElementCount === 0 && candidate.textContent === text,
      )!
      const top = element.getBoundingClientRect().top
      const sheets = [...document.querySelectorAll(sheetSelector)]
      return (
        1 +
        sheets.findIndex((sheet) => {
          const bounds = sheet.getBoundingClientRect()
          return top >= bounds.top && top < bounds.bottom
        })
      )
    },
    { text, sheetSelector },
  )
// The default page (A4 portrait, default margins), in CSS pixels
export const A4 = toGeometry(toPageSettings(DEFAULT_PAGE))

// A composition whose first document holds this content, opened in the editor
export async function openDocument(
  page: Page,
  account: Account,
  content: object,
  pageSettings?: Partial<Composition['page']>,
) {
  const as = { user: account.user, overrideAccess: false, depth: 0 } as const
  const composition = await account.payload.create({
    collection: 'compositions',
    data: {
      title: 'Pages',
      owner: account.user.id,
      page: { format: 'A4', orientation: 'portrait', ...pageSettings },
    },
    ...as,
  })
  const { docs } = await account.payload.find({
    collection: 'binder-items',
    where: { composition: { equals: composition.id } },
    ...as,
  })
  await account.payload.update({
    collection: 'binder-items',
    id: docs[0].id,
    data: { content: content as never },
    ...as,
  })
  await page.goto(`/compositions/${composition.id}/${docs[0].id}`)
  await waitForEditor(page)
  return { composition, document: docs[0] }
}

/*
 * The page layout runs a frame after each change (text, fonts, settings): wait until it is
 * stable, i.e. two reads a few frames apart see the same pages and lines
 */
export async function settle(page: Page) {
  let previous = ''
  await expect
    .poll(
      async () => {
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              document.fonts.ready.then(() =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              ),
            ),
        )
        const current = JSON.stringify(await readLayout(page))
        const stable = current === previous
        previous = current
        return stable
      },
      { timeout: 10_000, intervals: [50] },
    )
    .toBe(true)
}

export type Layout = { pages: number; sheets: number; outside: string[]; linesPerPage: number[] }

/*
 * What the reader sees: the sheets drawn, and every line of text with the sheet it sits on.
 * A line is "outside" when it is not fully within its sheet's text area (between the top and
 * bottom margins): exactly what pagination must never let happen.
 */
export async function readLayout(
  page: Page,
  margins: Pick<PageGeometry, 'top' | 'bottom'> = A4,
): Promise<Layout> {
  return page.evaluate(
    ({ margins: { top, bottom }, sheetSelector }) => {
      /*
       * A text rectangle spans the font's height, which engines place a pixel or two apart
       * within the line box (more for a large heading): a real overflow is a line's height
       */
      const TOLERANCE = 4
      const root = document.querySelector<HTMLElement>('[data-pages]')!
      const sheets = [...document.querySelectorAll<HTMLElement>(sheetSelector)].map((sheet) =>
        sheet.getBoundingClientRect(),
      )
      const editor = document.querySelector('[contenteditable="true"]')!
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
      const outside: string[] = []
      const linesPerPage = sheets.map(() => 0)
      const range = document.createRange()
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue
        range.selectNodeContents(node)
        for (const line of range.getClientRects()) {
          if (line.height === 0) continue
          const index = sheets.findIndex(
            (sheet) => line.top >= sheet.top - 1 && line.top < sheet.bottom,
          )
          const sheet = sheets[index]
          if (
            !sheet ||
            line.top < sheet.top + top - TOLERANCE ||
            line.bottom > sheet.bottom - bottom + TOLERANCE
          ) {
            outside.push(
              `${(node.textContent ?? '').slice(0, 30)}… at ${Math.round(line.top - (sheet?.top ?? 0))}px`,
            )
          } else {
            linesPerPage[index]++
          }
        }
      }
      return { pages: Number(root.dataset.pages), sheets: sheets.length, outside, linesPerPage }
    },
    { margins: { top: margins.top, bottom: margins.bottom }, sheetSelector },
  )
}

/*
 * The caret's height, from the top of the pages (moving the caret may scroll them). Read from
 * the selection's rectangle, extended over the next (or previous) character when collapsed:
 * inserting a probe would change the editor's text.
 */
export const caretTop = (page: Page) =>
  page.evaluate(() => {
    const origin = document.querySelector('[data-pages]')!.getBoundingClientRect().top
    const range = window.getSelection()!.getRangeAt(0).cloneRange()
    const direct = range.getClientRects()[0]
    if (direct && direct.height > 0) return direct.top - origin
    const node = range.startContainer
    const length = node.textContent?.length ?? 0
    const offset = range.startOffset
    if (offset < length) range.setEnd(node, offset + 1)
    else if (offset > 0) range.setStart(node, offset - 1)
    return range.getBoundingClientRect().top - origin
  })

/*
 * The middle of the last line of page n (1-based), in viewport coordinates, scrolled so the
 * end of that page and the gap below it are on screen
 */
export const lastLineOf = (page: Page, n: number) =>
  page.evaluate(
    ({ n, sheetSelector }) => {
      const root = document.querySelector<HTMLElement>('[data-pages]')!
      const sheet = document.querySelectorAll<HTMLElement>(sheetSelector)[n - 1]
      sheet.scrollIntoView({ block: 'end' })
      let scroller: Element | null = root.parentElement
      while (
        scroller &&
        !(
          scroller.scrollHeight > scroller.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(scroller).overflowY)
        )
      )
        scroller = scroller.parentElement
      ;(scroller ?? document.scrollingElement!).scrollBy(0, window.innerHeight / 3)
      const bounds = sheet.getBoundingClientRect()
      const editor = document.querySelector('[contenteditable="true"]')!
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
      let last: DOMRect | null = null
      const range = document.createRange()
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        range.selectNodeContents(node)
        for (const line of range.getClientRects()) {
          if (
            line.top >= bounds.top &&
            line.bottom <= bounds.bottom &&
            (!last || line.top > last.top)
          )
            last = line
        }
      }
      return (
        last && {
          x: last.left + Math.min(40, last.width / 2),
          y: last.top + last.height / 2,
          pageBottom: bounds.bottom,
          pageBottomInPages: bounds.bottom - root.getBoundingClientRect().top,
        }
      )
    },
    { n, sheetSelector },
  )

// The editor of a page just loaded or reloaded, once its pages are laid out
export async function waitForEditor(page: Page) {
  await expect(page.locator(editable)).toBeVisible({ timeout: 20_000 })
  await settle(page)
}
