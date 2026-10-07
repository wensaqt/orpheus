import type { Page } from '@playwright/test'
import { MM_TO_PX } from '@front/_components/editor/pagination/constants'
import { prose } from '../helpers/lexicalContent'
import { boxOf, expect, test } from './fixtures'
import { editable, END_OF_TEXT, openDocument, waitForEditor } from './paginationHelpers'
import { item, itemMenu, openEditor, seed } from './binderHelpers'

const menu = (page: Page, name: string) =>
  page.getByRole('menubar').getByRole('menuitem', { name, exact: true })
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Editor toolbar' })
async function undo(page: Page) {
  const button = toolbar(page).getByRole('button', { name: 'Undo', exact: true })
  await expect(button).not.toHaveAttribute('aria-disabled', 'true')
  await button.click()
}
async function redo(page: Page) {
  const button = toolbar(page).getByRole('button', { name: 'Redo', exact: true })
  await expect(button).not.toHaveAttribute('aria-disabled', 'true')
  await button.click()
}

test('a margin drag undoes before text, as one gesture, then redoes in order', async ({
  page,
  account,
}) => {
  const { composition } = await openDocument(page, account, prose(1))
  await page.locator(editable).click()
  await page.keyboard.press(END_OF_TEXT)
  await page.keyboard.type(' Added text')
  await expect(page.locator(editable)).toContainText('Added text')
  const handle = page.getByRole('slider', { name: 'Left margin' })
  const box = await boxOf(handle)
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 10 * MM_TO_PX, y, { steps: 6 })
  await page.mouse.up()
  const changed = await handle.getAttribute('aria-valuenow')
  expect(changed).not.toBe('25')
  // Dragging preserves the text focus: the shortcut must still undo layout first.
  await page.keyboard.press('ControlOrMeta+z')
  await expect(handle).toHaveAttribute('aria-valuenow', '25')
  await expect(page.locator(editable)).toContainText('Added text')
  await undo(page)
  await expect(page.locator(editable)).not.toContainText('Added text')
  await redo(page)
  await expect(page.locator(editable)).toContainText('Added text')
  await redo(page)
  await expect(handle).toHaveAttribute('aria-valuenow', changed!)
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'compositions', id: composition.id })).page
          .margins?.left,
    )
    .toBe(Number(changed))
})

test('numeric margin undo updates its focused draft and saves the restored value', async ({
  page,
  account,
}) => {
  const { composition } = await openDocument(page, account, prose(1))
  await menu(page, 'File').click()
  await page.getByRole('menuitem', { name: 'Page setup…' }).click()
  const top = page.getByRole('spinbutton', { name: 'Top' })
  await top.fill('')
  await top.pressSequentially('32')
  await expect(top).toHaveValue('32')
  await top.press('ControlOrMeta+z')
  await expect(top).toHaveValue('25')
  await top.press('ControlOrMeta+Shift+z')
  await expect(top).toHaveValue('32')
  await top.fill('40')
  await top.press('ControlOrMeta+z')
  await expect(top).toHaveValue('32')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'compositions', id: composition.id })).page
          .margins?.top,
    )
    .toBe(32)
})

test('renames from the header and binder, and moves, share undo and redo', async ({
  page,
  account,
}) => {
  const { composition, items } = await seed(account, [
    { key: 'folder', kind: 'folder', title: 'Part I' },
    { key: 'document', title: 'Loose page' },
  ])
  await openEditor(page, `/compositions/${composition.id}/${items.document.id}`)
  const title = page.getByLabel('Document title')
  await title.fill('Revised title')
  await page.locator(editable).click()
  await undo(page)
  await expect(title).toHaveValue('Loose page')
  await redo(page)
  await expect(title).toHaveValue('Revised title')
  await itemMenu(page, 'Revised title', 'Rename')
  await page.getByLabel('New title for “Revised title”').fill('Chant')
  await page.getByLabel('New title for “Revised title”').press('Enter')
  await expect(item(page, 'Chant')).toBeVisible()
  await itemMenu(page, 'Chant', 'Move to…')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Part I').check()
  await dialog.getByRole('button', { name: 'Move here' }).click()
  await expect(item(page, 'Chant')).toHaveAttribute('aria-level', '2')
  await undo(page)
  await expect(item(page, 'Chant')).toHaveAttribute('aria-level', '1')
  await undo(page)
  await expect(item(page, 'Revised title')).toBeVisible()
  await expect(title).toHaveValue('Revised title')
  await redo(page)
  await expect(item(page, 'Chant')).toBeVisible()
  await redo(page)
  await expect(item(page, 'Chant')).toHaveAttribute('aria-level', '2')
  await expect
    .poll(async () => {
      const stored = await account.payload.findByID({
        collection: 'binder-items',
        id: items.document.id,
        depth: 0,
      })
      return [stored.title, stored.parent]
    })
    .toEqual(['Chant', items.folder.id])
})

test('text undo reopens the previous document after navigation', async ({ page, account }) => {
  const { composition, items } = await seed(account, [{ key: 'second', title: 'Second document' }])
  await openEditor(page, `/compositions/${composition.id}`)
  await page.locator(editable).click()
  await page.keyboard.type('Original writing')
  await item(page, 'Second document').click()
  await expect(page.getByLabel('Document title')).toHaveValue('Second document')
  await undo(page)
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')
  await expect(page.locator(editable)).not.toContainText('Original writing')
  await redo(page)
  await expect(page.locator(editable)).toContainText('Original writing')
  await item(page, 'Second document').click()
  await expect(page.getByLabel('Document title')).toHaveValue('Second document')
  const first = await account.payload.find({
    collection: 'binder-items',
    where: {
      and: [{ composition: { equals: composition.id } }, { id: { not_equals: items.second.id } }],
    },
    depth: 0,
  })
  expect(JSON.stringify(first.docs[0].content)).toContain('Original writing')
})

