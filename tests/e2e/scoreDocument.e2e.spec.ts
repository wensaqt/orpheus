import { seed } from './binderHelpers'
import { expect, test } from './fixtures'

test('transposition creates adjacent score documents and preserves their sources', async ({
  page,
  account,
}) => {
  test.setTimeout(60_000)
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score')
  await expect(page.locator('svg').first()).toBeVisible()
  const scoreId = page.url().split('/').at(-1)!

  await page.locator('.vf-notehead').nth(1).click()
  await expect(page.locator('[data-note-index="1"]')).toHaveAttribute('data-selected', 'true')
  await expect(page.locator('[data-note-index]')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Show all notes' })).toBeVisible()
  const correctionPanel = page.locator('section[aria-label="Correct a pitch…"]')
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 })
    const overflow = await correctionPanel.evaluate((panel) => {
      const bounds = panel.getBoundingClientRect()
      return [
        ...(panel.scrollWidth > panel.clientWidth
          ? [`panel ${panel.scrollWidth}/${panel.clientWidth}`]
          : []),
        ...Array.from(panel.querySelectorAll('*')).flatMap((control) => {
          const rect = control.getBoundingClientRect()
          if (rect.width === 0) return []
          return rect.left < bounds.left || rect.right > bounds.right
            ? [
                `${control.tagName}.${control.className} ${rect.left}/${rect.right} outside ${bounds.left}/${bounds.right}`,
              ]
            : []
        }),
      ]
    })
    expect(overflow, `panel at ${width}px`).toEqual([])
  }
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByLabel('Measure 1 · note 2 · note name').selectOption('D')
  await expect
    .poll(async () => {
      const xml =
        (await account.payload.findByID({ collection: 'binder-items', id: scoreId })).scoreXml ?? ''
      return [...xml.matchAll(/<note[^>]*>[\s\S]*?<pitch><step>([A-G])<\/step>/g)].map(
        (match) => match[1],
      )[1]
    })
    .toBe('D')

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Correct a pitch…' }).click()
  await page.getByLabel('Measure 1 · note 1 · note name').selectOption('A')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: scoreId })).scoreXml,
    )
    .toContain('<step>A</step>')

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Transpose…' }).click()
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => page.url().split('/').at(-1)).not.toBe(scoreId)
  const firstVariantId = page.url().split('/').at(-1)!
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score (2♯)')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: firstVariantId }))
          .scoreXml,
    )
    .toContain('<fifths>2</fifths>')
  expect(
    (await account.payload.findByID({ collection: 'binder-items', id: scoreId })).scoreXml,
  ).not.toContain('<fifths>2</fifths>')

  const siblingIds = async () => {
    const { docs } = await account.payload.find({
      collection: 'binder-items',
      where: { composition: { equals: composition.id } },
      pagination: false,
      depth: 0,
    })
    return docs
      .filter((item) => item.parent === null)
      .sort((a, b) => a.position - b.position)
      .map((item) => item.id)
  }
  await expect.poll(siblingIds).toEqual(expect.arrayContaining([scoreId, firstVariantId]))
  const firstOrder = await siblingIds()
  expect(firstOrder.indexOf(firstVariantId)).toBe(firstOrder.indexOf(scoreId) + 1)

  await page.reload()
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Correct a pitch…' }).click()
  await expect(page.getByLabel('Measure 1 · note 1 · note name')).toHaveValue('B')

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Transpose…' }).click()
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => page.url().split('/').at(-1)).not.toBe(firstVariantId)
  const secondVariantId = page.url().split('/').at(-1)!
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score (4♯)')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: secondVariantId }))
          .scoreXml,
    )
    .toContain('<fifths>4</fifths>')
  const secondOrder = await siblingIds()
  expect(secondOrder.indexOf(secondVariantId)).toBe(secondOrder.indexOf(firstVariantId) + 1)

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Transpose…' }).click()
  await page.getByLabel('Transpose for an instrument').check()
  await expect(page.getByRole('button', { name: 'Preview' })).toBeDisabled()
  await page.getByLabel('Source instrument').selectOption('concert')
  await page.getByLabel('Target instrument').selectOption('trumpet-bb')
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => page.url().split('/').at(-1)).not.toBe(secondVariantId)
  const trumpetId = page.url().split('/').at(-1)!
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: trumpetId })).scoreXml,
    )
    .toContain('<chromatic>-2</chromatic>')

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Transpose…' }).click()
  await page.getByLabel('Transpose for an instrument').check()
  await page.getByLabel('Target instrument').selectOption('concert')
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => page.url().split('/').at(-1)).not.toBe(trumpetId)
  const concertId = page.url().split('/').at(-1)!
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: concertId })).scoreXml,
    )
    .not.toContain('<transpose>')

  await page.getByRole('menuitem', { name: 'File', exact: true }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Save as MusicXML file' }).click()
  expect((await downloading).suggestedFilename()).toBe('Untitled score (Ut).musicxml')
})

