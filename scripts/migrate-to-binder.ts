/*
 * One-off data migration: the text of a composition moves into its binder. Each composition
 * that has no binder item yet gets one document at the root, holding its former content and
 * titled like it; then the old compositions.content column is dropped.
 *
 *   pnpm binder:migrate
 *
 * Safe to run again: compositions that already have a binder are left alone. The content is
 * read with SQL, as the field no longer exists in the Payload config.
 */
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres/drizzle'
import { getPayload } from 'payload'

import config from '@payload-config'
import type { BinderItem } from '@/payload-types'

const payload = await getPayload({ config })
const db = (payload.db as unknown as PostgresAdapter).drizzle

const { rows: columns } = await db.execute(
  sql`select 1 from information_schema.columns where table_name = 'compositions' and column_name = 'content'`,
)
if (!columns.length) {
  console.log('Nothing to migrate: compositions.content is already gone')
  process.exit(0)
}

const { rows } = await db.execute<{
  id: number
  title: string
  owner_id: number
  content: unknown
}>(
  sql`select c.id, c.title, c.owner_id, c.content from compositions c
      where not exists (select 1 from binder_items b where b.composition_id = c.id)`,
)

let migrated = 0
for (const row of rows) {
  await payload.create({
    collection: 'binder-items',
    data: {
      composition: row.id,
      owner: row.owner_id,
      kind: 'document',
      title: row.title,
      position: 0,
      content: (row.content ?? null) as BinderItem['content'],
    },
    depth: 0,
  })
  migrated++
}

await db.execute(sql`alter table compositions drop column content`)
console.log(`${migrated} compositions moved into their binder; compositions.content dropped`)
process.exit(0)
