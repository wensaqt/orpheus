import { seed } from './binderHelpers'
import { expect, test, type Account } from './fixtures'
import { signIn } from './authHelpers'
import { TEST_PASSWORD } from '../helpers/testUsers'

async function savedFirstPitch(account: Account, id: string) {
  const { scoreXml } = await account.payload.findByID({ collection: 'binder-items', id })
  return scoreXml?.match(/<pitch>\s*<step>([A-G])<\/step>/)?.[1]
}

test('adds and removes measures in the browser and keeps them after reload', async ({
  page,
  account,
}) => {
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await expect(page.locator('.vf-notehead')).toHaveCount(7)
  const id = page.url().split('/').at(-1)!
  const savedMeasureCount = async () => {
    const { scoreXml } = await account.payload.findByID({ collection: 'binder-items', id })
    return [...(scoreXml ?? '').matchAll(/<measure\b/g)].length
  }
  const openMeasures = async () => {
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Measures…', exact: true }).click()
  }
  await expect(page.getByLabel('Import MusicXML…')).toBeHidden()
  await openMeasures()
  await page.getByRole('button', { name: 'Add a measure at the end' }).click()
  await page.getByRole('button', { name: 'Add a measure at the end' }).click()
  await expect(page.getByLabel('Measure to remove').locator('option')).toHaveCount(4)
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.vf-notehead')).toHaveCount(9)
  await expect.poll(savedMeasureCount).toBe(4)
  await page.reload()
  await openMeasures()
  await expect(page.getByLabel('Measure to remove').locator('option')).toHaveCount(4)
  await page.getByLabel('Measure to remove').selectOption('0')
  await page.getByRole('button', { name: 'Delete this measure' }).click()
  await expect(page.getByLabel('Measure to remove').locator('option')).toHaveCount(3)
  await expect(page.locator('.vf-notehead')).toHaveCount(5)
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await expect.poll(savedMeasureCount).toBe(3)
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Measure 2', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Measure 2', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page
    .getByRole('group', { name: 'Measure actions' })
    .getByRole('button', { name: 'Add after', exact: true })
    .click()
  await expect(page.locator('[data-score-measure]')).toHaveCount(4)
  await page
    .getByRole('group', { name: 'Measure actions' })
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click()
  await expect(page.locator('[data-score-measure]')).toHaveCount(5)
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Undo', exact: true }).click()
  await expect(page.locator('[data-score-measure]')).toHaveCount(4)
  await expect(page.getByRole('group', { name: 'Measure actions' })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Redo', exact: true }).click()
  await expect(page.locator('[data-score-measure]')).toHaveCount(5)
  await expect.poll(savedMeasureCount).toBe(5)
})

test('an expired score session can reconnect without losing pitch corrections', async ({
  page,
  account,
}) => {
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await page.locator('.vf-notehead').first().click()
  const id = page.url().split('/').at(-1)!
  await account.payload.update({ collection: 'users', id: account.user.id, data: { sessions: [] } })
  await page.getByLabel('Measure 1 · note 1 · note name').selectOption('A')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Your session expired')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download my draft' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.musicxml$/)
  const popup = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Sign in in a new tab' }).click()
  const login = await popup
  await signIn(login, account.user.email, TEST_PASSWORD)
  await expect(login).toHaveURL(page.url())
  await login.close()
  await page.getByRole('button', { name: 'Retry saving after signing in' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await expect.poll(() => savedFirstPitch(account, id)).toBe('A')
  await page.reload()
  await page.locator('.vf-notehead').first().click()
  await expect(page.getByLabel('Measure 1 · note 1 · note name')).toHaveValue('A')
})

test('a conflicting score offers export and reload without overwriting the first tab', async ({
  page,
  account,
}) => {
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await page.locator('.vf-notehead').first().click()
  const id = page.url().split('/').at(-1)!
  const other = await page.context().newPage()
  try {
    await other.goto(page.url())
    await other.locator('.vf-notehead').first().click()
    await page.getByLabel('Measure 1 · note 1 · note name').selectOption('A')
    await expect.poll(() => savedFirstPitch(account, id)).toBe('A')
    await other.getByLabel('Measure 1 · note 1 · note name').selectOption('B')
    await expect(other.getByRole('main').getByRole('alert')).toContainText(
      'Another version was saved',
    )
    await expect(other.getByRole('button', { name: 'Download my draft' })).toBeVisible()
    await expect(other.getByRole('button', { name: 'Retry saving after signing in' })).toHaveCount(
      0,
    )
    await other.getByRole('button', { name: 'Load saved version' }).click()
    await other.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
    await other.locator('.vf-notehead').first().click()
    await expect(other.getByLabel('Measure 1 · note 1 · note name')).toHaveValue('A')
  } finally {
    await other.close()
  }
})

test('keeps corrections when reopening the score initially rendered by the server', async ({
  page,
  account,
}) => {
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  const title = page.getByLabel('Document title')
  await expect(title).toHaveValue('Untitled score')
  await title.fill('Source score')
  await title.blur()
  const sourceId = page.url().split('/').at(-1)!
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: sourceId })).title,
    )
    .toBe('Source score')
  // A reload supplies the initial server snapshot that must not be reused after a save.
  await page.reload()
  await page.locator('.vf-notehead').first().click()
  await page.getByLabel('Measure 1 · note 1 · note name').selectOption('A')
  await expect
    .poll(
      async () =>
        (await account.payload.findByID({ collection: 'binder-items', id: sourceId })).scoreXml,
    )
    .toContain('<step>A</step>')
  await page.getByRole('button', { name: 'New score' }).click()
  await expect(title).toHaveValue('Untitled score')
  await page.getByRole('treeitem', { name: 'Source score', exact: true }).click()
  await expect(title).toHaveValue('Source score')
  await page.locator('.vf-notehead').first().click()
  await expect(page.getByLabel('Measure 1 · note 1 · note name')).toHaveValue('A')
})

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