test('ruler and synonyms menu checks follow visibility and remembered preferences', async ({
  page,
  account,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await openDocument(page, account, prose(1))
  await menu(page, 'View').click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Show ruler' })).toBeChecked()
  await page.getByRole('menuitemcheckbox', { name: 'Show ruler' }).click()
  await expect(page.getByRole('group', { name: 'Ruler' })).toHaveCount(0)
  await menu(page, 'Tools').click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Synonyms' })).toBeChecked()
  await test.step(`toggle synonyms at ${page.viewportSize()?.width}px, checked ${await page.getByRole('menuitemcheckbox', { name: 'Synonyms' }).getAttribute('aria-checked')}`, async () => {
    await page.getByRole('menuitemcheckbox', { name: 'Synonyms' }).click()
    await expect(page.getByRole('menu', { name: 'Tools', exact: true })).toBeHidden()
  })
  await expect(page.getByRole('button', { name: 'Show synonyms' })).toBeVisible()
  await page.reload()
  await waitForEditor(page)
  await expect(page.getByRole('group', { name: 'Ruler' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show synonyms' })).toBeVisible()
  await page.getByRole('button', { name: 'Show synonyms' }).click()
  await menu(page, 'Tools').click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Synonyms' })).toBeChecked()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Synonyms' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Tools', exact: true })).toBeHidden()
  await page.setViewportSize({ width: 700, height: 900 })
  await expect(page.getByRole('button', { name: 'Show synonyms' })).toBeVisible()
  await menu(page, 'Tools').click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Synonyms' })).not.toBeChecked()
  await test.step(`toggle synonyms at ${page.viewportSize()?.width}px, checked ${await page.getByRole('menuitemcheckbox', { name: 'Synonyms' }).getAttribute('aria-checked')}`, async () => {
    await page.getByRole('menuitemcheckbox', { name: 'Synonyms' }).click()
    await expect(page.getByRole('menu', { name: 'Tools', exact: true })).toBeHidden()
  })
  await expect(page.getByRole('button', { name: 'Hide synonyms' })).toBeVisible()
  await menu(page, 'Tools').click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Synonyms' })).toBeChecked()
  await test.step(`toggle synonyms at ${page.viewportSize()?.width}px, checked ${await page.getByRole('menuitemcheckbox', { name: 'Synonyms' }).getAttribute('aria-checked')}`, async () => {
    await page.getByRole('menuitemcheckbox', { name: 'Synonyms' }).click()
    await expect(page.getByRole('menu', { name: 'Tools', exact: true })).toBeHidden()
  })
  await expect(page.getByRole('button', { name: 'Show synonyms' })).toBeVisible()
})

test('undo restores a format together with margins fitted to it, from a focused radio', async ({
  page,
  account,
}) => {
  await openDocument(page, account, prose(1), {
    margins: { top: 25, right: 60, bottom: 25, left: 60 },
  })
  await menu(page, 'File').click()
  await page.getByRole('menuitem', { name: 'Page setup…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Page setup' })
  await dialog.locator('label', { hasText: 'A5' }).click()
  const a5 = dialog.getByRole('radio', { name: 'A5' })
  await expect(a5).toBeChecked()
  await expect(page.getByRole('slider', { name: 'Left margin' })).not.toHaveAttribute(
    'aria-valuenow',
    '60',
  )
  await a5.press('ControlOrMeta+z')
  await expect(dialog.getByRole('radio', { name: 'A4' })).toBeChecked()
  await expect(page.getByRole('slider', { name: 'Left margin' })).toHaveAttribute(
    'aria-valuenow',
    '60',
  )
  await a5.press('ControlOrMeta+Shift+z')
  await expect(a5).toBeChecked()
  await expect(page.getByRole('slider', { name: 'Left margin' })).not.toHaveAttribute(
    'aria-valuenow',
    '60',
  )
})

test('a conflicting rename refuses undo and preserves the other tab’s title', async ({
  page,
  account,
}) => {
  const { composition, items } = await seed(account, [
    { key: 'folder', kind: 'folder', title: 'Part I' },
  ])
  await openEditor(page, `/compositions/${composition.id}`)
  await itemMenu(page, 'Part I', 'Rename')
  const input = page.getByLabel('New title for “Part I”')
  await input.fill('Part II')
  await input.press('Enter')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: items.folder.id })).title,
    )
    .toBe('Part II')
  await account.payload.update({
    collection: 'binder-items',
    id: items.folder.id,
    data: { title: 'Another tab' },
  })
  await undo(page)
  await expect(page.getByRole('alert').filter({ hasText: 'Could not undo or redo' })).toBeVisible()
  await expect(item(page, 'Part II')).toBeVisible()
  expect(
    (await account.payload.findByID({ collection: 'binder-items', id: items.folder.id })).title,
  ).toBe('Another tab')
  await expect(toolbar(page).getByRole('button', { name: 'Redo', exact: true })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await expect(
    toolbar(page).getByRole('button', { name: 'Undo', exact: true }),
  ).not.toHaveAttribute('aria-disabled', 'true')
})
