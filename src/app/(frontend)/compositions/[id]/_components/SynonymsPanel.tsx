'use client'

import { THESAURUS_LANGUAGE } from '@/lib/thesaurus/types'

import { type KeyboardEvent, useId } from 'react'

import { THESAURUS_CREDITS } from '@/lib/thesaurus/source'

import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'

import { type SynonymResult, SynonymStatus } from '@front/_features/lexicon/types'
import { useSynonyms } from '@front/_features/lexicon/useSynonyms'
import { useT } from '@front/_components/i18n/I18nProvider'
import type { Translate } from '@front/_lib/i18n'

import { ChevronIcon } from './icons'
import styles from './SynonymsPanel.module.css'
import { hasSynonyms, SynonymResults } from './SynonymResults'

// Panel beside the sheet: synonyms of a word; clicking one copies it. It folds away (onHide)
export function SynonymsPanel({ onHide }: { onHide: () => void }) {
  const t = useT()
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

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') searchNow()
  }

  return (
    <aside className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.heading}>
        <h2 id={titleId} className={styles.title}>
          {t('synonyms.title')}
        </h2>
        <IconButton
          label={t('synonyms.hide')}
          tooltipAlign="end"
          icon={<ChevronIcon />}
          onClick={onHide}
        />
      </div>

      <input
        type="search"
        className={styles.search}
        aria-label={t('synonyms.searchLabel')}
        placeholder={t('synonyms.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        autoComplete="off"
        spellCheck={false}
        lang={THESAURUS_LANGUAGE}
      />

      {/* Short announcement for screen readers rather than the whole list */}
      <p className="visually-hidden" role="status">
        {announcement(t, status, result)}
      </p>
      {/* Describes what a word chip does, without changing its accessible name */}
      <p id={copyHintId} className="visually-hidden">
        {t('synonyms.copyHint')}
      </p>

      <div className={styles.results} aria-busy={status === SynonymStatus.Loading}>
        {status === SynonymStatus.Error && <p className={styles.error}>{t('synonyms.error')}</p>}
        {result ? (
          <SynonymResults result={result} copyHintId={copyHintId} onPick={copy} />
        ) : status === SynonymStatus.Loading ? (
          <p className={styles.hint}>{t('synonyms.searching')}</p>
        ) : (
          status === SynonymStatus.Idle && <p className={styles.hint}>{t('synonyms.hint')}</p>
        )}
      </div>

      {/* Credit both sources; the Wiktionary (CC BY-SA) is credited per page when used */}
      <p className={styles.source}>
        {t('synonyms.sources')}{' '}
        <a
          href={result?.sourceUrl ?? THESAURUS_CREDITS.wiktionary.url}
          target="_blank"
          rel="noreferrer"
          className={styles.sourceLink}
        >
          {t('synonyms.credit', THESAURUS_CREDITS.wiktionary)}
        </a>
        {' · '}
        <a
          href={THESAURUS_CREDITS.dicollecte.url}
          target="_blank"
          rel="noreferrer"
          className={styles.sourceLink}
        >
          {t('synonyms.credit', THESAURUS_CREDITS.dicollecte)}
        </a>
      </p>
    </aside>
  )
}

function announcement(t: Translate, status: SynonymStatus, result: SynonymResult | null) {
  if (status === SynonymStatus.Loading) return t('synonyms.searching')
  if (status === SynonymStatus.Error) return t('synonyms.error')
  if (status !== SynonymStatus.Done || !result) return ''
  const word = result.word ?? result.query
  if (!hasSynonyms(result)) return t('synonyms.empty', { word })
  const count = result.groups.reduce((total, group) => total + group.words.length, 0)
  return t('synonyms.found', { word, count })
}
