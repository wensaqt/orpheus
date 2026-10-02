import type { Request } from '@playwright/test'

import { ID, item, itemMenu, openEditor, seed } from './binderHelpers'
import { expect, test } from './fixtures'

const editable = '[contenteditable="true"]'

// A request to the server for a page render, a server action, or a document's text
const reachesServer = (request: Request) =>
  request.headers()['rsc'] !== undefined ||
  request.headers()['next-action'] !== undefined ||
  request.url().endsWith('/content')

test.describe('Switching documents', () => {
  test('going back to a document already seen asks the server nothing', async ({
    page,
    account,
  }) => {
    const { composition } = await seed(account, [{ key: 'second', title: 'Chant II' }])
    await openEditor(page, `/compositions/${composition.id}`)
    await page.locator(editable).click()
    await page.keyboard.type('Already here.')
    await item(page, 'Chant II').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    // Let the background work settle (saves, loads ahead), then count from now on
    await page.waitForLoadState('networkidle')

    const requests: string[] = []
    page.on('request', (request) => {
      if (reachesServer(request)) requests.push(request.url())
    })
    await item(page, 'Untitled document').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')
    await expect(page.locator(editable)).toContainText('Already here.')
    expect(requests).toEqual([])
  })

  test('a direct link and a reload show the right document', async ({ page, account }) => {
    const { composition, items } = await seed(account, [
      { key: 'second', title: 'Chant II' },
      { key: 'third', title: 'Chant III' },
    ])
    await openEditor(page, `/compositions/${composition.id}/${items.second.id}`)
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')

    await item(page, 'Chant III').click()
    await page.locator(editable).click()
    await page.keyboard.type('Before the reload.')
    // Cmd/Ctrl+S saves at once
    await page.keyboard.press('ControlOrMeta+s')
    await expect
      .poll(async () =>
        JSON.stringify(
          (await account.payload.findByID({ collection: 'binder-items', id: items.third.id }))
            .content,
        ),
      )
      .toContain('Before the reload.')
    await openEditor(page, page.url())
    await expect(page.getByLabel('Document title')).toHaveValue('Chant III')
    await expect(page.locator(editable)).toContainText('Before the reload.')
  })

  test('back and forward walk the documents, with the latest text', async ({ page, account }) => {
    const { composition, items } = await seed(account, [
      { key: 'second', title: 'Chant II' },
      { key: 'third', title: 'Chant III' },
    ])
    await openEditor(page, `/compositions/${composition.id}`)
    await page.locator(editable).click()
    await page.keyboard.type('First words.')
    await item(page, 'Chant II').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    await item(page, 'Chant III').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant III')

    await page.goBack()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    await expect(item(page, 'Chant II')).toHaveAttribute('aria-current', 'page')
    await page.goBack()
    await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')
    await expect(page.locator(editable)).toContainText('First words.')
    await page.goForward()
    await expect(page).toHaveURL(new RegExp(`/${items.second.id}$`))
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
  })

  test('back stays put when the changes cannot be saved', async ({ page, account }) => {
    const { composition } = await seed(account, [{ key: 'second', title: 'Chant II' }])
    await openEditor(page, `/compositions/${composition.id}`)
    await item(page, 'Chant II').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    // Saves (server actions) fail, as when the connection drops
    await page.route('**/compositions/**', (route) =>
      route.request().method() === 'POST' ? route.abort() : route.continue(),
    )
    await page.locator(editable).click()
    await page.keyboard.type('Not saved yet.')
    await page.goBack()
    await expect(
      page.getByRole('alert').filter({ hasText: 'Your changes could not be saved.' }),
    ).toBeVisible()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    await expect(page.locator(editable)).toContainText('Not saved yet.')
    await page.unrouteAll()
  })

  test('a slow document shows that it is opening; a failed one offers to try again', async ({
    page,
    account,
  }) => {
    // Fillers in between: an open document loads its neighbours ahead, which would hide the wait
    const { composition } = await seed(account, [
      { key: 'filler', title: 'Filler' },
      { key: 'slow', title: 'Slow page' },
      { key: 'other', title: 'Other filler' },
      { key: 'broken', title: 'Broken page' },
    ])
    await openEditor(page, `/compositions/${composition.id}`)
    await page.route('**/content', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500))
      await route.continue()
    })
    // Clicked straight away: no time to load it ahead on hover
    await item(page, 'Slow page').dispatchEvent('click')
    await expect(
      page.getByRole('status').filter({ hasText: 'Opening the document…' }),
    ).toBeAttached()
    await expect(page.getByLabel('Document title')).toHaveValue('Slow page')

    await page.unrouteAll()
    await page.route('**/content', (route) => route.abort())
    await item(page, 'Broken page').dispatchEvent('click')
    await expect(page.getByText('This document could not be opened.')).toBeVisible()
    await page.unrouteAll()
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByLabel('Document title')).toHaveValue('Broken page')
  })

  test('the empty binder, then a new document, all without a page load', async ({
    page,
    account,
  }) => {
    const { composition } = await seed(account)
    await openEditor(page, `/compositions/${composition.id}`)
    await itemMenu(page, 'Untitled document', 'Delete')
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL(new RegExp(`/compositions/${composition.id}$`))
    await expect(page.getByText('This composition has no document yet.')).toBeVisible()

    // The invitation's button (the binder's toolbar has one too)
    await page
      .getByText('This composition has no document yet.')
      .locator('..')
      .getByRole('button', { name: 'New document' })
      .click()
    await expect(page).toHaveURL(new RegExp(`/compositions/${composition.id}/${ID}$`))
    await page.getByLabel('Document title').fill('Fresh start')
    await expect(item(page, 'Fresh start')).toBeVisible()
    // Saved after the typing pause: wait for it before reloading
    await expect
      .poll(async () => {
        const { docs } = await account.payload.find({
          collection: 'binder-items',
          where: { composition: { equals: composition.id } },
          depth: 0,
        })
        return docs.map((doc) => doc.title)
      })
      .toEqual(['Fresh start'])
    await openEditor(page, page.url())
    await expect(page.getByLabel('Document title')).toHaveValue('Fresh start')
  })

  test('a title changed on the sheet is there when coming back', async ({ page, account }) => {
    const { composition } = await seed(account, [{ key: 'second', title: 'Chant II' }])
    await openEditor(page, `/compositions/${composition.id}`)
    await page.getByLabel('Document title').fill('Prelude')
    await item(page, 'Chant II').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Chant II')
    await item(page, 'Prelude').click()
    await expect(page.getByLabel('Document title')).toHaveValue('Prelude')
  })
})
