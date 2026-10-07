/*
 * Fills the `thesaurus-entries` collection from two open sources:
 *   - Dicollecte myThes thesaurus (LGPL 2.1+), from LibreOffice's dictionaries repository: rich
 *     but noisy, shown as "more suggestions";
 *   - French Wiktionary (CC BY-SA) via the kaikki.org wiktextract export: curated synonyms,
 *     grouped by sense, and base forms of inflected words ("marchait" → "marcher").
 *
 *   pnpm thesaurus:import                 both sources
 *   pnpm thesaurus:import dicollecte      one source only (wiktionary / dicollecte)
 *
 * The Wiktionary export (~3 GB) is streamed and never stored: only its synonyms and base forms
 * are kept. Each source is replaced in its own transaction, so the table is never left
 * half-filled, and rows are inserted in SQL batches.
 */
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'

import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { and, eq } from '@payloadcms/db-postgres/drizzle'
import { getPayload } from 'payload'

import config from '@payload-config'
import { createKaikkiCollector, extractRecord, mayContribute } from '@/lib/thesaurus/kaikki'
import { parseMyThes } from '@/lib/thesaurus/mythes'
import {
  THESAURUS_LANGUAGE,
  THESAURUS_SOURCES,
  type ThesaurusEntry,
  type ThesaurusSource,
} from '@/lib/thesaurus/types'
import { isOneOf } from '@/lib/guards'

const DICOLLECTE_URL =
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/fr_FR/dictionaries/thes_fr.dat'
const KAIKKI_URL =
  'https://kaikki.org/frwiktionary/Fran%C3%A7ais/kaikki.org-dictionary-Fran%C3%A7ais.jsonl'
const BATCH_SIZE = 1000
const PROGRESS_EVERY = 500_000

const requested = process.argv[2]
if (requested !== undefined && !isOneOf(THESAURUS_SOURCES, requested)) {
  console.error('Usage: pnpm thesaurus:import [wiktionary|dicollecte]')
  process.exit(1)
}

const payload = await getPayload({ config })
// Payload exposes a generic adapter; payload.config.ts installs the Postgres adapter.
const db = payload.db as unknown as PostgresAdapter
const table = db.tables.thesaurus_entries

async function download(url: string) {
  console.log(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status}`)
  return response
}

async function replaceSource(source: ThesaurusSource, rows: ThesaurusEntry[]) {
  await db.drizzle.transaction(async (tx) => {
    await tx.delete(table).where(and(eq(table.lang, THESAURUS_LANGUAGE), eq(table.source, source)))
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
        word: row.word,
        lang: THESAURUS_LANGUAGE,
        source,
        groups: row.groups,
        lemma: row.lemma ?? null,
        lemmaPartOfSpeech: row.lemmaPartOfSpeech ?? null,
      }))
      await tx.insert(table).values(batch)
    }
  })
  console.log(`${source}: ${rows.length} entries imported`)
}

async function importDicollecte() {
  const entries = parseMyThes(await (await download(DICOLLECTE_URL)).text())
  await replaceSource('dicollecte', entries)
  return new Set(entries.map((entry) => entry.word))
}

async function importWiktionary(dicollecteWords: Set<string>) {
  const response = await download(KAIKKI_URL)
  const collector = createKaikkiCollector()
  const lines = createInterface({
    // Fetch uses DOM stream types; Node's adapter expects its own compatible stream type.
    input: Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    crlfDelay: Infinity,
  })

  let read = 0
  for await (const line of lines) {
    if (++read % PROGRESS_EVERY === 0) console.log(`  ${read} records read`)
    if (!mayContribute(line)) continue
    const extracted = extractRecord(JSON.parse(line))
    if (extracted) collector.add(extracted)
  }

  await replaceSource(
    'wiktionary',
    collector.entries((word) => dicollecteWords.has(word)),
  )
}

// Dicollecte words are needed to decide which Wiktionary inflected forms are worth keeping
const dicollecteWords =
  requested === 'wiktionary'
    ? new Set(
        (
          await payload.find({
            collection: 'thesaurus-entries',
            where: { source: { equals: 'dicollecte' } },
            select: { word: true },
            pagination: false,
            depth: 0,
          })
        ).docs.map((doc) => doc.word),
      )
    : await importDicollecte()
if (requested !== 'dicollecte') await importWiktionary(dicollecteWords)

const { totalDocs } = await payload.count({ collection: 'thesaurus-entries' })
console.log(`Done: ${totalDocs} entries in total`)
process.exit(0)
