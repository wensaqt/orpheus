import type { RequiredDataFromCollectionSlug } from 'payload'
import type { Page } from '@playwright/test'
import { BOOK_VIEW_COOKIE, BINDER_HIDDEN_COOKIE } from '@front/_lib/preferences'
import { documentOf, paragraphNode, pageBreakNode, prose } from '../helpers/lexicalContent'
import { boxOf, expect, test } from './fixtures'
import { editable, END_OF_TEXT, openDocument, pdfPageCount, settle } from './paginationHelpers'

const surface = '[data-pages]'
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Editor toolbar' })

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
}

test('resizing preserves the editor, selection, undo and saved writing', async ({
  page,
  account,
}, testInfo) => {
  const { document } = await openDocument(
    page,
    account,
    documentOf([paragraphNode('Original writing')]),
  )
  await page.locator(editable).click()
  await page.keyboard.press(END_OF_TEXT)
  await page.keyboard.type(' Continued')
  await page.locator(editable).evaluate((root) => Reflect.set(window, 'writingRoot', root))
  const selection = await page.evaluate(() => window.getSelection()?.focusOffset)
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 834, height: 1194 },
    { width: 844, height: 390 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(page.locator(surface)).toHaveAttribute(
      'data-continuous',
      String(viewport.width <= 1100),
    )
    expect(
      await page.locator(editable).evaluate((root) => root === Reflect.get(window, 'writingRoot')),
    ).toBe(true)
    expect(await page.evaluate(() => window.getSelection()?.focusOffset)).toBe(selection)
    await expectNoOverflow(page)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await toolbar(page).getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator(editable)).toHaveText('Original writing')
  await toolbar(page).getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(page.locator(editable)).toHaveText('Original writing Continued')
  await expect
    .poll(async () =>
      JSON.stringify(
        (await account.payload.findByID({ collection: 'binder-items', id: document.id })).content,
      ),
    )
    .toContain('Continued')
  await page.screenshot({ path: testInfo.outputPath('mobile.png') })
  await page.reload()
  await expect(page.locator(editable)).toHaveText('Original writing Continued')
})

test('saved desktop book and binder preferences survive the mobile view', async ({
  page,
  account,
  baseURL,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Book view is unavailable on Safari during beta')
  await page.context().addCookies([
    { name: BOOK_VIEW_COOKIE, value: '1', url: baseURL! },
    { name: BINDER_HIDDEN_COOKIE, value: '0', url: baseURL! },
  ])
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openDocument(page, account, prose(2))
  await expect(page.locator('[data-book-viewport]')).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-book-viewport]')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Ruler' })).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Open binder — current document: Untitled document', exact: true })
    .click()
  await expect(page.getByRole('dialog', { name: 'Binder', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Hide binder', exact: true }).click()
  expect(
    (await page.context().cookies()).find(({ name }) => name === BINDER_HIDDEN_COOKIE)?.value,
  ).toBe('0')
  expect(
    (await page.context().cookies()).find(({ name }) => name === BOOK_VIEW_COOKIE)?.value,
  ).toBe('1')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.locator('[data-book-viewport]')).toHaveCount(1)
  await expect(page.getByRole('navigation', { name: 'Binder' })).toBeVisible()
})