test('converts a piano source to concert pitch while preserving both staves after reload', async ({
  page,
  account,
}) => {
  const { composition } = await seed(account)
  await page.goto(`/compositions/${composition.id}`)
  await page.getByRole('button', { name: 'New score' }).click()
  await expect(page.locator('.vf-notehead')).toHaveCount(7)
  const sourceId = page.url().split('/').at(-1)!
  await page
    .getByLabel('Import MusicXML…')
    .setInputFiles('tests/fixtures/scores/polyphonic-piano.musicxml')
  const savedSource = async () =>
    (await account.payload.findByID({ collection: 'binder-items', id: sourceId })).scoreXml
  await expect.poll(savedSource).toContain('<backup>')
  const original = await savedSource()
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Transpose…' }).click()
  await page.getByLabel('Transpose for an instrument').check()
  const source = page.getByLabel('Source instrument')
  const target = page.getByLabel('Target instrument')
  await expect(source.getByRole('option', { name: 'Piano', exact: true })).toHaveCount(1)
  await expect(target.getByRole('option', { name: 'Piano', exact: true })).toHaveCount(0)
  await source.selectOption('piano')
  await target.selectOption('concert')
  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(page.locator('.vf-notehead')).toHaveCount(5)
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => page.url().split('/').at(-1)).not.toBe(sourceId)
  const variantId = page.url().split('/').at(-1)!
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score (Ut)')
  const { scoreXml } = await account.payload.findByID({
    collection: 'binder-items',
    id: variantId,
  })
  expect(scoreXml).toContain('<staves>2</staves>')
  expect(scoreXml).toContain('<backup>')
  expect(scoreXml).toContain('<clef number="2"><sign>F</sign><line>4</line></clef>')
  expect(scoreXml).not.toContain('<transpose>')
  expect(await savedSource()).toBe(original)
  await page.reload()
  await expect(page.locator('.vf-notehead')).toHaveCount(5)
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled score (Ut)')
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
  await expect(page.locator('p[role="alert"]')).toContainText('multiple voices or staves')
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
