import type { RequiredDataFromCollectionSlug } from 'payload'
import type { Page } from '@playwright/test'
import sharp from 'sharp'

import { PAGE_BREAK_ATTRIBUTE, PAGE_BREAK_TYPE } from '@front/_components/editor/constants'
import { toGeometry } from '@front/_components/editor/pagination/pageGeometry'

import { documentOf, pageBreakNode, paragraphNode, prose } from '../helpers/lexicalContent'
import { boxOf, expect, test, textOf, type Account } from './fixtures'
import {
  A4,
  caretTop,
  editable,
  END_OF_TEXT,
  lastLineOf,
  LINE_END,
  LINE_START,
  openDocument,
  pdfPageCount,
  readLayout,
  selectionRead,
  settle,
  sheetOf,
  sheetSelector,
  waitForEditor,
} from './paginationHelpers'
import { BOOK_VIEW_COOKIE } from '@front/_lib/preferences'

async function toggleBookView(page: Page) {
  await page.getByRole('menubar').getByRole('menuitem', { name: 'View' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Book view' }).click()
  await settle(page)
}

const fourBookPages = () =>
  documentOf([
    paragraphNode('Left page'),
    pageBreakNode(),
    paragraphNode('Right page'),
    pageBreakNode(),
    paragraphNode('Third page'),
    pageBreakNode(),
    paragraphNode('Fourth page'),
  ])

const LONG_BOOK_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Molestie praesent semper vivamus. '.repeat(
    70,
  )

async function openLongBookParagraph(page: Page, account: Account) {
  await page.setViewportSize({ width: 1600, height: 1100 })
  await openDocument(page, account, documentOf([paragraphNode(LONG_BOOK_TEXT)]), { format: 'A5' })
  await page.locator(editable).evaluate((editor) => {
    ;(editor as HTMLElement).focus()
    const first = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT).nextNode()
    window.getSelection()?.collapse(first, 0)
  })
  await toggleBookView(page)
}

// Character rectangles provide expected offsets independently of browser caret hit testing.
async function rightPageTextPoints(page: Page) {
  return page.locator(editable).evaluate((editor, sheets) => {
    const node = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT).nextNode()!
    const range = document.createRange()
    range.selectNodeContents(node)
    const sheet = editor
      .closest('[data-book=true]')!
      .querySelectorAll(sheets)[1]
      .getBoundingClientRect()
    const right = [...range.getClientRects()].find((line) => line.left > sheet.left)!.left
    const points = []
    for (let offset = 0; offset < node.textContent!.length; offset++) {
      range.setStart(node, offset)
      range.setEnd(node, offset + 1)
      const rect = range.getClientRects()[0]
      if (rect?.left > right + 80 && rect.left < right + 100 && rect.top > 250 && rect.bottom < 650)
        points.push({ x: rect.left + rect.width / 4, y: rect.top + rect.height / 2, offset })
    }
    return points
  }, sheetSelector)
}

function changedPixelRatio(before: Buffer, after: Buffer): number {
  let changed = 0
  for (let index = 0; index < before.length; index += 3) {
    const difference =
      Math.abs(before[index] - after[index]) +
      Math.abs(before[index + 1] - after[index + 1]) +
      Math.abs(before[index + 2] - after[index + 2])
    if (difference > 30) changed++
  }
  return changed / (before.length / 3)
}