test('continuous writing keeps manual breaks and prints the document on paper', async ({
  page,
  account,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { document } = await openDocument(
    page,
    account,
    documentOf([
      paragraphNode('First page'),
      pageBreakNode(),
      paragraphNode('Second page'),
      pageBreakNode(),
      paragraphNode('Third page'),
    ]),
    { format: 'A5' },
  )
  await expect(page.locator(surface)).toHaveAttribute('data-continuous', 'true')
  const breaks = page.locator(`${editable} [data-page-break]`)
  await expect(breaks).toHaveCount(2)
  expect((await boxOf(breaks.first())).height).toBeLessThan(40)
  const before = JSON.stringify(
    (await account.payload.findByID({ collection: 'binder-items', id: document.id })).content,
  )
  if (browserName === 'chromium') expect(await pdfPageCount(page)).toBe(3)
  else {
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator(surface)).toHaveAttribute('data-pages', '3')
    await page.emulateMedia({ media: 'screen' })
  }
  await expect(breaks.first()).toHaveCSS('height', '24px')
  expect(
    JSON.stringify(
      (await account.payload.findByID({ collection: 'binder-items', id: document.id })).content,
    ),
  ).toBe(before)
  await page.locator(editable).click()
  await page.keyboard.press(END_OF_TEXT)
  await page.keyboard.type(' after printing')
  await expect(page.locator(editable)).toContainText('after printing')
  await expectNoOverflow(page)
})

