import { prose } from '../helpers/lexicalContent'
import { boxOf, expect, test } from './fixtures'
import { openDocument, sheetSelector, waitForEditor } from './paginationHelpers'

const synonymsTitle = (page: import('@playwright/test').Page) =>
  page.getByRole('heading', { name: 'Synonyms' })

test.describe('Synonyms panel', () => {
  test('folds away, and stays so after a reload', async ({ page, account }) => {
    await page.setViewportSize({ width: 1440, height: 800 })
    await openDocument(page, account, prose(3))
    await expect(synonymsTitle(page)).toBeVisible()
    await page.getByRole('button', { name: 'Hide synonyms' }).click()
    await expect(synonymsTitle(page)).toBeHidden()

    await page.reload()
    await waitForEditor(page)
    await expect(synonymsTitle(page)).toBeHidden()
    await page.getByRole('button', { name: 'Show synonyms' }).click()
    await expect(synonymsTitle(page)).toBeVisible()
  })

  test('without room beside the sheet, folds on its own and opens over the page', async ({
    page,
    account,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openDocument(page, account, prose(3))
    // Folded: nothing lies over the sheet
    await expect(synonymsTitle(page)).toBeHidden()
    const show = page.getByRole('button', { name: 'Show synonyms' })
    const sheet = await boxOf(page.locator(sheetSelector).first())
    expect((await boxOf(show)).x).toBeGreaterThanOrEqual(sheet.x + sheet.width)

    await show.click()
    await expect(synonymsTitle(page)).toBeVisible()
    await page.getByRole('searchbox', { name: 'Find synonyms' }).focus()
    await page.keyboard.press('Escape')
    await expect(synonymsTitle(page)).toBeHidden()
    await expect(show).toBeFocused()
  })

  test('folding the binder makes room for it beside the sheet', async ({ page, account }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openDocument(page, account, prose(3))
    await expect(synonymsTitle(page)).toBeHidden()
    await page.getByRole('button', { name: 'Hide binder' }).click()
    await expect(synonymsTitle(page)).toBeVisible()
    const sheet = await boxOf(page.locator(sheetSelector).first())
    const panel = await boxOf(synonymsTitle(page))
    expect(panel.x).toBeGreaterThanOrEqual(sheet.x + sheet.width)
  })
})
