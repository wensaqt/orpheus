import { expect, test } from './fixtures'

test.describe('Compositions', () => {
  test('create from home, write, find it again after reload', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /New composition/ }).click()
    await expect(page).toHaveURL(/\/compositions\/\d+$/)

    const title = page.getByLabel('Composition title')
    await expect(title).toHaveValue('Untitled composition')
    await title.fill('Eurydice')
    await page.locator('[contenteditable="true"]').click()
    await page.keyboard.type('# Chant\nShe walked behind him.')

    // Autosave after a pause in typing
    await page.waitForTimeout(1500)
    await page.reload()
    await expect(title).toHaveValue('Eurydice')
    await expect(page.locator('[contenteditable="true"] h1')).toHaveText('Chant')
    await expect(page.locator('[contenteditable="true"] p')).toHaveText('She walked behind him.')
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
          const doc = await account.payload.findByID({
            collection: 'compositions',
            id: composition.id,
          })
          return JSON.stringify(doc.content ?? {})
        },
        { timeout: 20_000 },
      )
      // Generous timeout: under parallel load the dev server may be slow to process the action
      .toContain('Last keystroke')
  })

  test('the list shows sheets with their excerpt', async ({ page, account }) => {
    await account.payload.create({
      collection: 'compositions',
      data: {
        title: 'Hymne',
        owner: account.user.id,
        page: { format: 'Letter', orientation: 'landscape' },
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
        password: 'orpheus-test-password',
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
