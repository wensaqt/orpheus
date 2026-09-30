/*
 * Fills the `thesaurus-entries` collection from the French myThes thesaurus (Dicollecte,
 * LGPL 2.1+), as shipped in LibreOffice's dictionaries repository.
 *
 *   pnpm thesaurus:import
 *
 * Idempotent: the French entries are replaced in one transaction, so the table is never left
 * half-filled. Rows are inserted in SQL batches — creating ~36k documents one by one through the
 * Local API would take minutes.
 */
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { eq } from '@payloadcms/db-postgres/drizzle'
import { getPayload } from 'payload'

import config from '@payload-config'
import { parseMyThes } from '@/lib/thesaurus/mythes'

const SOURCE_URL =
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/fr_FR/dictionaries/thes_fr.dat'
const LANG = 'fr'
const BATCH_SIZE = 1000

const payload = await getPayload({ config })
const db = payload.db as unknown as PostgresAdapter
const table = db.tables.thesaurus_entries

console.log(`Downloading ${SOURCE_URL}`)
const response = await fetch(SOURCE_URL)
if (!response.ok) throw new Error(`Download failed: ${response.status}`)
const entries = parseMyThes(await response.text())
console.log(`Parsed ${entries.length} entries`)

await db.drizzle.transaction(async (tx) => {
  await tx.delete(table).where(eq(table.lang, LANG))
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries
      .slice(i, i + BATCH_SIZE)
      .map(({ word, groups }) => ({ word, lang: LANG, groups }))
    await tx.insert(table).values(batch)
  }
})

const { totalDocs } = await payload.count({ collection: 'thesaurus-entries' })
console.log(`Imported: ${totalDocs} entries`)
process.exit(0)
