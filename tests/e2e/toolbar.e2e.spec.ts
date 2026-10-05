import type { Page } from '@playwright/test'

import { documentOf, pageBreakNode, paragraphNode } from '../helpers/lexicalContent'
import { type Account, expect, test } from './fixtures'
import {
  editable,
  LINE_END,
  openDocument,
  selectionRead,
  settle,
  sheetOf,
  waitForEditor,
} from './paginationHelpers'

const FIRST = 'Orphée chante pour Eurydice.'
const SECOND = 'Les enfers écoutent.'
const twoParagraphs = () => documentOf([paragraphNode(FIRST), paragraphNode(SECOND)])

// Lexical's bits for text formats, as saved
const BOLD = 1
const ITALIC = 2

// Saving waits for a pause in the changes, then for the server: slower on a busy dev server
const SAVED = { timeout: 15_000 }

type SavedNode = { type: string; text?: string; format?: number | string; children?: SavedNode[] }

// The document's blocks as saved, once saving has caught up
const savedBlocks = async (account: Account, id: string) => {
  const item = await account.payload.findByID({
    collection: 'binder-items',
    id,
    depth: 0,
    overrideAccess: true,
  })
  return ((item.content as { root: SavedNode } | null)?.root.children ?? []) as SavedNode[]
}

// The saved text nodes, block by block flattened
const savedTexts = async (account: Account, id: string) =>
  (await savedBlocks(account, id)).flatMap((block) => block.children ?? [])

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Editor toolbar' })
const tool = (page: Page, name: string) => toolbar(page).getByRole('button', { name, exact: true })
const menuBar = (page: Page) => page.getByRole('menubar')
const menuNamed = (page: Page, name: string) =>
  menuBar(page).getByRole('menuitem', { name, exact: true })

// Selects characters [start, end) of the paragraph holding this text, as a hand dragging over them
async function selectIn(page: Page, text: string, start: number, end: number) {
  await page.locator(`${editable} p`, { hasText: text }).click()
  await page.evaluate(
    ({ editable, text, start, end }) => {
      const paragraph = [...document.querySelectorAll(`${editable} p`)].find(
        (p) => p.textContent === text,
      )!
      const node = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode()!
      window.getSelection()!.setBaseAndExtent(node, start, node, end)
    },
    { editable, text, start, end },
  )
  await selectionRead(page)
}

// The caret at the end of the paragraph holding this text
async function caretAtEndOf(page: Page, text: string) {
  await page.locator(`${editable} p`, { hasText: text }).click()
  await page.keyboard.press(LINE_END)
  await selectionRead(page)
}

// What is selected, and whether the text still has the focus
const selection = (page: Page) =>
  page.evaluate(
    (editable) => ({
      text: window.getSelection()!.toString(),
      writing: Boolean(document.querySelector(editable)?.contains(document.activeElement)),
    }),
    editable,
  )

