import { readFile } from 'node:fs/promises'
import type { RequiredDataFromCollectionSlug } from 'payload'

import { SAMPLE_SCORE } from '@/lib/scores/sample'
import { seed } from './binderHelpers'
import { expect, test, type Account } from './fixtures'
import type { Page } from '@playwright/test'

async function openScore(page: Page, account: Account, xml = SAMPLE_SCORE) {
  const { composition } = await seed(account)
  const score = await account.payload.create({
    collection: 'binder-items',
    data: {
      composition: composition.id,
      kind: 'document',
      documentType: 'score',
      title: 'Mobile score',
      scoreXml: xml,
    } as RequiredDataFromCollectionSlug<'binder-items'>,
    user: account.user,
    overrideAccess: false,
  })
  await page.goto(`/compositions/${composition.id}/${score.id}`)
  await expect(page.locator('[data-score-renderer] svg')).toBeVisible()
  return score.id
}

async function expectScoreFits(page: Page) {
  await expect
    .poll(async () => {
      const root = page.locator('[data-score-renderer]')
      return root.evaluate((element) => {
        const width = element.querySelector('svg')?.getBoundingClientRect().width
        return width ? Math.abs(width - element.getBoundingClientRect().width) : Infinity
      })
    })
    .toBeLessThan(3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
}

test('mobile scores reflow on rotation and keep pitch edits, undo and saved XML', async ({
  page,
  account,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const id = await openScore(page, account)
  const stored = async () =>
    (await account.payload.findByID({ collection: 'binder-items', id })).scoreXml
  const firstPitch = async () => (await stored())?.match(/<pitch>\s*<step>([A-G])<\/step>/)?.[1]
  const original = await stored()
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
    { width: 834, height: 1194 },
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await expectScoreFits(page)
    await expect(page.locator('.vf-notehead')).toHaveCount(7)
  }
  expect(await stored()).toBe(original)
  await page.locator('.vf-notehead').first().click()
  const pitch = page.getByLabel('Measure 1 · note 1 · note name')
  await expect(pitch).toBeVisible()
  await pitch.selectOption('A')
  await expect.poll(firstPitch).toBe('A')
  await page.getByRole('button', { name: 'Close panel' }).click()
  const toolbar = page.getByRole('toolbar', { name: 'Editor toolbar' })
  await toolbar.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect.poll(stored).toBe(original)
  await toolbar.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect.poll(firstPitch).toBe('A')
  await page.screenshot({ path: testInfo.outputPath('score-mobile.png') })
  await page.reload()
  await expectScoreFits(page)
  await page.locator('.vf-notehead').first().click()
  await expect(pitch).toHaveValue('A')
})

test('a polyphonic piano remains readable when resizing without changing its XML', async ({
  page,
  account,
}) => {
  const xml = await readFile(
    new URL('../fixtures/scores/polyphonic-piano.musicxml', import.meta.url),
    'utf8',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  const id = await openScore(page, account, xml)
  await expectScoreFits(page)
  await page.setViewportSize({ width: 1194, height: 834 })
  await expectScoreFits(page)
  expect((await account.payload.findByID({ collection: 'binder-items', id })).scoreXml).toBe(xml)
})

test.describe('touch score', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox does not emulate mobile touch')
  test.use({ hasTouch: true, isMobile: true })

  test('keeps notes selectable and commands reachable in tablet portrait and landscape', async ({
    page,
    account,
  }, testInfo) => {
    await page.setViewportSize({ width: 834, height: 1194 })
    await openScore(page, account)
    await expectScoreFits(page)
    await page.setViewportSize({ width: 1194, height: 834 })
    await expectScoreFits(page)
    await expect(page.getByRole('tree', { name: 'Documents and folders' })).toBeVisible()
    await page.locator('.vf-notehead').first().tap()
    await expect(page.getByLabel('Measure 1 · note 1 · note name')).toBeVisible()
    await page.getByRole('button', { name: 'Close panel' }).tap()
    await page.screenshot({ path: testInfo.outputPath('score-tablet.png') })
  })
})
