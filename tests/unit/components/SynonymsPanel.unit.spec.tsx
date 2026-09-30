import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@front/_components/ui/Feedback/ToastProvider'
import type { SynonymResult } from '@front/_features/lexicon/types'

const findSynonyms = vi.fn()
vi.mock('@front/_features/lexicon/actions', () => ({ findSynonyms }))

const { SynonymsPanel } = await import('@front/compositions/[id]/_components/SynonymsPanel')

const found: SynonymResult = {
  query: 'rapides',
  word: 'rapide',
  groups: [{ partOfSpeech: 'adjective', sense: null, words: ['vif', 'prompt'] }],
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
        <SynonymsPanel />
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
    expect(
      screen.getByRole('link', { name: 'Thesaurus by Dicollecte (LGPL)' }).getAttribute('href'),
    ).toBe('https://grammalecte.net/')
  })

  it('announces "no synonyms" rather than a count of zero', async () => {
    findSynonyms.mockResolvedValue({ ...found, groups: [] })
    await search('rapides')
    expect(announcement()).toBe('No synonyms found for “rapide”.')
  })

  it('describes chips as copy actions without changing their name', async () => {
    await search('rapides')
    const chip = screen.getByRole('button', { name: 'vif' })
    const hint = document.getElementById(chip.getAttribute('aria-describedby')!)
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
})
