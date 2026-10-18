import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { MAX_SCORE_BYTES } from '@/lib/scores/validation'
import { seed } from './binderHelpers'
import { expect, test } from './fixtures'

test('a MusicXML at the import limit saves and reopens through a production action', async ({
  page,
  account,
}) => {
  test.setTimeout(60_000)
  const base = await readFile(
    new URL('../fixtures/scores/voices-triplet.musicxml', import.meta.url),
    'utf8',
  )
  const end = '</score-partwise>'
  const prefix = base.slice(0, base.lastIndexOf(end)) + '<!--é\n'
  const suffix = '-->' + end
  // Quotes stress JSON escaping while the musical structure remains small and renderable.
  const padding = MAX_SCORE_BYTES - Buffer.byteLength(prefix + suffix)
  const xml = prefix + '"'.repeat(padding) + suffix
  const digest = (value: string) => createHash('sha256').update(value).digest('hex')
  const expectedDigest = digest(xml)
  expect(Buffer.byteLength(xml)).toBe(MAX_SCORE_BYTES)
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score')
  const id = page.url().split('/').at(-1)!
  await page.getByLabel('Import MusicXML…').setInputFiles({
    name: 'boundary.musicxml',
    mimeType: 'application/xml',
    buffer: Buffer.from(xml),
  })
  await expect
    .poll(
      async () =>
        digest((await account.payload.findByID({ collection: 'binder-items', id })).scoreXml ?? ''),
      { timeout: 30_000 },
    )
    .toBe(expectedDigest)
  await page.reload()
  await expect(page.locator('.vf-notehead').first()).toBeVisible()
  await page.getByLabel('Import MusicXML…').setInputFiles({
    name: 'too-large.musicxml',
    mimeType: 'application/xml',
    buffer: Buffer.from(xml + ' '),
  })
  await expect(page.locator('p[role="alert"]')).toBeVisible()
  expect(
    digest((await account.payload.findByID({ collection: 'binder-items', id })).scoreXml ?? ''),
  ).toBe(expectedDigest)
})
