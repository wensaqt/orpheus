import type { Page } from '@playwright/test'

import { MIN_TEXT_AREA, toPageSettings } from '@/lib/pageFormats'

import { MM_TO_PX, toGeometry } from '@front/_components/editor/pagination/pageGeometry'

import { prose } from '../helpers/lexicalContent'
import { type Account, expect, test } from './fixtures'
import {
  A4,
  editable,
  END_OF_TEXT,
  openDocument,
  readLayout,
  selectionRead,
  settle,
  sheetSelector,
  waitForEditor,
} from './paginationHelpers'

// The composition's page settings as saved, once saving has caught up
const saved = (account: Account, id: string) =>
  account.payload.findByID({ collection: 'compositions', id, depth: 0, overrideAccess: true })
const savedPage = (account: Account, id: string) => saved(account, id).then(({ page }) => page)

// Saving waits for a pause in the changes, then for the server: slower on a busy dev server
const SAVED = { timeout: 15_000 }

const firstSheet = async (page: Page) => (await page.locator(sheetSelector).first().boundingBox())!

/*
 * How far the first and second lines of a paragraph start from the text's left edge, in mm:
 * the first-line indent, then none
 */
const lineStarts = (page: Page, text: string) =>
  page.evaluate(
    ({ text, editable, mm }) => {
      const editor = document.querySelector(editable)!
      const paragraph = [...editor.querySelectorAll('p')].find((p) => p.textContent === text)!
      // The text itself: a range over the paragraph also counts its inline boxes
      const range = document.createRange()
      range.selectNodeContents(
        document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode()!,
      )
      // The first box of each line (engines may add empty ones where a line wraps)
      const boxes = [...range.getClientRects()].filter((box) => box.width > 0)
      const first = boxes[0]
      const second = boxes.find((box) => box.top > first.top + 1)
      const left = editor.getBoundingClientRect().left
      return [first.left - left, (second?.left ?? Number.NaN) - left].map((offset) => offset / mm)
    },
    { text, editable, mm: MM_TO_PX },
  )

// From the menu bar, as a hand would
async function openPageSetup(page: Page) {
  await page.getByRole('menubar').getByRole('menuitem', { name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'Page setup…' }).click()
}

// A choice of the page setup, clicked as a hand would: on its label (the radio is unseen)
const choose = (page: Page, name: string) =>
  page.getByRole('dialog', { name: 'Page setup' }).locator('label', { hasText: name }).click()

test.describe('Editor header', () => {
  test('stays on screen with the composition and document titles', async ({ page, account }) => {
    const { document } = await openDocument(page, account, prose(30))
    const header = page.locator('header').filter({ has: page.getByLabel('Document title') })
    await expect(page.getByLabel('Composition title')).toHaveValue('Pages')
    await expect(page.getByLabel('Document title')).toHaveValue(document.title)

    await page.evaluate(() => window.scrollTo(0, 3000))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000)
    expect((await header.boundingBox())!.y).toBeCloseTo(0, 0)
    await expect(page.getByLabel('Document title')).toBeInViewport()

    // Renamed from the header: the binder follows, and the name is kept
    await page.getByLabel('Document title').fill('Le chant')
    await expect(page.getByRole('treeitem', { name: 'Le chant' })).toBeVisible()
    await expect
      .poll(
        async () =>
          (await account.payload.findByID({ collection: 'binder-items', id: document.id })).title,
      )
      .toBe('Le chant')
  })

  test('is left out of print', async ({ page, account }) => {
    await openDocument(page, account, prose(2))
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('toolbar', { name: 'Editor toolbar' })).toBeHidden()
    await expect(page.getByRole('menubar')).toBeHidden()
    await expect(page.getByRole('group', { name: 'Ruler' })).toBeHidden()
    // Nothing above the pages: the first one starts at the top of the paper
    await page.evaluate(() => window.scrollTo(0, 0))
    expect((await firstSheet(page)).y).toBeCloseTo(0, 0)
  })

  test('without a document, holds the composition alone', async ({ page, account }) => {
    const { composition, document } = await openDocument(page, account, prose(2))
    await account.payload.delete({
      collection: 'binder-items',
      id: document.id,
      overrideAccess: true,
    })
    await page.goto(`/compositions/${composition.id}`)
    await expect(page.getByLabel('Composition title')).toHaveValue('Pages')
    await expect(page.getByLabel('Document title')).toHaveCount(0)
    await expect(page.locator('header').getByText('›')).toBeHidden()
    await expect(page.getByRole('group', { name: 'Ruler' })).toHaveCount(0)

    // A new document takes its place in the header
    await page
      .getByRole('navigation', { name: 'Binder' })
      .getByRole('button', { name: 'New document' })
      .click()
    await expect(page.getByLabel('Document title')).toBeVisible()
    await expect(page.locator('header').getByText('›')).toBeVisible()
  })
})

