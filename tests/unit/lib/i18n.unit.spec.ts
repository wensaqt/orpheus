import { describe, expect, it } from 'vitest'

import { t } from '@front/_lib/i18n'

describe('t', () => {
  it('returns the text of a nested key', () => {
    expect(t('compositions.heading')).toBe('All compositions')
  })

  it('substitutes parameters, numbers included', () => {
    expect(t('compositions.delete.title', { title: 'Eurydice' })).toBe('Delete “Eurydice”?')
    expect(t('lexicon.found.synonyms', { word: 'vif', count: 3 })).toBe(
      'Synonyms found for “vif”: 3',
    )
  })

  it('leaves a missing parameter visible', () => {
    expect(t('compositions.delete.title', {})).toBe('Delete “{title}”?')
  })
})
