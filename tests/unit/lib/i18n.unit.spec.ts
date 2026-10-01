import { describe, expect, it } from 'vitest'

import { createT, negotiateLocale } from '@front/_lib/i18n'

const t = createT('en')

describe('createT', () => {
  it('returns the text of a nested key', () => {
    expect(t('compositions.heading')).toBe('All compositions')
    expect(createT('fr')('compositions.heading')).toBe('Toutes les compositions')
  })

  it('substitutes parameters, numbers included', () => {
    expect(t('compositions.delete.title', { title: 'Eurydice' })).toBe('Delete “Eurydice”?')
    expect(t('synonyms.found', { word: 'vif', count: 3 })).toBe('Synonyms found for “vif”: 3')
  })

  it('follows French typography: narrow no-break spaces inside quotes and before "?"', () => {
    expect(createT('fr')('compositions.delete.title', { title: 'Eurydice' })).toBe(
      'Supprimer « Eurydice » ?',
    )
  })

  it('leaves a missing parameter visible', () => {
    expect(t('compositions.delete.title', {})).toBe('Delete “{title}”?')
  })
})

describe('negotiateLocale', () => {
  it('keeps the language chosen by the visitor', () => {
    expect(negotiateLocale('fr', 'en-US,en;q=0.9')).toBe('fr')
  })

  it('otherwise takes the browser’s most preferred language we have', () => {
    expect(negotiateLocale(undefined, 'fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr')
    expect(negotiateLocale(undefined, 'de-DE,de;q=0.9,fr;q=0.5,en;q=0.7')).toBe('en')
  })

  it('ignores an unknown cookie and refused languages, then falls back to English', () => {
    expect(negotiateLocale('xx', 'fr;q=0')).toBe('en')
    expect(negotiateLocale(undefined, null)).toBe('en')
  })
})