test.describe('Book view', () => {
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Book view is disabled on Safari during the beta',
  )
  test('dragging upwards inside a long paragraph stays on the right page', async ({
    page,
    account,
  }) => {
    await openLongBookParagraph(page, account)
    const points = await rightPageTextPoints(page)
    expect(points.length).toBeGreaterThan(5)
    const start = points.at(-1)!
    const end = points[0]
    const middle = points[Math.floor(points.length / 2)]
    const clip = { x: middle.x, y: middle.y - 5, width: 40, height: 10 }
    const before = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer()
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    for (const point of [...points].reverse()) {
      await page.mouse.move(point.x, point.y)
      await selectionRead(page)
      expect(await page.evaluate(() => window.getSelection()?.focusOffset)).toBe(point.offset)
    }
    expect(await page.evaluate(() => window.getSelection()?.anchorOffset)).toBe(start.offset)
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
      LONG_BOOK_TEXT.slice(end.offset, start.offset),
    )
    // Check actual paint while the button is still held, rather than only the final DOM selection.
    const held = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer()
    expect(changedPixelRatio(before, held)).toBeGreaterThan(0.5)
    await page.mouse.up()
  })

  test('an upward mouse selection keeps its right-page anchor while scrolling', async ({
    page,
    account,
  }) => {
    await openLongBookParagraph(page, account)
    const points = await rightPageTextPoints(page)
    const start = points.at(-1)!
    const header = await boxOf(page.locator('[data-editor-header]'))
    await page.evaluate(() => window.scrollTo(0, 200))
    const scroll = await page.evaluate(() => window.scrollY)
    expect(scroll).toBeGreaterThan(0)
    await page.mouse.move(start.x, start.y - scroll)
    await page.mouse.down()
    await page.mouse.move(start.x, header.y + header.height + 8, { steps: 20 })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    expect(await page.evaluate(() => window.getSelection()?.anchorOffset)).toBe(start.offset)
    const focus = await page.evaluate(() => window.getSelection()?.focusOffset ?? -1)
    expect(focus).toBeGreaterThanOrEqual(points[0].offset - 20)
    expect(focus).toBeLessThan(points[0].offset + 20)
    await page.mouse.up()
  })

  test('consecutive breaks keep a blank page without printing the trailing empty sheet', async ({
    page,
    account,
    browserName,
  }) => {
    await openDocument(
      page,
      account,
      documentOf([
        paragraphNode('Before the blank page'),
        pageBreakNode(),
        pageBreakNode(),
        paragraphNode('After the blank page'),
      ]),
    )
    await toggleBookView(page)
    await expect(page.locator('[data-pages]')).toHaveAttribute('data-pages', '3')
    await expect(
      page.locator(editable).getByText('Before the blank page', { exact: true }),
    ).toBeInViewport()
    await expect(
      page.locator(editable).getByText('After the blank page', { exact: true }),
    ).not.toBeInViewport()
    await page.locator(sheetSelector).nth(2).scrollIntoViewIfNeeded()
    await expect(
      page.locator('[data-book-spread="1"]').getByText('After the blank page', { exact: true }),
    ).toBeInViewport()
    await page.emulateMedia({ media: 'print' })
    await settle(page)
    expect((await readLayout(page)).outside).toEqual([])
    if (browserName === 'chromium') expect(await pdfPageCount(page)).toBe(3)
  })

  test('typing fills the left page, then the right page, then opens the next spread', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, documentOf([paragraphNode('Start')]))
    await toggleBookView(page)
    await page.locator(editable).getByText('Start', { exact: true }).click()
    await page.keyboard.press(LINE_END)
    await selectionRead(page)
    for (let line = 0; line < 30; line++) await page.keyboard.press('Enter')
    await page.keyboard.insertText('Writing on the right')
    const right = await boxOf(page.locator(sheetSelector).nth(1))
    const text = await boxOf(
      page.locator(editable).getByText('Writing on the right', { exact: true }),
    )
    expect(text.x).toBeGreaterThan(right.x)
    expect(text.x).toBeLessThan(right.x + right.width)
    for (let line = 0; line < 30; line++) await page.keyboard.press('Enter')
    await page.keyboard.insertText('Writing on the next spread')
    await expect(page.locator('[data-pages]')).toHaveAttribute('data-pages', '3')
    await expect(
      page.locator(editable).getByText('Writing on the next spread', { exact: true }),
    ).toBeInViewport()
  })

  test('fits two A5 pages on a narrow screen and places the caret from the right margin', async ({
    page,
    account,
  }) => {
    await page.setViewportSize({ width: 700, height: 900 })
    await openDocument(page, account, fourBookPages(), { format: 'A5' })
    await toggleBookView(page)
    const left = await boxOf(page.locator(sheetSelector).nth(0))
    const right = await boxOf(page.locator(sheetSelector).nth(1))
    const ruler = await boxOf(page.getByRole('group', { name: 'Ruler' }))
    expect(ruler.x).toBeCloseTo(left.x, 0)
    expect(ruler.width).toBeCloseTo(left.width, 0)
    expect(right.x + right.width).toBeLessThanOrEqual(700)
    expect(right.height).toBeGreaterThan(right.width)
    const text = await boxOf(page.locator(editable).getByText('Right page', { exact: true }))
    await page.mouse.click(right.x + 5, text.y + text.height / 2)
    await selectionRead(page)
    await page.keyboard.insertText('!')
    await expect(page.locator(editable)).toContainText('!Right page')
    await expect(page.locator(editable)).toContainText('Left page')
    await page.getByRole('slider', { name: 'Left margin' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('slider', { name: 'Left margin' })).toHaveAttribute(
      'aria-valuenow',
      '26',
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })

  test('stacks spreads for continuous scrolling and remembers the view', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, fourBookPages())
    await toggleBookView(page)
    const sheets = page.locator(sheetSelector)
    const left = await boxOf(sheets.nth(0))
    const right = await boxOf(sheets.nth(1))
    const third = await boxOf(sheets.nth(2))
    const fourth = await boxOf(sheets.nth(3))
    expect(right.x).toBeGreaterThan(left.x + left.width)
    expect(right.y).toBeCloseTo(left.y, 0)
    expect(third.x).toBeCloseTo(left.x, 0)
    expect(fourth.x).toBeCloseTo(right.x, 0)
    expect(third.y).toBeGreaterThan(left.y + left.height)
    expect(fourth.y).toBeCloseTo(third.y, 0)
    await expect(page.locator(editable).getByText('Left page', { exact: true })).toBeInViewport()
    await expect(page.locator(editable).getByText('Right page', { exact: true })).toBeInViewport()
    const before = await page.evaluate(() => window.scrollY)
    await page.mouse.move(right.x + right.width / 2, right.y + 200)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await sheets.nth(2).scrollIntoViewIfNeeded()
    const copy = page.locator('[data-book-spread="1"]')
    await expect(copy.getByText('Third page', { exact: true })).toBeInViewport()
    await copy.getByText('Third page', { exact: true }).click()
    await selectionRead(page)
    await page.keyboard.press(LINE_END)
    await selectionRead(page)
    await page.keyboard.insertText(' edited')
    await expect(
      page.locator(editable).getByText('Third page edited', { exact: true }),
    ).toBeInViewport()
    await page.keyboard.press('ControlOrMeta+z')
    await expect(page.locator(editable)).not.toContainText(' edited')
    await page.reload()
    await waitForEditor(page)
    await expect(page.locator('[data-book-viewport]')).toHaveCount(1)
    await expect(page.locator(editable)).toHaveCount(1)
    await toggleBookView(page)
    await expect(page.locator('[data-book-viewport]')).toHaveCount(0)
    expect((await readLayout(page)).outside).toEqual([])
  })

  test('reveals the current caret when book view is enabled', async ({ page, account }) => {
    await openDocument(page, account, fourBookPages())
    await page.getByText('Third page', { exact: true }).click()
    await selectionRead(page)
    await toggleBookView(page)
    await expect(page.locator('[data-book-viewport]')).toHaveCSS('--row', '1')
    await expect(page.locator(editable).getByText('Third page', { exact: true })).toBeInViewport()
  })

  test('updates a nearby spread without rebuilding its text on each keystroke', async ({
    page,
    account,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1600 })
    await openDocument(page, account, fourBookPages(), { format: 'A5' })
    await toggleBookView(page)
    const copy = page.locator('[data-book-spread="1"] [data-book-copy-editor]')
    await expect(copy).toBeVisible()
    await copy.evaluate((element) => element.setAttribute('data-existing-copy', ''))
    await page.locator(editable).getByText('Left page', { exact: true }).click()
    await page.keyboard.press(LINE_END)
    await selectionRead(page)
    await page.keyboard.insertText(' changed')
    await expect(page.locator(editable)).toContainText('Left page changed')
    await expect(copy).toHaveAttribute('data-existing-copy', '')
    await expect(copy).toContainText('Left page changed')
    await page.keyboard.press('Enter')
    await page.keyboard.insertText('Extra paragraph')
    await expect(copy).toContainText('Extra paragraph')
    await expect(copy).toHaveAttribute('data-existing-copy', '')
    await expect(copy).toContainText('Third page')
  })

  test('writes on the right page, saves, and keeps undo/redo across view changes', async ({
    page,
    account,
  }) => {
    const { document: savedDocument } = await openDocument(page, account, fourBookPages())
    await toggleBookView(page)
    await page.locator(editable).getByText('Right page', { exact: true }).click()
    await page.keyboard.press(LINE_END)
    await page.keyboard.insertText(' edited')
    await expect(page.locator(editable)).toContainText('Right page edited')
    await expect
      .poll(
        async () =>
          JSON.stringify(
            (
              await account.payload.findByID({
                collection: 'binder-items',
                id: savedDocument.id,
              })
            ).content,
          ),
        { timeout: 15_000 },
      )
      .toContain('Right page edited')

    await toggleBookView(page)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(page.locator(editable)).not.toContainText(' edited')
    await toggleBookView(page)
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await expect(page.locator(editable)).toContainText('Right page edited')
    await expect
      .poll(
        async () =>
          JSON.stringify(
            (
              await account.payload.findByID({
                collection: 'binder-items',
                id: savedDocument.id,
              })
            ).content,
          ),
        { timeout: 15_000 },
      )
      .toContain('Right page edited')
    await page.reload()
    await waitForEditor(page)
    await expect(
      page.locator(editable).getByText('Right page edited', { exact: true }),
    ).toBeInViewport()
  })

  test('flows text into right columns and follows the caret into the next spread', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(30))
    await toggleBookView(page)
    const data = await page.locator(editable).evaluate((editor) => {
      const range = document.createRange()
      range.selectNodeContents(editor)
      return [...range.getClientRects()]
        .filter((rect) => rect.width && rect.height)
        .map((rect) => ({ x: rect.x, y: rect.y }))
    })
    const right = await boxOf(page.locator(sheetSelector).nth(1))
    expect(data.some((rect) => rect.x > right.x && rect.x < right.x + right.width)).toBe(true)
    await page.locator(editable).getByText('Chant 1', { exact: true }).click()
    await selectionRead(page)
    await page.keyboard.press(END_OF_TEXT)
    await selectionRead(page)
    await page.keyboard.insertText(' End of the book.')
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(page.locator(`${editable} p`).last()).toBeInViewport()
  })

  test('native selection crosses the left and right pages', async ({ page, account }) => {
    await openDocument(page, account, fourBookPages())
    await toggleBookView(page)
    await page.locator(editable).evaluate((editor) => {
      const paragraphs = editor.querySelectorAll('p')
      ;(editor as HTMLElement).focus()
      const first = document.createTreeWalker(paragraphs[0], NodeFilter.SHOW_TEXT).nextNode()!
      const second = document.createTreeWalker(paragraphs[1], NodeFilter.SHOW_TEXT).nextNode()!
      window.getSelection()?.setBaseAndExtent(first, 0, second, second.textContent!.length)
    })
    await selectionRead(page)
    expect(await page.evaluate(() => window.getSelection()?.toString())).toContain('Right page')
    await page.keyboard.insertText('Replaced both pages')
    await expect(page.locator(editable)).toContainText('Replaced both pages')
    await expect(page.locator(editable)).not.toContainText('Left page')
    await expect(page.locator(editable)).not.toContainText('Right page')
    await page.keyboard.press('ControlOrMeta+z')
    await expect(page.locator(editable)).toContainText('Left page')
    await expect(page.locator(editable)).toContainText('Right page')
  })

  test('a mouse selection crosses stacked spreads and can be replaced and undone', async ({
    page,
    account,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1600 })
    await openDocument(page, account, fourBookPages(), { format: 'A5' })
    await toggleBookView(page)
    const first = await boxOf(page.locator(editable).getByText('Left page', { exact: true }))
    const third = await boxOf(
      page.locator('[data-book-spread="1"]').getByText('Third page', { exact: true }),
    )
    await page.mouse.move(first.x + 1, first.y + first.height / 2)
    await page.mouse.down()
    await page.mouse.move(third.x + third.width - 1, third.y + third.height / 2, { steps: 20 })
    await page.mouse.up()
    await selectionRead(page)
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()))
      .toContain('Left page')
    expect(await page.evaluate(() => window.getSelection()?.toString())).toContain('Third page')
    await expect
      .poll(() => page.evaluate(() => CSS.highlights.get('orpheus-book-selection')?.size ?? 0))
      .toBeGreaterThan(0)
    await page.keyboard.insertText('Replaced across spreads')
    await expect(page.locator(editable)).toContainText('Replaced across spreads')
    await expect(page.locator(editable)).not.toContainText('Third page')
    await page.keyboard.press('ControlOrMeta+z')
    await expect(page.locator(editable)).toContainText('Left page')
    await expect(page.locator(editable)).toContainText('Third page')
  })

  test('a mouse selection scrolls into the next spread at the window edge', async ({
    page,
    account,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await openDocument(page, account, fourBookPages(), { format: 'A5' })
    await toggleBookView(page)
    const first = await boxOf(page.locator(editable).getByText('Left page', { exact: true }))
    await page.mouse.move(first.x + 1, first.y + first.height / 2)
    await page.mouse.down()
    await page.mouse.move(first.x + 30, 715, { steps: 8 })
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()), { timeout: 10_000 })
      .toContain('Third page')
    await page.mouse.up()
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('prints portrait pages and restores the book layout afterwards', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, fourBookPages())
    await toggleBookView(page)
    await page.locator(sheetSelector).nth(2).scrollIntoViewIfNeeded()
    await page.emulateMedia({ media: 'print' })
    await settle(page)
    const print = await readLayout(page)
    expect(print.pages).toBe(4)
    expect(print.outside).toEqual([])
    const first = await boxOf(page.locator(sheetSelector).nth(0))
    const second = await boxOf(page.locator(sheetSelector).nth(1))
    expect(first.width).toBeCloseTo(A4.width, 0)
    expect(second.y).toBeGreaterThan(first.y)
    await page.emulateMedia({ media: 'screen' })
    await settle(page)
    await expect(page.locator('[data-book-viewport]')).toHaveCount(1)
    const left = await boxOf(page.locator(sheetSelector).nth(0))
    const right = await boxOf(page.locator(sheetSelector).nth(1))
    expect(left.y).toBeCloseTo(right.y, 0)
  })
})