test.describe('Page setup', () => {
  test('a format applies at once, and stays', async ({ page, account }) => {
    const { composition } = await openDocument(page, account, prose(30))
    await openPageSetup(page)
    await choose(page, 'A5')
    await expect(page.getByRole('radio', { name: 'A5' })).toBeChecked()
    const a5 = toGeometry(toPageSettings({ format: 'A5', orientation: 'portrait' }))
    await expect.poll(async () => (await firstSheet(page)).width).toBeCloseTo(a5.width, 0)
    await expect
      .poll(async () => (await savedPage(account, composition.id)).format, SAVED)
      .toBe('A5')

    await page.reload()
    await waitForEditor(page)
    expect((await firstSheet(page)).width).toBeCloseTo(a5.width, 0)
    expect((await readLayout(page)).outside).toEqual([])
  })

  test('landscape turns the pages', async ({ page, account }) => {
    const { composition } = await openDocument(page, account, prose(30))
    await openPageSetup(page)
    await choose(page, 'Landscape')
    await expect(page.getByRole('radio', { name: 'Landscape' })).toBeChecked()
    await expect.poll(async () => (await firstSheet(page)).width).toBeCloseTo(A4.height, 0)
    await settle(page)
    expect((await readLayout(page)).outside).toEqual([])
    await expect
      .poll(async () => (await savedPage(account, composition.id)).orientation, SAVED)
      .toBe('landscape')
  })

  test('the top margin moves the first line down', async ({ page, account }) => {
    const { composition } = await openDocument(page, account, prose(30))
    await openPageSetup(page)
    await page.getByRole('spinbutton', { name: 'Top' }).fill('40')
    await page.keyboard.press('Escape')
    await settle(page)
    expect((await readLayout(page, { top: 40 * MM_TO_PX, bottom: A4.bottom })).outside).toEqual([])
    const sheet = await firstSheet(page)
    const text = (await page.locator(editable).boundingBox())!
    expect(text.y - sheet.y).toBeGreaterThanOrEqual(40 * MM_TO_PX - 1)
    await expect
      .poll(async () => (await savedPage(account, composition.id)).margins?.top, SAVED)
      .toBe(40)
  })

  test('a smaller format shrinks margins that no longer fit', async ({ page, account }) => {
    const margins = { top: 25, right: 60, bottom: 25, left: 60 }
    const { composition } = await openDocument(page, account, prose(10), { margins })
    await openPageSetup(page)
    await choose(page, 'A5')
    await expect(page.getByRole('radio', { name: 'A5' })).toBeChecked()
    // The ruler shows them shrunk, and the text still fits its pages
    const shrunk = String((148 - MIN_TEXT_AREA) / 2)
    await expect(page.getByRole('slider', { name: 'Left margin' })).toHaveAttribute(
      'aria-valuenow',
      shrunk,
    )
    await settle(page)
    expect((await readLayout(page, { top: 25 * MM_TO_PX, bottom: 25 * MM_TO_PX })).outside).toEqual(
      [],
    )
    await expect
      .poll(async () => String((await savedPage(account, composition.id)).margins?.left), SAVED)
      .toBe(shrunk)
  })

  test('a margin field can be emptied and typed again', async ({ page, account }) => {
    const { composition } = await openDocument(page, account, prose(5))
    await openPageSetup(page)
    const top = page.getByRole('spinbutton', { name: 'Top' })
    await top.click()
    await top.press('ControlOrMeta+a')
    await top.press('Backspace')
    await expect(top).toHaveValue('')
    await top.pressSequentially('32')
    await expect(top).toHaveValue('32')
    await expect
      .poll(async () => (await savedPage(account, composition.id)).margins?.top, SAVED)
      .toBe(32)
  })
})

