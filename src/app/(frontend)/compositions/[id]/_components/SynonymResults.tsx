import { THESAURUS_LANGUAGE } from '@/lib/thesaurus/types'
import type { SynonymGroup } from '@/lib/thesaurus/types'

import { useT } from '@front/_components/i18n/I18nProvider'
import type { SynonymResult } from '@front/_features/lexicon/types'

import styles from './SynonymsPanel.module.css'

// An entry was found, with synonyms
export const hasSynonyms = (result: SynonymResult): result is SynonymResult & { word: string } =>
  Boolean(result.word) && result.groups.length > 0

type ResultsProps = {
  result: SynonymResult
  copyHintId: string
  onPick: (word: string) => void
}

export function SynonymResults({ result, copyHintId, onPick }: ResultsProps) {
  const t = useT()
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
        <p className={styles.matched}>{t('synonyms.matched', { word: result.word })}</p>
      )}
      <Groups groups={result.groups} copyHintId={copyHintId} onPick={onPick} />
      {result.more.length > 0 && (
        // Native disclosure: keyboard- and screen-reader-friendly, collapsed by default
        <details className={styles.more}>
          <summary className={styles.moreSummary}>
            {t('synonyms.more', {
              count: result.more.reduce((total, group) => total + group.words.length, 0),
            })}
          </summary>
          <Groups groups={result.more} copyHintId={copyHintId} onPick={onPick} />
        </details>
      )}
    </>
  )
}

type GroupsProps = Omit<ResultsProps, 'result'> & {
  groups: (SynonymGroup & { reliable?: boolean })[]
}

function Groups({ groups, copyHintId, onPick }: GroupsProps) {
  const t = useT()
  return groups.map((group, index) => (
    // data-reliable: less reliable groups (Dicollecte) are shown paler
    <section key={index} className={styles.group} data-reliable={group.reliable !== false}>
      <h3 className={styles.partOfSpeech}>{t(`synonyms.partsOfSpeech.${group.partOfSpeech}`)}</h3>
      {group.reliable === false && <p className={styles.sense}>{t('synonyms.lessReliable')}</p>}
      {group.sense && (
        <p className={styles.sense} lang={THESAURUS_LANGUAGE} title={group.sense}>
          {group.sense}
        </p>
      )}
      <ul className={styles.chips}>
        {group.words.map((word, position) => (
          // --position staggers the appear animation: words cascade in
          <li key={word} style={{ '--position': position }}>
            <button
              type="button"
              className={styles.chip}
              lang={THESAURUS_LANGUAGE}
              aria-describedby={copyHintId}
              onClick={() => onPick(word)}
            >
              {word}
            </button>
          </li>
        ))}
      </ul>
    </section>
  ))
}
