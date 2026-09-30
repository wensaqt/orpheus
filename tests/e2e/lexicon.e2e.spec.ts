import { cleanupThesaurusEntries, seedThesaurusEntry, TEST_WORD_PREFIX } from '../helpers/thesaurus'
import type { Page } from '@playwright/test'

import { type Account, expect, test } from './fixtures'

// Made-up entries seeded per test: no dependency on the imported thesaurus or the network
const word = `${TEST_WORD_PREFIX}lyre`

test.describe('Synonyms panel', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test.beforeEach(async ({ account }) => {
    await cleanupThesaurusEntries(account.payload)
    await seedThesaurusEntry(account.payload, word, [
      { partOfSpeech: 'noun', sense: null, words: ['cithare', 'harpe'] },
    ])
  })
  test.afterEach(async ({ account }) => cleanupThesaurusEntries(account.payload))

  const openEditor = async (page: Page, account: Account) => {
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
    return page.getByRole('complementary', { name: 'Synonyms' })
  }

  test('search, credit the source, copy a word', async ({ page, account }) => {
    const panel = await openEditor(page, account)
    await panel.getByRole('searchbox').fill(word)
    await panel.getByRole('searchbox').press('Enter')

    await expect(panel.getByRole('button', { name: 'harpe' })).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Thesaurus by Dicollecte (LGPL)' })).toBeVisible()

    await panel.getByRole('button', { name: 'harpe' }).click()
    await expect(page.getByRole('status').filter({ hasText: '“harpe” copied' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('harpe')
  })

  test('a plural leads to its singular, an unknown word says so', async ({ page, account }) => {
    const panel = await openEditor(page, account)
    await panel.getByRole('searchbox').fill(`${word}s`)
    await expect(panel.getByText(`Synonyms of “${word}”`)).toBeVisible()
    await expect(panel.getByRole('button', { name: 'cithare' })).toBeVisible()

    await panel.getByRole('searchbox').fill(`${TEST_WORD_PREFIX}inconnu`)
    // The visible message (a paragraph), not the screen-reader announcement that repeats it
    await expect(
      panel
        .getByRole('paragraph')
        .filter({ hasText: `No synonyms found for “${TEST_WORD_PREFIX}inconnu”.` }),
    ).toBeVisible()
  })
})
