import type { Page } from '@playwright/test'
import type { RequiredDataFromCollectionSlug } from 'payload'

import type { BinderItem, Composition } from '@/payload-types'

import { type Account, expect } from './fixtures'

// A path segment holding an id, for URL assertions
export { UUID_PATTERN as ID } from '@/lib/ids'

// A composition (with its automatic first document) and the extra items given, as the user
export async function seed(
  account: Account,
  items: { key: string; kind?: 'folder' | 'document'; title: string; parent?: string }[] = [],
) {
  const as = { user: account.user, overrideAccess: false, depth: 0 } as const
  const composition: Composition = await account.payload.create({
    collection: 'compositions',
    data: {
      title: 'Orphée',
      owner: account.user.id,
      page: { format: 'A4', orientation: 'portrait' },
    },
    ...as,
  })
  const created: Record<string, BinderItem> = {}
  for (const { key, kind = 'document', title, parent } of items) {
    created[key] = await account.payload.create({
      collection: 'binder-items',
      // Owner and position are filled in by the collection, which the types cannot know
      data: {
        composition: composition.id,
        kind,
        title,
        parent: parent ? created[parent].id : null,
      } as RequiredDataFromCollectionSlug<'binder-items'>,
      ...as,
    })
  }
  return { composition, items: created }
}

// The editor, once React has hydrated (the editable area is rendered on the client)
export async function openEditor(page: Page, path: string) {
  await page.goto(path)
  // Generous: under the whole suite's load, the dev server can be slow to render the editor
  await expect(page.locator('[contenteditable="true"]')).toBeVisible({ timeout: 15_000 })
  return page.getByRole('tree', { name: 'Documents and folders' })
}

export const item = (page: Page, title: string) =>
  page.getByRole('treeitem', { name: title, exact: true })

export async function itemMenu(page: Page, title: string, action: string) {
  await item(page, title).hover()
  await page.getByRole('button', { name: `Actions for ${title}` }).click()
  await page.getByRole('menuitem', { name: action }).click()
}
