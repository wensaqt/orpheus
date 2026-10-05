import type { Page } from '@playwright/test'

import { DEFAULT_PAGE, toPageSettings } from '@/lib/pageFormats'
import type { Composition } from '@/payload-types'

import {
  PAGE_SHEET_ATTRIBUTE,
  PAGES_ATTRIBUTE,
} from '@front/_components/editor/pagination/pageAttributes'
import { type PageGeometry, toGeometry } from '@front/_components/editor/pagination/pageGeometry'

import type { DocumentContent } from '../helpers/lexicalContent'
import {
  classifyLines,
  type Layout,
  lastLineOn,
  type Screen,
  sheetIndexAt,
} from '../helpers/pageLayout'
import { type Account, expect } from './fixtures'

// Helpers for the pagination tests: open a document, wait for its layout, read what is on screen

export const editable = '[contenteditable="true"]'
const pagesSelector = `[${PAGES_ATTRIBUTE}]`
// The sheets drawn behind the text, in order
export const sheetSelector = `[${PAGE_SHEET_ATTRIBUTE}]`
const selectors = {
  editable,
  pages: pagesSelector,
  pagesAttribute: PAGES_ATTRIBUTE,
  sheets: sheetSelector,
}

// To the end of the text, and to the start or end of a line: macOS has its own shortcuts
export const END_OF_TEXT = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End'
export const LINE_START = process.platform === 'darwin' ? 'Meta+ArrowLeft' : 'Home'
export const LINE_END = process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End'

// The default page (A4 portrait, default margins), in CSS pixels
export const A4 = toGeometry(toPageSettings(DEFAULT_PAGE))

// The editor reads a moved selection a frame later: a hand is never faster than that
export const selectionRead = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))

// A composition whose first document holds this content, opened in the editor
export async function openDocument(
  page: Page,
  account: Account,
  content: DocumentContent,
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
    data: { content },
    ...as,
  })
  await page.goto(`/compositions/${composition.id}/${docs[0].id}`)
  await waitForEditor(page)
  return { composition, document: docs[0] }
}

// The editor of a page just loaded or reloaded, once its pages are laid out
export async function waitForEditor(page: Page) {
  /*
   * Lexical marks its root once it runs in the page: before that (scripts still loading), the
   * server's markup shows, with no layout yet, and would look settled
   */
  await expect(page.locator(`${editable}[data-lexical-editor="true"]`)).toBeVisible({
    timeout: 20_000,
  })
  await settle(page)
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

// Everything the layout tests judge, measured in one pass: sheets, and every line of text
const readScreen = (page: Page): Promise<Screen> =>
  page.evaluate(({ editable, pages, pagesAttribute, sheets }) => {
    // No named functions in here: the test runner's transpiler would wrap them with a helper
    // the browser does not have. Plain rectangles come from DOMRect's own toJSON
    const root = document.querySelector<HTMLElement>(pages)!
    const editor = document.querySelector(editable)!
    const lines: Screen['lines'] = []
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? ''
      if (!text.trim()) continue
      range.selectNodeContents(node)
      for (const rect of range.getClientRects())
        lines.push({ text, box: rect.toJSON(), empty: false })
    }
    // An empty block holds only a line break
    for (const br of editor.querySelectorAll('br')) {
      if (br.parentElement?.childNodes.length === 1)
        lines.push({ text: '', box: br.getBoundingClientRect().toJSON(), empty: true })
    }
    return {
      pages: Number(root.getAttribute(pagesAttribute)),
      pagesTop: root.getBoundingClientRect().top,
      sheets: [...document.querySelectorAll(sheets)].map((sheet) =>
        sheet.getBoundingClientRect().toJSON(),
      ),
      textRight: editor.getBoundingClientRect().right,
      lines,
    }
  }, selectors)

/*
 * The pages and every line of text with the sheet it sits on; `outside` lists the lines that
 * are not within a text area (see classifyLines)
 */
export const readLayout = async (
  page: Page,
  margins: Pick<PageGeometry, 'top' | 'bottom'> = A4,
): Promise<Layout> => classifyLines(await readScreen(page), margins)

// The sheet (1-based) a text is on
export async function sheetOf(page: Page, text: string) {
  const { sheets, lines } = await readScreen(page)
  const line = lines.find((candidate) => candidate.text === text)
  if (!line) throw new Error(`No line of text reads “${text}”`)
  return 1 + sheetIndexAt(sheets, line.box.top)
}

/*
 * The middle of the last line of page n (1-based), in viewport coordinates, scrolled so the
 * end of that page and the gap below it are on screen
 */
export async function lastLineOf(page: Page, n: number) {
  await page.evaluate(
    ({ n, sheets }) => {
      const sheet = document.querySelectorAll(sheets)[n - 1]
      sheet.scrollIntoView({ block: 'end' })
      // Then a third of a screen further, through whatever scrolls the pages
      let scroller = sheet.parentElement
      while (
        scroller &&
        !(
          scroller.scrollHeight > scroller.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(scroller).overflowY)
        )
      )
        scroller = scroller.parentElement
      ;(scroller ?? document.scrollingElement)?.scrollBy(0, window.innerHeight / 3)
    },
    { n, ...selectors },
  )
  const screen = await readScreen(page)
  const last = lastLineOn(screen, n)
  if (!last) throw new Error(`No line of text on page ${n}`)
  const sheet = screen.sheets[n - 1]
  return {
    x: last.box.left + Math.min(40, last.box.width / 2),
    y: last.box.top + last.box.height / 2,
    pageBottom: sheet.bottom,
    pageBottomInPages: sheet.bottom - screen.pagesTop,
  }
}

/*
 * The caret's height, from the top of the pages (moving the caret may scroll them). Read from
 * the selection's rectangle, extended over the next (or previous) character when collapsed:
 * inserting a probe would change the editor's text.
 */
export const caretTop = (page: Page) =>
  page.evaluate((pages) => {
    const origin = document.querySelector(pages)!.getBoundingClientRect().top
    const range = window.getSelection()!.getRangeAt(0).cloneRange()
    const direct = range.getClientRects()[0]
    if (direct && direct.height > 0) return direct.top - origin
    const node = range.startContainer
    const length = node.textContent?.length ?? 0
    const offset = range.startOffset
    if (offset < length) range.setEnd(node, offset + 1)
    else if (offset > 0) range.setStart(node, offset - 1)
    return range.getBoundingClientRect().top - origin
  }, pagesSelector)

// The pages of the page printed to PDF (Chromium only)
export async function pdfPageCount(page: Page) {
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1')
  return pdf.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0
}