test('mobile controls format the selection and expose the remaining commands', async ({
  page,
  account,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openDocument(page, account, documentOf([paragraphNode('Selected writing')]))
  await page.locator(editable).selectText()
  await toolbar(page).getByRole('button', { name: 'Bold', exact: true }).click()
  await expect(page.locator(`${editable} strong`)).toHaveText('Selected writing')
  await page.getByRole('menubar').getByRole('menuitem', { name: 'Actions' }).click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Book view' })).toHaveCount(0)
  await expect(page.getByRole('menuitemradio', { name: 'Quote', exact: true })).toHaveCount(0)
  await expect(page.getByRole('menu', { name: 'Actions', exact: true })).toContainText('Page break')
  await page.keyboard.press('Escape')
  await toolbar(page)
    .getByRole('button', { name: /Paragraph style/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Quote', exact: true }).click()
  await expect(page.locator(`${editable} blockquote`)).toHaveText('Selected writing')
  await expectNoOverflow(page)
})

test('formatting controls stay on one scrollable row and touch sized on narrow screens', async ({
  page,
  account,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await openDocument(page, account, documentOf([paragraphNode('Selected writing')]))
  for (const width of [320, 390, 700, 834]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.locator('[data-editor-titles]')).toBeHidden()
    const ribbon = toolbar(page)
    await ribbon.evaluate((element) => {
      element.scrollLeft = 0
    })
    const ribbonBounds = await boxOf(ribbon)
    const controls = toolbar(page).locator('[data-roving]')
    const firstControl = await boxOf(controls.first())
    for (const control of await controls.all()) {
      await expect(control).toBeVisible()
      const bounds = await boxOf(control)
      expect(bounds.width).toBeGreaterThanOrEqual(44)
      expect(bounds.height).toBeGreaterThanOrEqual(44)
      expect(bounds.y).toBeCloseTo(firstControl.y, 1)
    }
    await controls.first().focus()
    await page.keyboard.press('End')
    await expect(controls.last()).toBeFocused()
    const lastControl = await boxOf(controls.last())
    expect(lastControl.x).toBeGreaterThanOrEqual(ribbonBounds.x)
    expect(lastControl.x + lastControl.width).toBeLessThanOrEqual(
      ribbonBounds.x + ribbonBounds.width,
    )
    if (width === 320) {
      expect(await ribbon.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    }
    await expectNoOverflow(page)
  }
  await page.setViewportSize({ width: 320, height: 568 })
  await page.locator(editable).selectText()
  await toolbar(page)
    .getByRole('button', { name: /Paragraph style/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Heading 1', exact: true }).click()
  await expect(page.locator(`${editable} h1`)).toHaveText('Selected writing')
  await toolbar(page)
    .getByRole('button', { name: /^Alignment/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Justify', exact: true }).click()
  await expect(page.locator(`${editable} h1`)).toHaveCSS('text-align', 'justify')
  await toolbar(page).getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator(`${editable} h1`)).not.toHaveCSS('text-align', 'justify')
})

test('a failed mobile save survives rotation and is recovered before leaving', async ({
  page,
  account,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { composition, document } = await openDocument(
    page,
    account,
    documentOf([paragraphNode('Start')]),
  )
  await page.route('**/compositions/**', (route) =>
    route.request().method() === 'POST' ? route.abort() : route.continue(),
  )
  await page.locator(editable).click()
  await page.keyboard.press(END_OF_TEXT)
  await page.keyboard.type(' Preserved on mobile')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Could not save')
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator(editable)).toContainText('Preserved on mobile')
  await page.unroute('**/compositions/**')
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto(`/compositions/${composition.id}/${document.id}`)
  await expect(page.locator(editable)).toContainText('Preserved on mobile')
})

test('mobile drawers close after navigation and keep text free of horizontal scrolling', async ({
  page,
  account,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const { composition } = await openDocument(
    page,
    account,
    documentOf([paragraphNode('First document')]),
  )
  await account.payload.create({
    collection: 'binder-items',
    data: {
      composition: composition.id,
      kind: 'document',
      title: 'Second',
      content: documentOf([paragraphNode('Second document')]),
    } as RequiredDataFromCollectionSlug<'binder-items'>,
    user: account.user,
    overrideAccess: false,
  })
  await page.reload()
  // Next's development badge overlaps navigation; it is absent in production.
  await page.addStyleTag({ content: 'nextjs-portal { display: none; }' })
  await page
    .getByRole('button', { name: 'Open binder — current document: Untitled document', exact: true })
    .click()
  const binder = page.getByRole('dialog', { name: 'Binder', exact: true })
  await expect(binder).toBeVisible()
  await binder.getByRole('treeitem', { name: 'Second', exact: true }).click()
  await expect(page.locator(editable)).toHaveText('Second document')
  await expect(binder).toBeHidden()
  await page.getByRole('button', { name: 'Previous document', exact: true }).click()
  await expect(page.locator(editable)).toHaveText('First document')
  await page.getByRole('button', { name: 'Next document', exact: true }).click()
  await expect(page.locator(editable)).toHaveText('Second document')
  await expect(page.getByRole('button', { name: 'Show synonyms', exact: true })).toHaveCount(0)
  await page.getByRole('menubar').getByRole('menuitem', { name: 'Tools', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Synonyms', exact: true }).click()
  const synonyms = page.getByRole('dialog', { name: 'Synonyms', exact: true })
  await expect(synonyms).toBeVisible()
  const bounds = await boxOf(synonyms)
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
  await expectNoOverflow(page)
  await synonyms.getByRole('button', { name: 'Hide synonyms', exact: true }).click()
  await expect(synonyms).toBeHidden()
  await expect(page.locator(editable)).toBeFocused()
})

test.describe('touch tablet', () => {
  test.skip(
    ({ browserName }) => browserName === 'firefox',
    'Playwright Firefox does not emulate a mobile touch context',
  )
  test.use({ hasTouch: true, isMobile: true })
  test('uses continuous text in both orientations, with a sidebar only when it fits', async ({
    page,
    account,
  }, testInfo) => {
    await page.setViewportSize({ width: 834, height: 1194 })
    await openDocument(page, account, prose(8))
    const binderPanel = page.getByRole('navigation', { name: 'Binder' }).filter({
      has: page.getByRole('tree'),
    })
    await expect(page.locator(surface)).toHaveAttribute('data-continuous', 'true')
    await expect(binderPanel).toBeHidden()
    await expectNoOverflow(page)
    await page.setViewportSize({ width: 1194, height: 834 })
    await expect(page.locator(surface)).toHaveAttribute('data-continuous', 'true')
    await expect(binderPanel).toBeVisible()
    await expectNoOverflow(page)
    await expect(page.getByRole('region', { name: 'Notifications' })).not.toContainText(
      'Safari has issues',
    )
    await settle(page)
    await page.screenshot({
      path: testInfo.outputPath('tablet.png'),
    })
  })
})