test('Safari beta keeps normal view despite a saved book preference', async ({
  page,
  account,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== 'webkit', 'Safari-specific beta restriction')
  await page.context().addCookies([{ name: BOOK_VIEW_COOKIE, value: '1', url: baseURL! }])
  await openDocument(page, account, prose(10))
  await expect(page.locator('[data-book-viewport]')).toHaveCount(0)
  const warning = page.getByRole('status').filter({ hasText: 'Safari has issues' })
  await expect(warning).toBeVisible()
  await page.getByRole('menubar').getByRole('menuitem', { name: 'View' }).click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Book view' })).toBeDisabled()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Book view' })).not.toBeChecked()
  await page.keyboard.press('Escape')
  await expect(warning).toBeHidden({ timeout: 8000 })
})

test.describe('Pagination', () => {
  test('an empty document is one page of its format', async ({ page, account }) => {
    await openDocument(page, account, documentOf([paragraphNode('')]))
    const layout = await readLayout(page)
    expect([layout.pages, layout.sheets]).toEqual([1, 1])
    const sheet = await boxOf(page.locator(sheetSelector).first())
    expect(sheet.width).toBeCloseTo(A4.width, 0)
    expect(sheet.height).toBeCloseTo(A4.height, 0)
  })

  test('a long document flows over pages, no line ever crossing a page edge', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(60))
    const layout = await readLayout(page)
    expect(layout.pages).toBeGreaterThanOrEqual(5)
    expect(layout.sheets).toBe(layout.pages)
    expect(layout.outside).toEqual([])
    // Every page but the last is full of text
    expect(layout.linesPerPage.slice(0, -1).every((lines) => lines > 25)).toBe(true)
  })

  test('typing past the end of a page opens a new one; undoing closes it', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(5))
    const before = await readLayout(page)
    expect(before.pages).toBe(1)
    await page.locator(editable).click()
    await page.keyboard.press(END_OF_TEXT)
    await selectionRead(page)
    const paragraphsBefore = await page.locator(`${editable} p`).count()
    for (let line = 0; line < 30; line++) await page.keyboard.press('Enter')
    // Every new empty line is already on a page, the caret with it
    await settle(page)
    expect((await readLayout(page)).outside).toEqual([])
    await page.keyboard.type('Sur la page suivante.')
    await settle(page)
    const after = await readLayout(page)
    expect(after.pages).toBe(2)
    expect(after.outside).toEqual([])
    // Typed at the end of the text, so on the new page
    const sheet2 = await boxOf(page.locator(sheetSelector).nth(1))
    const line = await boxOf(page.getByText('Sur la page suivante.'))
    expect(line.y).toBeGreaterThan(sheet2.y)

    for (let step = 0; step < 40; step++) await page.keyboard.press('ControlOrMeta+z')
    await expect(page.locator(`${editable} p`)).toHaveCount(paragraphsBefore, { timeout: 15_000 })
    await settle(page)
    expect((await readLayout(page)).pages).toBe(1)
  })

  test('the arrows and the selection cross from one page to the next', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(30))
    const last = await lastLineOf(page, 1)
    await page.mouse.click(last.x, last.y)
    const onPage1 = await caretTop(page)
    expect(onPage1).toBeLessThan(last.pageBottomInPages)

    await page.keyboard.press('ArrowDown')
    const onPage2 = await caretTop(page)
    // Past the bottom margin, the gap and the next top margin
    expect(onPage2 - onPage1).toBeGreaterThan(A4.bottom + A4.top)
    await page.keyboard.press('ArrowUp')
    expect(Math.abs((await caretTop(page)) - onPage1)).toBeLessThan(4)

    await page.keyboard.down('Shift')
    for (let line = 0; line < 4; line++) await page.keyboard.press('ArrowDown')
    await page.keyboard.up('Shift')
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    expect(selected.length).toBeGreaterThan(80)
  })

  test('deleting across a page edge, then undoing, keeps the pages right', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(30))
    const textBefore = await textOf(page.locator(editable))
    const pagesBefore = (await readLayout(page)).pages
    const last = await lastLineOf(page, 1)
    await page.mouse.click(last.x, last.y)
    // Select from the end of page 1 into page 2, and delete it
    await page.keyboard.down('Shift')
    for (let line = 0; line < 3; line++) await page.keyboard.press('ArrowDown')
    await page.keyboard.up('Shift')
    await page.keyboard.press('Backspace')
    await settle(page)
    const afterDelete = await readLayout(page)
    expect(afterDelete.outside).toEqual([])
    expect((await textOf(page.locator(editable))).length).toBeLessThan(textBefore.length)

    await page.keyboard.press('ControlOrMeta+z')
    await expect.poll(() => textOf(page.locator(editable))).toBe(textBefore)
    await settle(page)
    expect(await textOf(page.locator(editable))).toBe(textBefore)
    expect((await readLayout(page)).pages).toBe(pagesBefore)
  })

  test('a large paste lays out at once on new pages', async ({ page, account }) => {
    await openDocument(page, account, prose(2))
    await page.locator(editable).click()
    await page.keyboard.press(END_OF_TEXT)
    await selectionRead(page)
    const long = Array.from(
      { length: 40 },
      (_, index) =>
        `Paragraphe collé numéro ${index + 1}, assez long pour remplir une ligne entière de texte.`,
    ).join('\n')
    // A real paste event, as the clipboard would send it
    await page.locator(editable).evaluate((element, text) => {
      const data = new DataTransfer()
      data.setData('text/plain', text)
      const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
      // Firefox ignores clipboardData given to the constructor
      Object.defineProperty(paste, 'clipboardData', { value: data })
      element.dispatchEvent(paste)
    }, long)
    await settle(page)
    const layout = await readLayout(page)
    expect(layout.pages).toBeGreaterThanOrEqual(2)
    expect(layout.outside).toEqual([])
  })

  test('a click in the gap between two pages puts the caret in the text', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(30))
    const last = await lastLineOf(page, 1)
    // Between the bottom of page 1 and the top of page 2
    await page.mouse.click(last.x, last.pageBottom + 8)
    const length = (await textOf(page.locator(editable))).length
    await page.keyboard.insertText('x')
    expect((await textOf(page.locator(editable))).length).toBe(length + 1)
  })

  test('a click below the last line puts the caret in the text', async ({ page, account }) => {
    await openDocument(page, account, documentOf([paragraphNode('Une seule ligne.')]))
    const sheet = await boxOf(page.locator(sheetSelector).first())
    // Well below the text, still in the page's text area
    await page.mouse.click(sheet.x + sheet.width / 2, sheet.y + sheet.height / 2)
    await page.keyboard.insertText('!')
    await expect(page.locator(editable)).toHaveText('Une seule ligne.!')
  })

  test('a click in the blank of a page break puts the caret before it', async ({
    page,
    account,
  }) => {
    await openDocument(
      page,
      account,
      documentOf([paragraphNode('Avant le saut.'), pageBreakNode(), paragraphNode('Après.')]),
    )
    const pageBreak = await boxOf(page.locator(`[${PAGE_BREAK_ATTRIBUTE}]`))
    // In the middle of the part on screen: it runs to the page's end, below the window
    const { height } = page.viewportSize() ?? { height: Number.POSITIVE_INFINITY }
    const bottom = Math.min(pageBreak.y + pageBreak.height, height)
    await page.mouse.click(pageBreak.x + pageBreak.width / 2, (pageBreak.y + bottom) / 2)
    await page.keyboard.insertText('!')
    await expect(page.getByText('Avant le saut.!')).toBeVisible()
  })

  test('Cmd/Ctrl+Enter starts a new page, saved with the document', async ({ page, account }) => {
    const { document } = await openDocument(page, account, prose(4))
    expect((await readLayout(page)).pages).toBe(1)
    await page.locator(editable).click()
    await page.keyboard.press(END_OF_TEXT)
    await selectionRead(page)
    await page.keyboard.press('ControlOrMeta+Enter')
    await page.keyboard.type('Une nouvelle page.')
    await settle(page)
    const layout = await readLayout(page)
    expect(layout.pages).toBe(2)
    expect(layout.outside).toEqual([])
    // The text after the break is the first line of page 2
    const sheet2 = await boxOf(page.locator(sheetSelector).nth(1))
    const line = await boxOf(page.getByText('Une nouvelle page.'))
    expect(line.y - sheet2.y).toBeGreaterThan(A4.top - 2)
    expect(line.y - sheet2.y).toBeLessThan(A4.top + 40)

    await expect
      .poll(async () =>
        JSON.stringify(
          (await account.payload.findByID({ collection: 'binder-items', id: document.id })).content,
        ),
      )
      .toContain(PAGE_BREAK_TYPE)
    await page.reload()
    await waitForEditor(page)
    expect((await readLayout(page)).pages).toBe(2)
  })

  test('the composition’s format and margins shape the pages', async ({ page, account }) => {
    const margins = { top: 15, right: 15, bottom: 15, left: 15 }
    await openDocument(page, account, prose(30), { format: 'A5', margins })
    const sheet = await boxOf(page.locator(sheetSelector).first())
    const a5 = toGeometry({ format: 'A5', orientation: 'portrait', margins })
    expect(sheet.width).toBeCloseTo(a5.width, 0)
    expect(sheet.height).toBeCloseTo(a5.height, 0)
    const layout = await readLayout(page, a5)
    expect(layout.pages).toBeGreaterThan(5)
    expect(layout.outside).toEqual([])
  })

  test('resizing the window changes nothing in the pages', async ({ page, account }) => {
    await openDocument(page, account, prose(30))
    const wide = await readLayout(page)
    await page.setViewportSize({ width: 900, height: 700 })
    await settle(page)
    const narrow = await readLayout(page)
    expect(narrow.linesPerPage).toEqual(wide.linesPerPage)
    expect(narrow.outside).toEqual([])
  })

  test('another document of the binder opens on its pages too', async ({ page, account }) => {
    const { composition } = await openDocument(page, account, prose(2))
    await account.payload.create({
      collection: 'binder-items',
      data: {
        composition: composition.id,
        kind: 'document',
        title: 'Second',
        content: prose(30, 3),
        // Owner and position are filled in by the collection, which the types cannot know
      } as RequiredDataFromCollectionSlug<'binder-items'>,
      user: account.user,
      overrideAccess: false,
    })
    await page.reload()
    await waitForEditor(page)
    await page.getByRole('treeitem', { name: 'Second', exact: true }).click()
    await expect(page.getByLabel('Document title')).toHaveValue('Second')
    await settle(page)
    const layout = await readLayout(page)
    expect(layout.pages).toBeGreaterThan(2)
    expect(layout.outside).toEqual([])
  })

  test('two page breaks in a row leave a blank page between', async ({ page, account }) => {
    await openDocument(
      page,
      account,
      documentOf([
        paragraphNode('Première page.'),
        pageBreakNode(),
        pageBreakNode(),
        paragraphNode('Troisième page.'),
      ]),
    )
    expect((await readLayout(page)).pages).toBe(3)
    expect(await sheetOf(page, 'Première page.')).toBe(1)
    expect(await sheetOf(page, 'Troisième page.')).toBe(3)

    // A click on the blank page goes back to the text before both breaks
    await page.locator(sheetSelector).nth(1).click({ force: true })
    await page.keyboard.insertText('!')
    await expect(page.getByText('Première page.!')).toBeVisible()
  })

  test('Backspace after a page break removes it; undoing puts it back', async ({
    page,
    account,
  }) => {
    await openDocument(
      page,
      account,
      documentOf([
        paragraphNode('Avant le saut.'),
        pageBreakNode(),
        paragraphNode('Après le saut.'),
      ]),
    )
    expect(await sheetOf(page, 'Après le saut.')).toBe(2)
    await page.getByText('Après le saut.').click()
    await page.keyboard.press(LINE_START)
    await selectionRead(page)
    await page.keyboard.press('Backspace')
    await settle(page)
    expect((await readLayout(page)).pages).toBe(1)
    await expect(page.locator(`[${PAGE_BREAK_ATTRIBUTE}]`)).toHaveCount(0)
    await expect(page.locator(editable)).toContainText('Après le saut.')

    await page.keyboard.press('ControlOrMeta+z')
    await expect(page.locator(`[${PAGE_BREAK_ATTRIBUTE}]`)).toHaveCount(1)
    await expect(page.locator(editable)).toBeVisible()
    await settle(page)
    expect((await readLayout(page)).pages).toBe(2)
    expect(await sheetOf(page, 'Après le saut.')).toBe(2)
  })

  test('a page break in the middle of the text moves everything after it', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(30))
    const before = await readLayout(page)
    // A break right after the first heading: the heading alone stays on page 1
    await page.getByText('Chant 1', { exact: true }).click()
    await page.keyboard.press(LINE_END)
    await selectionRead(page)
    await page.keyboard.press('ControlOrMeta+Enter')
    await settle(page)
    const after = await readLayout(page)
    expect(await sheetOf(page, 'Chant 1')).toBe(1)
    expect(after.linesPerPage[0]).toBe(1)
    expect(after.pages).toBeGreaterThanOrEqual(before.pages)
    expect(after.outside).toEqual([])
  })
})

