import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "enum_binder_items_document_type" AS ENUM ('text', 'score');
    ALTER TABLE "binder_items"
      ADD COLUMN "document_type" "enum_binder_items_document_type" NOT NULL DEFAULT 'text',
      ADD COLUMN "score_xml" text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "binder_items" DROP COLUMN "score_xml", DROP COLUMN "document_type";
    DROP TYPE "enum_binder_items_document_type";
  `)
}
