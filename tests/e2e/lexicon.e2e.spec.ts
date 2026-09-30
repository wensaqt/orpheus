import { expect, test } from './fixtures'

// Queries the real Wiktionary: skipped with E2E_OFFLINE=1 (the logic is covered offline by the
// unit tests)
test.skip(!!process.env.E2E_OFFLINE, 'Wiktionary unreachable in offline mode')

test.describe('Synonyms panel @network', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test('search, credit the source, copy a word', async ({ page, account }) => {
    const composition = await account.payload.create({
      collection: 'compositions',
      data: {
        title: 'Eurydice',
        owner: account.user.id,
        page: { format: 'A4', orientation: 'portrait' },
      },
      user: account.user,
      overrideAccess: false,
    })
    await page.goto(`/compositions/${composition.id}`)
    const panel = page.getByRole('complementary', { name: 'Synonyms' })

    await panel.getByRole('searchbox').fill('heureux')
    await panel.getByRole('searchbox').press('Enter')
    await expect(panel.getByRole('button', { name: 'content' })).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Wiktionnaire' })).toHaveAttribute(
      'href',
      'https://fr.wiktionary.org/wiki/heureux',
    )

    await panel.getByRole('button', { name: 'content' }).click()
    await expect(page.getByRole('status').filter({ hasText: '“content” copied' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('content')
  })

  test('a conjugated form leads to its base form', async ({ page, account }) => {
    const composition = await account.payload.create({
      collection: 'compositions',
      data: {
        title: 'Eurydice',
        owner: account.user.id,
        page: { format: 'A4', orientation: 'portrait' },
      },
      user: account.user,
      overrideAccess: false,
    })
    await page.goto(`/compositions/${composition.id}`)
    const panel = page.getByRole('complementary', { name: 'Synonyms' })
    await panel.getByRole('searchbox').fill('marchait')
    await expect(panel.getByText('Synonyms of “marcher”')).toBeVisible({ timeout: 15_000 })
    await expect(panel.getByRole('button', { name: 'avancer' })).toBeVisible()
  })
})