test('changes key on a polyphonic piano while keeping direct correction guarded', async ({
  page,
  account,
}) => {
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score')
  const scoreId = page.url().split('/').at(-1)!

  await page
    .getByLabel('Import MusicXML…')
    .setInputFiles('tests/fixtures/scores/polyphonic-piano.musicxml')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: scoreId })).scoreXml,
    )
    .toContain('<backup>')
  await expect(page.locator('.vf-notehead')).toHaveCount(5)
  await page.locator('.vf-notehead').first().click()
  await expect(page.locator('section[aria-label="Correct a pitch…"]')).toHaveCount(0)

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Correct a pitch…' }).click()
  await expect(page.locator('section[aria-label="Correct a pitch…"]')).toContainText('<backup>')
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Transpose…' }).click()
  await page.getByLabel('Transpose for an instrument').check()
  await page.getByLabel('Source instrument').selectOption('concert')
  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(page.locator('p[role="alert"]')).toContainText('plusieurs voix ou portées')
  await page.getByLabel('Change key').check()
  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(page.locator('.vf-notehead')).toHaveCount(5)
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => page.url().split('/').at(-1)).not.toBe(scoreId)
  const transposedId = page.url().split('/').at(-1)!
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score (2♯)')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: transposedId })).scoreXml,
    )
    .toContain('<fifths>2</fifths>')
  expect(
    (await account.payload.findByID({ collection: 'binder-items', id: scoreId })).scoreXml,
  ).toContain('<fifths>0</fifths>')

  await page.getByLabel('Import MusicXML…').setInputFiles({
    name: 'unrenderable.musicxml',
    mimeType: 'application/xml',
    buffer: Buffer.from(
      '<score-partwise><part id="missing"><measure number="1"/></part></score-partwise>',
    ),
  })
  await expect(page.locator('p[role="alert"]')).toBeVisible()
  expect(
    (await account.payload.findByID({ collection: 'binder-items', id: transposedId })).scoreXml,
  ).toContain('<backup>')
})

test('renders and transposes a score with a chord, triplets and a forwarded voice', async ({
  page,
  account,
}) => {
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score')
  const sourceId = page.url().split('/').at(-1)!
  await page
    .getByLabel('Import MusicXML…')
    .setInputFiles('tests/fixtures/scores/voices-triplet.musicxml')
  await expect(page.locator('.vf-notehead')).toHaveCount(6)

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Transpose…' }).click()
  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(page.locator('.vf-notehead')).toHaveCount(6)
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => page.url().split('/').at(-1)).not.toBe(sourceId)
  const transposedId = page.url().split('/').at(-1)!
  await expect(page.locator('.vf-notehead')).toHaveCount(6)
  const source = await account.payload.findByID({ collection: 'binder-items', id: sourceId })
  const transposed = await account.payload.findByID({
    collection: 'binder-items',
    id: transposedId,
  })
  expect(source.scoreXml).toContain('<fifths>0</fifths>')
  expect(transposed.scoreXml).toContain('<fifths>2</fifths>')
  expect(transposed.scoreXml).toContain('<forward>')
  expect(transposed.scoreXml).toContain('<time-modification>')
})
