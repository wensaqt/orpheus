import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "beta_invitations" (
    "id" uuid PRIMARY KEY NOT NULL,
    "email" varchar NOT NULL,
    "token_hash" varchar NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "consumed_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "beta_invitations_id" uuid;
  CREATE UNIQUE INDEX "beta_invitations_token_hash_idx" ON "beta_invitations" USING btree ("token_hash");
  CREATE INDEX "beta_invitations_updated_at_idx" ON "beta_invitations" USING btree ("updated_at");
  CREATE INDEX "beta_invitations_created_at_idx" ON "beta_invitations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_beta_invitations_fk" FOREIGN KEY ("beta_invitations_id") REFERENCES "public"."beta_invitations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_beta_invitations_id_idx" ON "payload_locked_documents_rels" USING btree ("beta_invitations_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "beta_invitations_id";
    DROP TABLE "beta_invitations";
  `)
}
