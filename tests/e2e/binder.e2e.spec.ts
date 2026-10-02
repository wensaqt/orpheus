import type { Id } from '@/lib/ids'

import { ID, item, itemMenu, openEditor, seed } from './binderHelpers'
import { expect, test } from './fixtures'

test.describe('Binder', () => {
  test('each document has its own URL and text, saved before switching', async ({
    page,
    account,
  }) => {
    const { composition, items } = await seed(account, [{ key: 'second', title: 'Chant II' }])
    const tree = await openEditor(page, `/compositions/${composition.id}`)
    // The composition opens its first document
    await expect(page).toHaveURL(new RegExp(`/compositions/${ID}/${ID}$`))
    await expect(tree.locator('[aria-current="page"]')).toHaveAccessibleName('Untitled document')

    await item(page, 'Chant II').click()
    await expect(page).toHaveURL(new RegExp(`/compositions/${composition.id}/${items.second.id}$`))
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    await page.locator('[contenteditable="true"]').click()
    await page.keyboard.type('Eurydice follows.')
    await expect(page.locator('[contenteditable="true"]')).toContainText('Eurydice follows.')
    // Right away, before the save delay: leaving the document sends its changes
    await item(page, 'Untitled document').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')
    await expect(page.locator('[contenteditable="true"]')).not.toContainText('Eurydice')

    // Leaving waited for the save: it is already there, with no time given to the autosave
    const saved = await account.payload.findByID({
      collection: 'binder-items',
      id: items.second.id,
    })
    expect(JSON.stringify(saved.content)).toContain('Eurydice follows.')
    await item(page, 'Chant II').click()
    await expect(page.locator('[contenteditable="true"]')).toContainText('Eurydice follows.')
  })

  test('creates, renames and deletes folders and documents', async ({ page, account }) => {
    const { composition } = await seed(account)
    await openEditor(page, `/compositions/${composition.id}`)

    await page.getByRole('button', { name: 'New folder' }).click()
    const rename = page.getByLabel('New title for “New folder”')
    await rename.fill('Part I')
    await rename.press('Enter')
    await expect(item(page, 'Part I')).toBeVisible()

    await itemMenu(page, 'Part I', 'New document inside')
    // The new document opens (the current one, inside the folder); its title, typed on the sheet,
    // renames it in the binder too
    await expect(page.locator('[role="treeitem"][aria-current="page"]')).toHaveAttribute(
      'aria-level',
      '2',
    )
    await page.getByLabel('Document title').fill('Chant de la descente')
    await expect(item(page, 'Chant de la descente')).toHaveAttribute('aria-level', '2')

    await itemMenu(page, 'Part I', 'Delete')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(
      'This folder and the item inside it will be deleted. This cannot be undone.',
    )
    await dialog.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('status').filter({ hasText: '“Part I” deleted' })).toBeVisible()
    await expect(item(page, 'Part I')).toHaveCount(0)
    await expect(item(page, 'Chant de la descente')).toHaveCount(0)
    // The open document went with the folder: back to the composition's first document
    await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')
  })

  test('moves items with “Move to…” and by drag and drop', async ({ page, account }) => {
    const { composition, items } = await seed(account, [
      { key: 'part', kind: 'folder', title: 'Part I' },
      { key: 'loose', title: 'Loose page' },
      { key: 'last', title: 'Last page' },
    ])
    await openEditor(page, `/compositions/${composition.id}`)

    await itemMenu(page, 'Loose page', 'Move to…')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Part I').check()
    await dialog.getByRole('button', { name: 'Move here' }).click()
    await expect(item(page, 'Loose page')).toHaveAttribute('aria-level', '2')

    // Drag "Last page" onto the top half of the first document: it goes before it
    await item(page, 'Last page').dragTo(item(page, 'Untitled document'), {
      targetPosition: { x: 40, y: 2 },
    })
    await expect(page.getByRole('treeitem').first()).toHaveAccessibleName('Last page')

    await expect
      .poll(async () => {
        // Depth 0: the parent as an id, not the populated folder
        const read = (id: Id) =>
          account.payload.findByID({ collection: 'binder-items', id, depth: 0 })
        const [moved, last] = await Promise.all([read(items.loose.id), read(items.last.id)])
        return [moved.parent, last.position]
      })
      .toEqual([items.part.id, 0])
  })

  test('a document dropped on a folder goes inside it, even a closed one', async ({
    page,
    account,
  }) => {
    const { composition, items } = await seed(account, [
      { key: 'part', kind: 'folder', title: 'Part I' },
      { key: 'inside', title: 'Already inside', parent: 'part' },
      { key: 'loose', title: 'Loose page' },
    ])
    await openEditor(page, `/compositions/${composition.id}`)
    // Closed: dropping on it must still work, and open it
    await item(page, 'Part I').click()
    await expect(item(page, 'Already inside')).toHaveCount(0)

    // The middle of the folder's line means "inside"; its edges, "before" and "after"
    const folder = item(page, 'Part I')
    const box = (await folder.boundingBox())!
    await item(page, 'Loose page').dragTo(folder, {
      targetPosition: { x: box.width / 2, y: box.height / 2 },
    })
    await expect(item(page, 'Loose page')).toHaveAttribute('aria-level', '2')
    await expect(item(page, 'Already inside')).toBeVisible()
    await expect
      .poll(async () => {
        const moved = await account.payload.findByID({
          collection: 'binder-items',
          id: items.loose.id,
          depth: 0,
        })
        return [moved.parent, moved.position]
      })
      .toEqual([items.part.id, 1])
  })

  test('works with the keyboard and remembers folded folders', async ({ page, account }) => {
    const { composition } = await seed(account, [
      { key: 'part', kind: 'folder', title: 'Part I' },
      { key: 'chant', title: 'Chant I', parent: 'part' },
    ])
    await openEditor(page, `/compositions/${composition.id}`)

    // Tab reaches the open document; the arrows go down the tree, Enter opens
    await item(page, 'Untitled document').focus()
    await page.keyboard.press('ArrowDown')
    await expect(item(page, 'Part I')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Document title')).toHaveValue('Chant I')

    await item(page, 'Part I').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(item(page, 'Part I')).toHaveAttribute('aria-expanded', 'false')
    await expect(item(page, 'Chant I')).toHaveCount(0)

    await page.keyboard.press('F2')
    await page.keyboard.type('Part One')
    await page.keyboard.press('Enter')
    await expect(item(page, 'Part One')).toBeFocused()

    await openEditor(page, page.url())
    await expect(item(page, 'Part One')).toHaveAttribute('aria-expanded', 'false')
  })

  test('can be hidden, and stays so', async ({ page, account }) => {
    const { composition } = await seed(account)
    const tree = await openEditor(page, `/compositions/${composition.id}`)
    await page.getByRole('button', { name: 'Hide binder' }).click()
    await expect(tree).toHaveCount(0)
    await openEditor(page, page.url())
    await expect(page.getByRole('button', { name: 'Show binder' })).toBeVisible()
    await page.getByRole('button', { name: 'Show binder' }).click()
    await expect(page.getByRole('tree', { name: 'Documents and folders' })).toBeVisible()
  })

  test('the row menu works from the keyboard, down to deleting', async ({ page, account }) => {
    const { composition } = await seed(account, [{ key: 'coda', title: 'Coda' }])
    await openEditor(page, `/compositions/${composition.id}`)
    await item(page, 'Coda').focus()
    await page.keyboard.press('Shift+F10')
    const menu = page.getByRole('menu', { name: 'Actions for Coda' })
    // Opening the menu moves the focus to its first item
    await expect(menu.getByRole('menuitem').first()).toBeFocused()
    // The arrows stay in the menu: they no longer reach the tree behind it
    await page.keyboard.press('End')
    await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toContainText('This document will be deleted.')
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(item(page, 'Coda')).toHaveCount(0)
  })

  test('Escape cancels a rename; an emptied title comes back', async ({ page, account }) => {
    const { composition } = await seed(account)
    await openEditor(page, `/compositions/${composition.id}`)
    await item(page, 'Untitled document').focus()
    await page.keyboard.press('F2')
    await page.keyboard.type('Never mind')
    await page.keyboard.press('Escape')
    await expect(item(page, 'Untitled document')).toBeFocused()

    const title = page.getByLabel('Document title')
    await title.fill('')
    await page.locator('[contenteditable="true"]').click()
    await expect(title).toHaveValue('Untitled document')
    await expect(item(page, 'Untitled document')).toBeVisible()
  })

  test('the title and the text read as one page; Cmd/Ctrl+S saves at once', async ({
    page,
    account,
  }) => {
    const { composition } = await seed(account)
    await openEditor(page, `/compositions/${composition.id}`)
    const title = page.getByLabel('Document title')
    const text = page.locator('[contenteditable="true"]')

    // Enter in the title goes down to the start of the text, the up arrow there comes back
    await title.click()
    await page.keyboard.press('Enter')
    await expect(text).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(title).toBeFocused()

    // Back down, the caret is where it was
    await page.keyboard.press('Enter')
    await page.keyboard.type('Descent to the underworld')
    await page.keyboard.press('ControlOrMeta+s')
    await expect
      .poll(
        async () => {
          const { docs } = await account.payload.find({
            collection: 'binder-items',
            where: { composition: { equals: composition.id } },
          })
          return JSON.stringify(docs[0]?.content ?? {})
        },
        // Generous: under the whole suite's load the dev server may be slow to run the action
        { timeout: 20_000 },
      )
      .toContain('Descent to the underworld')
  })

  test('the browser’s back button shows the latest text', async ({ page, account }) => {
    const { composition, items } = await seed(account, [{ key: 'second', title: 'Chant II' }])
    await openEditor(page, `/compositions/${composition.id}`)
    await page.locator('[contenteditable="true"]').click()
    await page.keyboard.type('Written before leaving.')
    await item(page, 'Chant II').click()
    await expect(page).toHaveURL(new RegExp(`/${items.second.id}$`))
    await page.goBack()
    await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')
    await expect(page.locator('[contenteditable="true"]')).toContainText('Written before leaving.')
  })

  test('deleting the open document opens the next one', async ({ page, account }) => {
    const { composition } = await seed(account, [{ key: 'second', title: 'Chant II' }])
    await openEditor(page, `/compositions/${composition.id}`)
    await itemMenu(page, 'Untitled document', 'Delete')
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    await expect(item(page, 'Untitled document')).toHaveCount(0)
  })

  test('moving into a closed folder opens it', async ({ page, account }) => {
    const { composition } = await seed(account, [
      { key: 'part', kind: 'folder', title: 'Part I' },
      { key: 'inside', title: 'Inside', parent: 'part' },
      { key: 'loose', title: 'Loose page' },
    ])
    await openEditor(page, `/compositions/${composition.id}`)
    await item(page, 'Part I').click()
    await expect(item(page, 'Inside')).toHaveCount(0)

    await itemMenu(page, 'Loose page', 'Move to…')
    await page.getByRole('dialog').getByLabel('Part I').check()
    await page.getByRole('dialog').getByRole('button', { name: 'Move here' }).click()
    await expect(item(page, 'Loose page')).toHaveAttribute('aria-level', '2')
    await expect(item(page, 'Loose page')).toBeFocused()
  })

  test('a change the server refuses is undone, and says so', async ({ page, account }) => {
    const { composition } = await seed(account)
    await openEditor(page, `/compositions/${composition.id}`)
    // Every server action fails, as when the connection drops
    await page.route('**/compositions/**', (route) =>
      route.request().method() === 'POST' ? route.abort() : route.continue(),
    )
    await item(page, 'Untitled document').focus()
    await page.keyboard.press('F2')
    await page.keyboard.type('Lost title')
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('alert').filter({ hasText: 'Could not update the binder. Please try again.' }),
    ).toBeVisible()
    await expect(item(page, 'Untitled document')).toBeVisible()
    await expect(item(page, 'Lost title')).toHaveCount(0)
    await page.unrouteAll()
  })
})
