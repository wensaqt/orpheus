import type { Page } from '@playwright/test'
import type { Id } from '@/lib/ids'
import { TEST_PASSWORD } from '../helpers/testUsers'
import { prose } from '../helpers/lexicalContent'
import { test, expect, type Account } from './fixtures'
import { editable, END_OF_TEXT, openDocument } from './paginationHelpers'
import { signIn } from './authHelpers'

async function appendWriting(page: Page, text: string) {
  await page.locator(editable).click()
  await page.keyboard.press(END_OF_TEXT)
  await page.keyboard.type(text)
}

async function savedContent(account: Account, id: Id): Promise<string> {
  const document = await account.payload.findByID({ collection: 'binder-items', id })
  return JSON.stringify(document.content)
}

test('failed saves block home and logout, then save before leaving when the connection returns', async ({
  page,
  account,
}) => {
  const { composition, document } = await openDocument(page, account, prose(1))
  const editorUrl = page.url()
  await page.route('**/compositions/**', (route) =>
    route.request().method() === 'POST' ? route.abort() : route.continue(),
  )
  await appendWriting(page, ' Preserved through failure')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Could not save')
  await page.reload()
  await expect(page.locator(editable)).toContainText('Preserved through failure')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Could not save')
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL(editorUrl)
  await expect(page.locator(editable)).toContainText('Preserved through failure')
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(editorUrl)
  await expect(page.locator(editable)).toContainText('Preserved through failure')
  await page.unroute('**/compositions/**')
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto(`/compositions/${composition.id}/${document.id}`)
  await expect(page.locator(editable)).toContainText('Preserved through failure')
})

test('an expired session keeps the draft through sign-in and saves it after returning', async ({
  page,
  account,
}) => {
  const { document } = await openDocument(page, account, prose(1))
  const editorUrl = page.url()
  await account.payload.update({ collection: 'users', id: account.user.id, data: { sessions: [] } })
  await appendWriting(page, ' Survives expired session')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Your session expired')
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await signIn(page, account.user.email, TEST_PASSWORD)
  await expect(page).toHaveURL(editorUrl)
  await expect(page.locator(editable)).toContainText('Survives expired session')
  await expect.poll(() => savedContent(account, document.id)).toContain('Survives expired session')
  await page.reload()
  await expect(page.locator(editable)).toContainText('Survives expired session')
})

test('a stale second tab preserves its writing without overwriting the first tab', async ({
  page,
  account,
}) => {
  const { document } = await openDocument(page, account, prose(1))
  const other = await page.context().newPage()
  await other.goto(page.url())
  await expect(other.locator(`${editable}[data-lexical-editor=true]`)).toBeVisible()
  await appendWriting(page, ' First tab wins')
  await expect.poll(() => savedContent(account, document.id)).toContain('First tab wins')
  await appendWriting(other, ' Second tab kept locally')
  await expect(other.getByRole('main').getByRole('alert')).toContainText(
    'Another version was saved',
  )
  await expect(other.locator(editable)).toContainText('Second tab kept locally')
  await other.reload()
  await expect(other.locator(editable)).toContainText('Second tab kept locally')
  await expect(other.getByRole('main').getByRole('alert')).toContainText(
    'Another version was saved',
  )
  const saved = await savedContent(account, document.id)
  expect(saved).toContain('First tab wins')
  expect(saved).not.toContain('Second tab kept locally')
  await other.close()
})
