import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@front/_components/ui/Feedback/ToastProvider'
import type { SynonymResult } from '@front/_features/lexicon/types'

import { descriptionOf } from '../../helpers/dom'

const findSynonyms = vi.fn()
vi.mock('@front/_features/lexicon/actions', () => ({ findSynonyms }))

const { SynonymsPanel } = await import('@front/compositions/[id]/_components/SynonymsPanel')

const found: SynonymResult = {
  query: 'rapides',
  word: 'rapide',
  groups: [{ partOfSpeech: 'adjective', sense: null, words: ['vif', 'prompt'], reliable: true }],
  more: [{ partOfSpeech: 'adjective', sense: null, words: ['agile', 'leste'] }],
  sourceUrl: 'https://fr.wiktionary.org/wiki/rapide',
}

async function search(word: string) {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: word } })
  await act(async () => vi.advanceTimersByTimeAsync(250))
}

describe('SynonymsPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    findSynonyms.mockReset().mockResolvedValue(found)
    render(
      <ToastProvider>
        <SynonymsPanel onHide={() => {}} />
      </ToastProvider>,
    )
  })
  afterEach(() => {
    // Without Vitest globals, Testing Library does not unmount between tests on its own
    cleanup()
    vi.useRealTimers()
  })

  const announcement = () => screen.getAllByRole('status')[0].textContent

  it('has a stable landmark label and announces a short summary', async () => {
    expect(screen.getByRole('complementary', { name: 'Synonyms' })).toBeTruthy()
    await search('rapides')
    expect(announcement()).toBe('Synonyms found for “rapide”: 2')
    expect(screen.getByText('Synonyms of “rapide”')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Wiktionnaire (CC BY-SA)' }).getAttribute('href')).toBe(
      found.sourceUrl,
    )
    expect(screen.getByRole('link', { name: 'Dicollecte (LGPL)' }).getAttribute('href')).toBe(
      'https://grammalecte.net/',
    )
  })

  it('announces "no synonyms" rather than a count of zero', async () => {
    findSynonyms.mockResolvedValue({ ...found, groups: [] })
    await search('rapides')
    expect(announcement()).toBe('No synonyms found for “rapide”.')
  })

  it('describes chips as copy actions without changing their name', async () => {
    await search('rapides')
    const chip = screen.getByRole('button', { name: 'vif' })
    const hint = descriptionOf(chip)
    expect(hint?.textContent).toBe('Click to copy')
  })

  it('shows an error toast when copying fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    await search('rapides')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'vif' }))
    })
    expect(screen.getByRole('alert').textContent).toContain('Could not copy “vif”')
  })

  it('collapses the extra suggestions and flags less reliable groups', async () => {
    await search('rapides')
    const summary = screen.getByText('More suggestions (2)')
    expect(summary.closest('details')?.open).toBe(false)
    expect(screen.queryByText('May include other senses.')).toBeNull()

    findSynonyms.mockResolvedValue({
      ...found,
      groups: [{ ...found.groups[0], reliable: false }],
      more: [],
      sourceUrl: null,
    })
    await search('rares')
    expect(screen.getByText('May include other senses.')).toBeTruthy()
  })
})
