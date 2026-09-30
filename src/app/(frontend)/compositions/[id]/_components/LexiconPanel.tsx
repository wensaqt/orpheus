'use client'

import React, { useId } from 'react'

import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { type LexiconResult, RELATIONS } from '@front/_features/lexicon/types'
import { type LexiconStatus, useRelatedWords } from '@front/_features/lexicon/useRelatedWords'
import { t } from '@front/_lib/i18n'

import styles from './LexiconPanel.module.css'

// Panel to the right of the sheet: synonyms or antonyms of a word; clicking copies the word
export function LexiconPanel() {
  const { query, relation, status, result, setQuery, setRelation, searchNow } = useRelatedWords()
  const groupName = useId()
  const toast = useToast()

  async function copy(word: string) {
    try {
      await navigator.clipboard.writeText(word)
      toast.success(t('lexicon.copied', { word }))
    } catch {
      toast.error(t('lexicon.copyError', { word }))
    }
  }

  return (
    <aside className={styles.panel} aria-label={t(`lexicon.relations.${relation}`)}>
      {/* Real radio buttons: arrows, focus and semantics come from the browser */}
      <fieldset className={styles.relations}>
        <legend className="visually-hidden">{t('lexicon.relationLabel')}</legend>
        {RELATIONS.map((option) => (
          <label key={option} className={styles.relation}>
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={relation === option}
              onChange={() => setRelation(option)}
              className="visually-hidden"
            />
            {t(`lexicon.relations.${option}`)}
          </label>
        ))}
      </fieldset>

      <input
        type="search"
        className={styles.search}
        aria-label={t(`lexicon.searchLabel.${relation}`)}
        placeholder={t('lexicon.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') searchNow()
        }}
        autoComplete="off"
        spellCheck={false}
        lang="fr"
      />

      {/* Short announcement for screen readers, rather than the whole list */}
      <p className="visually-hidden" role="status">
        {announcement(status, result)}
      </p>

      <div className={styles.results} aria-busy={status === 'loading'}>
        {status === 'error' && <p className={styles.error}>{t('lexicon.error')}</p>}
        {result ? (
          <Results result={result} onPick={copy} />
        ) : status === 'loading' ? (
          <p className={styles.hint}>{t('lexicon.searching')}</p>
        ) : (
          status === 'idle' && <p className={styles.hint}>{t(`lexicon.hint.${relation}`)}</p>
        )}
      </div>

      {/* Wiktionary content (CC BY-SA): credit the page consulted */}
      <p className={styles.source}>
        {result?.sourceUrl ? (
          <a href={result.sourceUrl} target="_blank" rel="noreferrer" className={styles.sourceLink}>
            {t('lexicon.source')}
          </a>
        ) : (
          t('lexicon.source')
        )}{' '}
        · {t('lexicon.license')}
      </p>
    </aside>
  )
}

function announcement(status: LexiconStatus, result: LexiconResult | null) {
  if (status === 'loading') return t('lexicon.searching')
  if (status === 'error') return t('lexicon.error')
  if (status !== 'done' || !result) return ''
  const count = result.groups.reduce((total, group) => total + group.words.length, 0)
  return t(`lexicon.found.${result.relation}`, { word: result.word ?? result.query, count })
}

function Results({ result, onPick }: { result: LexiconResult; onPick: (word: string) => void }) {
  const { relation } = result
  // Page not found, or found but with no words for this relation
  if (!result.word || !result.groups.length) {
    return (
      <p className={styles.hint}>
        {t(`lexicon.empty.${relation}`, { word: result.word ?? result.query })}
      </p>
    )
  }

  return (
    <>
      {/* Shown when the search went through the base form ("rapides" → "rapide") */}
      {result.word !== result.query && (
        <p className={styles.matched}>{t(`lexicon.matched.${relation}`, { word: result.word })}</p>
      )}
      {result.groups.map((group, index) => (
        <section key={index} className={styles.group}>
          {group.partsOfSpeech.length > 0 && (
            <h3 className={styles.partsOfSpeech}>
              {group.partsOfSpeech.map((part) => t(`lexicon.partsOfSpeech.${part}`)).join(' · ')}
            </h3>
          )}
          {group.sense && (
            <p className={styles.sense} lang="fr" title={group.sense}>
              {group.sense}
            </p>
          )}
          <ul className={styles.chips}>
            {group.words.map((word, position) => (
              // --position staggers the entrance animation: the words cascade in
              <li key={word} style={{ '--position': position } as React.CSSProperties}>
                <button
                  type="button"
                  className={styles.chip}
                  lang="fr"
                  onClick={() => onPick(word)}
                >
                  {word}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
