import { TEST_PASSWORD } from '../helpers/testUsers'
import { editorPath } from '@front/_lib/routes'

import { ID } from './binderHelpers'
import { expect, test } from './fixtures'

test.describe('Compositions', () => {
  test('create from home, write, find it again after reload', async ({ page, account }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /New composition/ }).click()
    // Two redirects (the action, then the composition to its first document), each rendered by
    // the dev server: slow under the whole suite's load
    await expect(page).toHaveURL(new RegExp(`/compositions/${ID}/${ID}$`), { timeout: 15_000 })

    const title = page.getByLabel('Composition title')
    await expect(title).toHaveValue('Untitled composition')
    await title.fill('Eurydice')
    await page.locator('[contenteditable="true"]').click()
    await page.keyboard.type('# Chant\nShe walked behind him.')

    const path = editorPath(new URL(page.url()).pathname)
    if (!path?.documentId) throw new Error('Expected an open document')
    const documentId = path.documentId
    // Wait for persistence rather than assuming the autosave delay includes the request.
    await expect
      .poll(
        async () => {
          const composition = await account.payload.findByID({
            collection: 'compositions',
            id: path.compositionId,
          })
          const document = await account.payload.findByID({
            collection: 'binder-items',
            id: documentId,
          })
          return { title: composition.title, text: JSON.stringify(document.content) }
        },
        { timeout: 15_000 },
      )
      .toEqual({ title: 'Eurydice', text: expect.stringContaining('She walked behind him.') })
    await page.reload()
    await expect(title).toHaveValue('Eurydice')
    await expect(page.locator('[contenteditable="true"] h1')).toHaveText('Chant')
    await expect(page.locator('[contenteditable="true"] p')).toHaveText('She walked behind him.')
  })

  test('a slow creation shows the desk at once, then the new editor', async ({ page }) => {
    await page.goto('/')
    // The creation (a server action posted to the home page) takes a while
    await page.route('**/', async (route) => {
      if (route.request().method() === 'POST')
        await new Promise((resolve) => setTimeout(resolve, 1_500))
      await route.continue()
    })
    await page.getByRole('button', { name: /New composition/ }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Opening a blank page…' }),
    ).toBeAttached()
    await expect(page).toHaveURL(new RegExp(`/compositions/${ID}/${ID}$`), { timeout: 15_000 })
    await expect(page.getByLabel('Document title')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Opening a blank page…' })).toHaveCount(
      0,
    )
    await page.unrouteAll()
  })

  test('pending changes are sent when leaving the editor', async ({ page, account }) => {
    const composition = await account.payload.create({
      collection: 'compositions',
      data: {
        title: 'Draft',
        owner: account.user.id,
        page: { format: 'A4', orientation: 'portrait' },
      },
      user: account.user,
      overrideAccess: false,
    })
    await page.goto(`/compositions/${composition.id}`)
    await page.locator('[contenteditable="true"]').click()
    await page.keyboard.type('Last keystroke')
    // The editor state must hold the text before we leave, or there is nothing to flush
    await expect(page.locator('[contenteditable="true"]')).toContainText('Last keystroke')
    // Right away, before the save delay elapses
    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL('/')

    await expect
      .poll(
        async () => {
          // The text is saved in the composition's first (and only) document
          const { docs } = await account.payload.find({
            collection: 'binder-items',
            where: { composition: { equals: composition.id } },
          })
          return JSON.stringify(docs[0]?.content ?? {})
        },
        { timeout: 20_000 },
      )
      // Generous timeout: under parallel load the dev server may be slow to process the action
      .toContain('Last keystroke')
  })

  test('the list shows sheets with their excerpt', async ({ page, account }) => {
    const composition = await account.payload.create({
      collection: 'compositions',
      data: {
        title: 'Hymne',
        owner: account.user.id,
        page: { format: 'A5', orientation: 'portrait' },
      },
      user: account.user,
      overrideAccess: false,
    })
    // The sheet previews the first document of the binder
    await account.payload.update({
      collection: 'binder-items',
      where: { composition: { equals: composition.id } },
      data: {
        content: {
          root: {
            type: 'root',
            version: 1,
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', version: 1, text: 'The river still sings.' }],
              },
            ],
          },
        },
      },
      user: account.user,
      overrideAccess: false,
    })
    await page.goto('/compositions')
    const card = page.getByRole('listitem').filter({ hasText: 'Hymne' })
    await expect(card).toContainText('The river still sings.')
    await expect(card.locator('time')).toHaveText('now')
  })

  test('delete: cancel keeps the card, confirm removes it with a toast', async ({
    page,
    account,
  }) => {
    await account.payload.create({
      collection: 'compositions',
      data: {
        title: 'Chant II',
        owner: account.user.id,
        page: { format: 'A4', orientation: 'portrait' },
      },
      user: account.user,
      overrideAccess: false,
    })
    await page.goto('/compositions')
    const card = page.getByRole('listitem').filter({ hasText: 'Chant II' })
    const openDelete = async () => {
      await page.getByRole('button', { name: 'Actions for Chant II' }).click()
      await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeDisabled()
      await page.getByRole('menuitem', { name: 'Delete' }).click()
    }

    await openDelete()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(card).toBeVisible()

    await openDelete()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('status').filter({ hasText: '“Chant II” deleted' })).toBeVisible()
    await expect(card).toHaveCount(0)
  })

  test('another user’s composition is not found', async ({ page, account }) => {
    const other = await account.payload.create({
      collection: 'users',
      data: {
        email: `orpheus-test-other-${Date.now()}@example.test`,
        password: TEST_PASSWORD,
      },
    })
    const theirs = await account.payload.create({
      collection: 'compositions',
      data: { title: 'Secret', owner: other.id, page: { format: 'A4', orientation: 'portrait' } },
      user: other,
      overrideAccess: false,
    })
    const response = await page.goto(`/compositions/${theirs.id}`)
    expect(response?.status()).toBe(404)
  })
})
