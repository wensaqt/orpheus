import {
  PAGE_BREAK_ATTRIBUTE,
  PAGE_BREAK_TYPE,
} from '@front/_components/editor/nodes/PageBreakNode'
import { toGeometry } from '@front/_components/editor/pagination/pageGeometry'

import { documentOf, pageBreakNode, paragraphNode, prose } from '../helpers/lexicalContent'
import { expect, test } from './fixtures'
import {
  A4,
  caretTop,
  editable,
  END_OF_TEXT,
  lastLineOf,
  LINE_END,
  LINE_START,
  openDocument,
  readLayout,
  selectionRead,
  settle,
  sheetOf,
  sheetSelector,
  waitForEditor,
} from './paginationHelpers'

test.describe('Pagination', () => {
  test('an empty document is one page of its format', async ({ page, account }) => {
    await openDocument(page, account, {
      root: {
        type: 'root',
        version: 1,
        children: [paragraphNode('')],
        direction: null,
        format: '',
        indent: 0,
      },
    })
    const layout = await readLayout(page)
    expect([layout.pages, layout.sheets]).toEqual([1, 1])
    const sheet = (await page.locator(sheetSelector).first().boundingBox())!
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
    const sheet2 = (await page.locator(sheetSelector).nth(1).boundingBox())!
    const line = (await page.getByText('Sur la page suivante.').boundingBox())!
    expect(line.y).toBeGreaterThan(sheet2.y)

    for (let step = 0; step < 40; step++) await page.keyboard.press('ControlOrMeta+z')
    await settle(page)
    expect((await readLayout(page)).pages).toBe(1)
  })

  test('the arrows and the selection cross from one page to the next', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(30))
    const last = (await lastLineOf(page, 1))!
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
    const selected = await page.evaluate(() => window.getSelection()!.toString())
    expect(selected.length).toBeGreaterThan(80)
  })

  test('deleting across a page edge, then undoing, keeps the pages right', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(30))
    const textBefore = await page.locator(editable).textContent()
    const pagesBefore = (await readLayout(page)).pages
    const last = (await lastLineOf(page, 1))!
    await page.mouse.click(last.x, last.y)
    // Select from the end of page 1 into page 2, and delete it
    await page.keyboard.down('Shift')
    for (let line = 0; line < 3; line++) await page.keyboard.press('ArrowDown')
    await page.keyboard.up('Shift')
    await page.keyboard.press('Backspace')
    await settle(page)
    const afterDelete = await readLayout(page)
    expect(afterDelete.outside).toEqual([])
    expect((await page.locator(editable).textContent())!.length).toBeLessThan(textBefore!.length)

    await page.keyboard.press('ControlOrMeta+z')
    await settle(page)
    expect(await page.locator(editable).textContent()).toBe(textBefore)
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
    const last = (await lastLineOf(page, 1))!
    // Between the bottom of page 1 and the top of page 2
    await page.mouse.click(last.x, last.pageBottom + 8)
    const length = (await page.locator(editable).textContent())!.length
    await page.keyboard.insertText('x')
    expect((await page.locator(editable).textContent())!.length).toBe(length + 1)
  })

  test('a click below the last line puts the caret in the text', async ({ page, account }) => {
    await openDocument(page, account, documentOf([paragraphNode('Une seule ligne.')]))
    const sheet = (await page.locator(sheetSelector).first().boundingBox())!
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
    const pageBreak = (await page.locator(`[${PAGE_BREAK_ATTRIBUTE}]`).boundingBox())!
    await page.mouse.click(pageBreak.x + pageBreak.width / 2, pageBreak.y + pageBreak.height / 2)
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
    const sheet2 = (await page.locator(sheetSelector).nth(1).boundingBox())!
    const line = (await page.getByText('Une nouvelle page.').boundingBox())!
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
    const sheet = (await page.locator(sheetSelector).first().boundingBox())!
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
      } as never,
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

  test('landscape pages are the format turned', async ({ page, account }) => {
    await openDocument(page, account, prose(30), { orientation: 'landscape' })
    const sheet = (await page.locator(sheetSelector).first().boundingBox())!
    expect(sheet.width).toBeCloseTo(A4.height, 0)
    expect(sheet.height).toBeCloseTo(A4.width, 0)
    const layout = await readLayout(page)
    expect(layout.pages).toBeGreaterThan(5)
    expect(layout.outside).toEqual([])
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

    const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1')
    const pdfPages = pdf.match(/\/Type\s*\/Page(?!s)/g)?.length
    expect(pdfPages).toBe(screen.pages)
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
    const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1')
    expect(pdf.match(/\/Type\s*\/Page(?!s)/g)?.length).toBe(screen.pages)
  })
})