test.describe('Ruler', () => {
  test('dragging the left margin moves the text, and saves', async ({ page, account }) => {
    const { composition } = await openDocument(page, account, prose(30))
    const handle = page.getByRole('slider', { name: 'Left margin' })
    const box = (await handle.boundingBox())!
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    // 20 mm to the right, in a few steps like a hand
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 20 * MM_TO_PX, start.y, { steps: 5 })
    await page.mouse.up()
    await settle(page)
    // To the half millimetre the pointer lands on
    const left = Number(await handle.getAttribute('aria-valuenow'))
    expect(Math.abs(left - 45)).toBeLessThanOrEqual(0.5)

    const sheet = await firstSheet(page)
    const text = (await page.locator(editable).boundingBox())!
    expect(text.x - sheet.x).toBeCloseTo(left * MM_TO_PX, 0)
    expect((await readLayout(page)).outside).toEqual([])
    await expect
      .poll(async () => (await savedPage(account, composition.id)).margins?.left, SAVED)
      .toBe(left)
  })

  test('the keyboard moves a margin, never past the smallest text area', async ({
    page,
    account,
  }) => {
    const { composition } = await openDocument(page, account, prose(5))
    const handle = page.getByRole('slider', { name: 'Right margin' })
    await handle.focus()
    // The right handle moves the way the arrow points: left widens the margin
    for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowLeft')
    await expect(handle).toHaveAttribute('aria-valuenow', '28')
    await page.keyboard.press('End')
    const max = 210 - MIN_TEXT_AREA - 25
    await expect(handle).toHaveAttribute('aria-valuenow', String(max))
    await page.keyboard.press('ArrowLeft')
    await expect(handle).toHaveAttribute('aria-valuenow', String(max))
    await expect
      .poll(async () => (await savedPage(account, composition.id)).margins?.right, SAVED)
      .toBe(max)
  })

  test('the first-line indent starts every paragraph further in', async ({ page, account }) => {
    const { composition } = await openDocument(page, account, prose(30))
    const handle = page.getByRole('slider', { name: 'First-line indent' })
    await expect(handle).toHaveAttribute('aria-valuenow', '0')
    const box = (await handle.boundingBox())!
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 10 * MM_TO_PX, start.y, { steps: 5 })
    await page.mouse.up()
    await settle(page)
    const indent = Number(await handle.getAttribute('aria-valuenow'))
    expect(Math.abs(indent - 10)).toBeLessThanOrEqual(0.5)
    // The left margin did not move
    await expect(page.getByRole('slider', { name: 'Left margin' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    )

    const paragraph = (await page.locator(`${editable} p`).first().textContent())!
    const [first, second] = await lineStarts(page, paragraph)
    expect(first).toBeCloseTo(indent, 0)
    expect(second).toBeCloseTo(0, 0)
    expect((await readLayout(page)).outside).toEqual([])

    // A new paragraph, after Enter, starts indented too
    await page.locator(editable).click()
    await page.keyboard.press(END_OF_TEXT)
    await selectionRead(page)
    await page.keyboard.press('Enter')
    const typed =
      'Un nouveau paragraphe, assez long pour tenir sur deux lignes au moins de la page.'
    await page.keyboard.type(`${typed} ${typed}`)
    const [newFirst, newSecond] = await lineStarts(page, `${typed} ${typed}`)
    expect(newFirst).toBeCloseTo(indent, 0)
    expect(newSecond).toBeCloseTo(0, 0)
    await expect
      .poll(async () => (await saved(account, composition.id)).typography?.firstLineIndent, SAVED)
      .toBe(indent)

    await page.reload()
    await waitForEditor(page)
    await expect(handle).toHaveAttribute('aria-valuenow', String(indent))
    expect((await lineStarts(page, paragraph))[0]).toBeCloseTo(indent, 0)
  })

  // The ruler is over the sheet whatever the window: its margin handle on the text's edge
  for (const { width, binder, orientation } of [
    { width: 1280, binder: 'shown', orientation: 'portrait' },
    { width: 1280, binder: 'hidden', orientation: 'portrait' },
    { width: 1600, binder: 'shown', orientation: 'portrait' },
    { width: 1600, binder: 'hidden', orientation: 'landscape' },
    { width: 700, binder: 'shown', orientation: 'portrait' },
  ] as const) {
    test(`lines up with the sheet: ${width}px, binder ${binder}, ${orientation}`, async ({
      page,
      account,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await openDocument(page, account, prose(5), { orientation })
      if (binder === 'hidden') await page.getByRole('button', { name: 'Hide binder' }).click()
      await settle(page)
      const ruler = (await page.getByRole('group', { name: 'Ruler' }).boundingBox())!
      const sheet = await firstSheet(page)
      expect(Math.abs(ruler.x - sheet.x)).toBeLessThanOrEqual(1.5)
      const handle = (await page.getByRole('slider', { name: 'Left margin' }).boundingBox())!
      const text = (await page.locator(editable).boundingBox())!
      expect(Math.abs(handle.x + handle.width / 2 - text.x)).toBeLessThanOrEqual(1.5)
    })
  }

  test('the keyboard moves the first-line indent', async ({ page, account }) => {
    await openDocument(page, account, prose(5))
    const handle = page.getByRole('slider', { name: 'First-line indent' })
    await handle.focus()
    for (let step = 0; step < 5; step++) await page.keyboard.press('ArrowRight')
    await expect(handle).toHaveAttribute('aria-valuenow', '5')
    await page.keyboard.press('Home')
    await expect(handle).toHaveAttribute('aria-valuenow', '0')
  })
})

test.describe('Writing while setting the pages', () => {
  // Where the caret is: the text it is in and its offset there, and whether the text has focus
  const caret = (page: Page) =>
    page.evaluate((editable) => {
      const selection = window.getSelection()!
      return {
        text: selection.anchorNode?.textContent ?? '',
        offset: selection.anchorOffset,
        writing: Boolean(document.querySelector(editable)?.contains(document.activeElement)),
      }
    }, editable)

  test('dragging a margin leaves the caret where it was, in the text', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(10))
    await page.getByText('Chant 1', { exact: true }).click()
    const before = await caret(page)
    expect(before.writing).toBe(true)

    const box = (await page.getByRole('slider', { name: 'Left margin' }).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 10 * MM_TO_PX, box.y + box.height / 2, {
      steps: 4,
    })
    await page.mouse.up()
    await settle(page)
    expect(await caret(page)).toEqual(before)
    // Typing goes on where it was
    await page.keyboard.insertText('!')
    await expect(page.locator(editable)).toContainText(
      `${before.text.slice(0, before.offset)}!${before.text.slice(before.offset)}`,
    )
  })

  test('closing the page setup goes back to the text', async ({ page, account }) => {
    await openDocument(page, account, prose(10))
    await page.getByText('Chant 1', { exact: true }).click()
    const before = await caret(page)
    await openPageSetup(page)
    await page.getByRole('spinbutton', { name: 'Top' }).fill('30')
    await page.keyboard.press('Escape')
    await expect.poll(async () => (await caret(page)).writing).toBe(true)
    expect(await caret(page)).toEqual(before)
  })

  test('opened from the keyboard, the page setup closes back on the menu bar', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(10))
    const file = page.getByRole('menubar').getByRole('menuitem', { name: 'File' })
    await file.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Page setup…' })).toBeFocused()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Page setup' })
    await expect(dialog).toBeVisible()
    // The current format has the focus, the arrows choose another
    await expect(dialog.getByRole('radio', { name: 'A4' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(file).toBeFocused()
  })

  test('a click in the text closes the page setup, the caret where clicked', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, prose(10))
    await page.getByText('Chant 1', { exact: true }).click()
    await openPageSetup(page)
    const paragraph = page.locator(`${editable} p`).nth(1)
    await paragraph.click()
    await expect(page.getByRole('dialog', { name: 'Page setup' })).toBeHidden()
    const after = await caret(page)
    expect(after.writing).toBe(true)
    expect(after.text).toBe(await paragraph.textContent())
  })
})