test.describe('Style toolbar', () => {
  test('bold from the button: the selection stays, in the text, and is saved', async ({
    page,
    account,
  }) => {
    const { document } = await openDocument(page, account, twoParagraphs())
    await selectIn(page, FIRST, 7, 13)
    const bold = tool(page, 'Bold')
    await expect(bold).toHaveAttribute('aria-pressed', 'false')
    await bold.click()

    await expect(bold).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(`${editable} strong`)).toHaveText('chante')
    expect(await selection(page)).toEqual({ text: 'chante', writing: true })
    await expect
      .poll(async () => {
        const node = (await savedTexts(account, document.id)).find((n) => n.text === 'chante')
        return Number(node?.format ?? 0) & BOLD
      }, SAVED)
      .toBe(BOLD)

    // The caret elsewhere: not bold there
    await caretAtEndOf(page, SECOND)
    await expect(bold).toHaveAttribute('aria-pressed', 'false')
  })

  test('italic at a caret applies to what is typed next', async ({ page, account }) => {
    const { document } = await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, FIRST)
    const italic = tool(page, 'Italic')
    await italic.click()
    await expect(italic).toHaveAttribute('aria-pressed', 'true')
    expect((await selection(page)).writing).toBe(true)
    await page.keyboard.type(' Doucement.')

    await expect(page.locator(`${editable} em`)).toHaveText(' Doucement.')
    await expect
      .poll(async () => {
        const node = (await savedTexts(account, document.id)).find((n) => n.text === ' Doucement.')
        return Number(node?.format ?? 0) & ITALIC
      }, SAVED)
      .toBe(ITALIC)
  })

  test('from the keyboard, a control keeps the focus while the text takes the style', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, twoParagraphs())
    await selectIn(page, FIRST, 0, 6)
    const underline = tool(page, 'Underline')
    await underline.focus()
    await page.keyboard.press('Enter')
    await expect(underline).toHaveAttribute('aria-pressed', 'true')
    await expect(underline).toBeFocused()
    // The arrows move along the toolbar
    await page.keyboard.press('ArrowRight')
    await expect(tool(page, 'Strikethrough')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(tool(page, 'Strikethrough')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(`${editable} span`, { hasText: 'Orphée' }).first()).toHaveCSS(
      'text-decoration-line',
      'underline line-through',
    )
  })

  test('alignment applies to the block, and survives a reload', async ({ page, account }) => {
    const { document } = await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, SECOND)
    await tool(page, 'Center').click()
    await expect(tool(page, 'Center')).toHaveAttribute('aria-pressed', 'true')
    await expect(tool(page, 'Align left')).toHaveAttribute('aria-pressed', 'false')
    const second = page.locator(`${editable} p`, { hasText: SECOND })
    await expect(second).toHaveCSS('text-align', 'center')
    expect((await selection(page)).writing).toBe(true)
    await expect
      .poll(async () => (await savedBlocks(account, document.id))[1]?.format, SAVED)
      .toBe('center')

    await page.reload()
    await waitForEditor(page)
    await expect(second).toHaveCSS('text-align', 'center')
    await caretAtEndOf(page, SECOND)
    await expect(tool(page, 'Center')).toHaveAttribute('aria-pressed', 'true')
    // Back to the left: no alignment at all, as a new block has
    await tool(page, 'Align left').click()
    await expect
      .poll(async () => (await savedBlocks(account, document.id))[1]?.format, SAVED)
      .toBe('')
  })

  test('a heading from the paragraph style, and back to normal text', async ({ page, account }) => {
    const { document } = await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, FIRST)
    const style = toolbar(page).getByRole('button', { name: /Paragraph style/ })
    await expect(style).toHaveText('Normal text')
    await style.click()
    await page.getByRole('menuitemradio', { name: 'Heading 1' }).click()

    await expect(page.locator(`${editable} h1`)).toHaveText(FIRST)
    await expect(style).toHaveText('Heading 1')
    expect((await selection(page)).writing).toBe(true)
    await expect
      .poll(async () => (await savedBlocks(account, document.id))[0]?.type, SAVED)
      .toBe('heading')

    await style.click()
    await expect(page.getByRole('menuitemradio', { name: 'Heading 1' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page.getByRole('menuitemradio', { name: 'Normal text' }).click()
    await expect(page.locator(`${editable} h1`)).toHaveCount(0)
    await expect(page.locator(`${editable} p`).first()).toHaveText(FIRST)
    await expect(style).toHaveText('Normal text')
  })

  test('undo and redo, each off when there is nothing to undo or redo', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, FIRST)
    const undo = tool(page, 'Undo')
    const redo = tool(page, 'Redo')
    await expect(undo).toHaveAttribute('aria-disabled', 'true')
    await expect(redo).toHaveAttribute('aria-disabled', 'true')
    // Off: pressing it does nothing
    await undo.click({ force: true })
    await expect(page.locator(`${editable} p`).first()).toHaveText(FIRST)

    await page.keyboard.type(' Encore.')
    await expect(undo).not.toHaveAttribute('aria-disabled')
    await undo.click()
    await expect(page.locator(`${editable} p`).first()).toHaveText(FIRST)
    await expect(undo).toHaveAttribute('aria-disabled', 'true')
    await expect(redo).not.toHaveAttribute('aria-disabled')
    await redo.click()
    await expect(page.locator(`${editable} p`).first()).toHaveText(`${FIRST} Encore.`)
    await expect(redo).toHaveAttribute('aria-disabled', 'true')
    expect((await selection(page)).writing).toBe(true)
  })

  test('a placeholder is greyed out, says so, and does nothing', async ({ page, account }) => {
    await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, FIRST)
    const font = tool(page, 'Font')
    await expect(font).toHaveAttribute('aria-disabled', 'true')
    await font.hover()
    await expect(font.getByText('Font (Coming soon)')).toBeVisible()
    await font.click({ force: true })
    expect((await selection(page)).writing).toBe(true)
  })

  test('is off without a document', async ({ page, account }) => {
    const { composition, document } = await openDocument(page, account, twoParagraphs())
    await account.payload.delete({
      collection: 'binder-items',
      id: document.id,
      overrideAccess: true,
    })
    await page.goto(`/compositions/${composition.id}`)
    await expect(toolbar(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(tool(page, 'Bold')).toHaveAttribute('aria-disabled', 'true')
    await expect(toolbar(page).getByRole('button', { name: /Paragraph style/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})

test.describe('Menu bar', () => {
  test('the keyboard moves between the menus, open or not', async ({ page, account }) => {
    await openDocument(page, account, twoParagraphs())
    const file = menuNamed(page, 'File')
    const edit = menuNamed(page, 'Edit')
    const view = menuNamed(page, 'View')
    // One tab stop for the whole bar
    await expect(file).toHaveAttribute('tabindex', '0')
    await expect(edit).toHaveAttribute('tabindex', '-1')

    await file.focus()
    await page.keyboard.press('ArrowRight')
    await expect(edit).toBeFocused()
    await expect(edit).toHaveAttribute('tabindex', '0')
    await page.keyboard.press('ArrowDown')
    await expect(edit).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeFocused()
    // Disabled items are on the way too
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Redo' })).toBeFocused()

    // Right, inside an open menu: the next menu opens
    await page.keyboard.press('ArrowRight')
    await expect(edit).toHaveAttribute('aria-expanded', 'false')
    await expect(view).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('menuitem', { name: 'Show ruler' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(view).toHaveAttribute('aria-expanded', 'false')
    await expect(view).toBeFocused()
    // Left from the first wraps to the last
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowLeft')
    await expect(menuNamed(page, 'Tools')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: 'Synonyms' })).toBeFocused()
  })

  test('disabled items say they are coming, and do nothing', async ({ page, account }) => {
    await openDocument(page, account, twoParagraphs())
    await menuNamed(page, 'Tools').click()
    const wordCount = page.getByRole('menuitem', { name: 'Word count' })
    await expect(wordCount).toHaveAttribute('aria-disabled', 'true')
    await expect(wordCount).toHaveAttribute('title', 'Coming soon')
    await wordCount.click({ force: true })
    // Still open: nothing was done
    await expect(wordCount).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(wordCount).toBeHidden()
  })

  test('Format applies the toolbar’s styles, its items showing the state', async ({
    page,
    account,
  }) => {
    await openDocument(page, account, twoParagraphs())
    await selectIn(page, FIRST, 7, 13)
    await menuNamed(page, 'Format').click()
    await page.getByRole('menuitemcheckbox', { name: 'Bold' }).click()
    await expect(page.locator(`${editable} strong`)).toHaveText('chante')
    await expect(tool(page, 'Bold')).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await selection(page)).writing).toBe(true)
    expect((await selection(page)).text).toBe('chante')

    await menuNamed(page, 'Format').click()
    await expect(page.getByRole('menuitemcheckbox', { name: 'Bold' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page.getByRole('menuitemradio', { name: 'Justify' }).click()
    await expect(page.locator(`${editable} p`).first()).toHaveCSS('text-align', 'justify')
    await expect(tool(page, 'Justify')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Edit undoes and selects all', async ({ page, account }) => {
    await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, FIRST)
    await menuNamed(page, 'Edit').click()
    await expect(page.getByRole('menuitem', { name: 'Undo' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await page.keyboard.press('Escape')
    await expect.poll(async () => (await selection(page)).writing).toBe(true)
    await page.keyboard.type(' Encore.')

    await menuNamed(page, 'Edit').click()
    await page.getByRole('menuitem', { name: 'Undo' }).click()
    await expect(page.locator(`${editable} p`).first()).toHaveText(FIRST)
    await menuNamed(page, 'Edit').click()
    await page.getByRole('menuitem', { name: 'Select all' }).click()
    await expect.poll(async () => (await selection(page)).text).toContain(SECOND)
    expect((await selection(page)).writing).toBe(true)
  })

  test('Insert › Page break puts what follows on the next page', async ({ page, account }) => {
    const { document } = await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, FIRST)
    await menuNamed(page, 'Insert').click()
    await page.getByRole('menuitem', { name: 'Page break' }).click()
    await expect(page.locator(`${editable} [data-page-break]`)).toHaveCount(1)
    await settle(page)
    expect(await sheetOf(page, FIRST)).toBe(1)
    expect(await sheetOf(page, SECOND)).toBe(2)
    await expect
      .poll(async () => (await savedBlocks(account, document.id)).map((block) => block.type), SAVED)
      .toEqual(['paragraph', pageBreakNode().type, 'paragraph'])
  })

  test('File › Page setup… opens the page setup', async ({ page, account }) => {
    await openDocument(page, account, twoParagraphs())
    await caretAtEndOf(page, FIRST)
    await menuNamed(page, 'File').click()
    await page.getByRole('menuitem', { name: 'Page setup…' }).click()
    const dialog = page.getByRole('dialog', { name: 'Page setup' })
    await expect(dialog).toBeVisible()
    await dialog.locator('label', { hasText: 'Landscape' }).click()
    await expect(dialog.getByRole('radio', { name: 'Landscape' })).toBeChecked()
    // Closed: back in the text
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect.poll(async () => (await selection(page)).writing).toBe(true)
  })
})
