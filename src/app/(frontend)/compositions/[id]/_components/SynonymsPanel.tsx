'use client'

import React, { useId } from 'react'

import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { THESAURUS_SOURCE } from '@/lib/thesaurus/source'

import type { SynonymResult } from '@front/_features/lexicon/types'
import { type SynonymStatus, useSynonyms } from '@front/_features/lexicon/useSynonyms'
import { t } from '@front/_lib/i18n'

import styles from './SynonymsPanel.module.css'

// Panel beside the sheet: synonyms of a word; clicking one copies it
export function SynonymsPanel() {
  const { query, status, result, setQuery, searchNow } = useSynonyms()
  const titleId = useId()
  const copyHintId = useId()
  const toast = useToast()

  async function copy(word: string) {
    try {
      await navigator.clipboard.writeText(word)
      toast.success(t('synonyms.copied', { word }))
    } catch {
      toast.error(t('synonyms.copyError', { word }))
    }
  }

  return (
    <aside className={styles.panel} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t('synonyms.title')}
      </h2>

      <input
        type="search"
        className={styles.search}
        aria-label={t('synonyms.searchLabel')}
        placeholder={t('synonyms.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') searchNow()
        }}
        autoComplete="off"
        spellCheck={false}
        lang="fr"
      />

      {/* Short announcement for screen readers rather than the whole list */}
      <p className="visually-hidden" role="status">
        {announcement(status, result)}
      </p>
      {/* Describes what a word chip does, without changing its accessible name */}
      <p id={copyHintId} className="visually-hidden">
        {t('synonyms.copyHint')}
      </p>

      <div className={styles.results} aria-busy={status === 'loading'}>
        {status === 'error' && <p className={styles.error}>{t('synonyms.error')}</p>}
        {result ? (
          <Results result={result} copyHintId={copyHintId} onPick={copy} />
        ) : status === 'loading' ? (
          <p className={styles.hint}>{t('synonyms.searching')}</p>
        ) : (
          status === 'idle' && <p className={styles.hint}>{t('synonyms.hint')}</p>
        )}
      </div>

      {/* LGPL thesaurus: credit its source */}
      <p className={styles.source}>
        <a
          href={THESAURUS_SOURCE.url}
          target="_blank"
          rel="noreferrer"
          className={styles.sourceLink}
        >
          {t('synonyms.source', { name: THESAURUS_SOURCE.name, license: THESAURUS_SOURCE.license })}
        </a>
      </p>
    </aside>
  )
}

const hasSynonyms = (result: SynonymResult) => Boolean(result.word && result.groups.length)

function announcement(status: SynonymStatus, result: SynonymResult | null) {
  if (status === 'loading') return t('synonyms.searching')
  if (status === 'error') return t('synonyms.error')
  if (status !== 'done' || !result) return ''
  const word = result.word ?? result.query
  if (!hasSynonyms(result)) return t('synonyms.empty', { word })
  const count = result.groups.reduce((total, group) => total + group.words.length, 0)
  return t('synonyms.found', { word, count })
}

type ResultsProps = {
  result: SynonymResult
  copyHintId: string
  onPick: (word: string) => void
}

function Results({ result, copyHintId, onPick }: ResultsProps) {
  // Page not found, or found but without synonyms
  if (!hasSynonyms(result)) {
    return (
      <p className={styles.hint}>{t('synonyms.empty', { word: result.word ?? result.query })}</p>
    )
  }

  return (
    <>
      {/* Stated when the entry differs from the query ("rapides" → "rapide") */}
      {result.word !== result.query && (
        <p className={styles.matched}>{t('synonyms.matched', { word: result.word! })}</p>
      )}
      {result.groups.map((group, index) => (
        <section key={index} className={styles.group}>
          <h3 className={styles.partOfSpeech}>
            {t(`synonyms.partsOfSpeech.${group.partOfSpeech}`)}
          </h3>
          {group.sense && (
            <p className={styles.sense} lang="fr" title={group.sense}>
              {group.sense}
            </p>
          )}
          <ul className={styles.chips}>
            {group.words.map((word, position) => (
              // --position staggers the appear animation: words cascade in
              <li key={word} style={{ '--position': position } as React.CSSProperties}>
                <button
                  type="button"
                  className={styles.chip}
                  lang="fr"
                  aria-describedby={copyHintId}
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