test.describe('Printing', () => {
  // Printing to PDF is a Chromium feature in Playwright
  test.skip(({ browserName }) => browserName !== 'chromium', 'PDF printing is Chromium only')

  test('prints the same pages, line for line', async ({ page, account }) => {
    await openDocument(page, account, prose(60))
    const screen = await readLayout(page)
    await page.emulateMedia({ media: 'print' })
    await settle(page)
    const print = await readLayout(page)
    expect(print.pages).toBe(screen.pages)
    expect(print.linesPerPage).toEqual(screen.linesPerPage)
    expect(print.outside).toEqual([])

    expect(await pdfPageCount(page)).toBe(screen.pages)
  })

  test('prints manual page breaks as new pages, and nothing more', async ({ page, account }) => {
    await openDocument(
      page,
      account,
      documentOf([
        ...prose(8).root.children,
        pageBreakNode(),
        paragraphNode('Après le premier saut.'),
        pageBreakNode(),
        paragraphNode('Après le second saut.'),
      ]),
    )
    const screen = await readLayout(page)
    expect(await sheetOf(page, 'Après le second saut.')).toBe(screen.pages)
    // Straight to paper, as the browser's print does: no screen emulation first
    expect(await pdfPageCount(page)).toBe(screen.pages)
  })
})
