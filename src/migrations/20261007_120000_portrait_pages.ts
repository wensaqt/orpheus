import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

import { toLayout } from '../lib/layout'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const { docs } = await payload.find({
    collection: 'compositions',
    where: {
      or: [
        { 'page.format': { not_in: ['A4', 'A5'] } },
        { 'page.orientation': { not_equals: 'portrait' } },
      ],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })

  for (const composition of docs) {
    await payload.update({
      collection: 'compositions',
      id: composition.id,
      data: toLayout(composition),
      overrideAccess: true,
      req,
    })
  }

  await db.execute(sql`
    ALTER TABLE "compositions" ALTER COLUMN "page_format" DROP DEFAULT;
    ALTER TABLE "compositions" ALTER COLUMN "page_orientation" DROP DEFAULT;
    ALTER TABLE "compositions" ALTER COLUMN "page_format" TYPE text;
    ALTER TABLE "compositions" ALTER COLUMN "page_orientation" TYPE text;
    DROP TYPE "enum_compositions_page_format";
    DROP TYPE "enum_compositions_page_orientation";
    CREATE TYPE "enum_compositions_page_format" AS ENUM ('A4', 'A5');
    CREATE TYPE "enum_compositions_page_orientation" AS ENUM ('portrait');
    ALTER TABLE "compositions" ALTER COLUMN "page_format"
      TYPE "enum_compositions_page_format" USING "page_format"::"enum_compositions_page_format";
    ALTER TABLE "compositions" ALTER COLUMN "page_orientation"
      TYPE "enum_compositions_page_orientation" USING "page_orientation"::"enum_compositions_page_orientation";
    ALTER TABLE "compositions" ALTER COLUMN "page_format" SET DEFAULT 'A4';
    ALTER TABLE "compositions" ALTER COLUMN "page_orientation" SET DEFAULT 'portrait';
  `)
}

// Restores the available formats; the previous dimensions of converted documents are not restored.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "enum_compositions_page_format" ADD VALUE IF NOT EXISTS 'Letter';
    ALTER TYPE "enum_compositions_page_orientation" ADD VALUE IF NOT EXISTS 'landscape';
  `)
}
