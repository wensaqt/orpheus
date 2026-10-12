// Bootstrap for an empty database, before the historical portrait/score migrations.
import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'user');
  CREATE TYPE "public"."enum_users_plan" AS ENUM('free', 'pro');
  CREATE TYPE "public"."enum_compositions_page_format" AS ENUM('A4', 'A5', 'Letter');
  CREATE TYPE "public"."enum_compositions_page_orientation" AS ENUM('portrait', 'landscape');
  CREATE TYPE "public"."enum_binder_items_kind" AS ENUM('folder', 'document');
  CREATE TYPE "public"."enum_thesaurus_entries_lang" AS ENUM('fr');
  CREATE TYPE "public"."enum_thesaurus_entries_source" AS ENUM('wiktionary', 'dicollecte');
  CREATE TYPE "public"."enum_thesaurus_entries_lemma_part_of_speech" AS ENUM('noun', 'adjective', 'verb', 'adverb', 'pronoun', 'preposition', 'conjunction', 'determiner', 'interjection');
  CREATE TABLE "users_sessions" (
    "_order" integer NOT NULL,
    "_parent_id" uuid NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "created_at" timestamp(3) with time zone,
    "expires_at" timestamp(3) with time zone NOT NULL
  );

  CREATE TABLE "users" (
    "id" uuid PRIMARY KEY NOT NULL,
    "role" "enum_users_role" DEFAULT 'user',
    "plan" "enum_users_plan" DEFAULT 'free',
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "email" varchar NOT NULL,
    "reset_password_token" varchar,
    "reset_password_expiration" timestamp(3) with time zone,
    "salt" varchar,
    "hash" varchar,
    "reset_password_requested_at" timestamp(3) with time zone,
    "login_attempts" numeric DEFAULT 0,
    "lock_until" timestamp(3) with time zone
  );

  CREATE TABLE "media" (
    "id" uuid PRIMARY KEY NOT NULL,
    "alt" varchar NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "url" varchar,
    "thumbnail_u_r_l" varchar,
    "filename" varchar,
    "mime_type" varchar,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "focal_x" numeric,
    "focal_y" numeric
  );

  CREATE TABLE "compositions" (
    "id" uuid PRIMARY KEY NOT NULL,
    "title" varchar DEFAULT 'Untitled composition' NOT NULL,
    "owner_id" uuid NOT NULL,
    "page_format" "enum_compositions_page_format" DEFAULT 'A4' NOT NULL,
    "page_orientation" "enum_compositions_page_orientation" DEFAULT 'portrait' NOT NULL,
    "page_margins_top" numeric DEFAULT 25,
    "page_margins_right" numeric DEFAULT 25,
    "page_margins_bottom" numeric DEFAULT 25,
    "page_margins_left" numeric DEFAULT 25,
    "typography_first_line_indent" numeric DEFAULT 0,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "binder_items" (
    "id" uuid PRIMARY KEY NOT NULL,
    "title" varchar DEFAULT 'Untitled document' NOT NULL,
    "kind" "enum_binder_items_kind" DEFAULT 'document' NOT NULL,
      "composition_id" uuid NOT NULL,
    "owner_id" uuid NOT NULL,
    "parent_id" uuid,
    "position" numeric NOT NULL,
    "content" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "thesaurus_entries" (
    "id" uuid PRIMARY KEY NOT NULL,
    "word" varchar NOT NULL,
    "lang" "enum_thesaurus_entries_lang" DEFAULT 'fr' NOT NULL,
    "source" "enum_thesaurus_entries_source" DEFAULT 'dicollecte' NOT NULL,
    "groups" jsonb NOT NULL,
    "lemma" varchar,
    "lemma_part_of_speech" "enum_thesaurus_entries_lemma_part_of_speech"
  );

  CREATE TABLE "payload_kv" (
    "id" uuid PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "data" jsonb NOT NULL
  );

  CREATE TABLE "payload_locked_documents" (
    "id" uuid PRIMARY KEY NOT NULL,
    "global_slug" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_locked_documents_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" uuid NOT NULL,
    "path" varchar NOT NULL,
    "users_id" uuid,
    "media_id" uuid,
    "compositions_id" uuid,
    "binder_items_id" uuid,
    "thesaurus_entries_id" uuid
  );

  CREATE TABLE "payload_preferences" (
    "id" uuid PRIMARY KEY NOT NULL,
    "key" varchar,
    "value" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_preferences_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" uuid NOT NULL,
    "path" varchar NOT NULL,
    "users_id" uuid
  );

  CREATE TABLE "payload_migrations" (
    "id" uuid PRIMARY KEY NOT NULL,
    "name" varchar,
    "batch" numeric,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "compositions" ADD CONSTRAINT "compositions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "binder_items" ADD CONSTRAINT "binder_items_composition_id_compositions_id_fk" FOREIGN KEY ("composition_id") REFERENCES "public"."compositions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "binder_items" ADD CONSTRAINT "binder_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "binder_items" ADD CONSTRAINT "binder_items_parent_id_binder_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."binder_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_compositions_fk" FOREIGN KEY ("compositions_id") REFERENCES "public"."compositions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_binder_items_fk" FOREIGN KEY ("binder_items_id") REFERENCES "public"."binder_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_thesaurus_entries_fk" FOREIGN KEY ("thesaurus_entries_id") REFERENCES "public"."thesaurus_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "compositions_owner_idx" ON "compositions" USING btree ("owner_id");
  CREATE INDEX "compositions_updated_at_idx" ON "compositions" USING btree ("updated_at");
  CREATE INDEX "compositions_created_at_idx" ON "compositions" USING btree ("created_at");
  CREATE INDEX "binder_items_composition_idx" ON "binder_items" USING btree ("composition_id");
  CREATE INDEX "binder_items_owner_idx" ON "binder_items" USING btree ("owner_id");
  CREATE INDEX "binder_items_parent_idx" ON "binder_items" USING btree ("parent_id");
  CREATE INDEX "binder_items_updated_at_idx" ON "binder_items" USING btree ("updated_at");
  CREATE INDEX "binder_items_created_at_idx" ON "binder_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "word_lang_source_idx" ON "thesaurus_entries" USING btree ("word","lang","source");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_compositions_id_idx" ON "payload_locked_documents_rels" USING btree ("compositions_id");
  CREATE INDEX "payload_locked_documents_rels_binder_items_id_idx" ON "payload_locked_documents_rels" USING btree ("binder_items_id");
  CREATE INDEX "payload_locked_documents_rels_thesaurus_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("thesaurus_entries_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "compositions" CASCADE;
  DROP TABLE "binder_items" CASCADE;
  DROP TABLE "thesaurus_entries" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_plan";
  DROP TYPE "public"."enum_compositions_page_format";
  DROP TYPE "public"."enum_compositions_page_orientation";
  DROP TYPE "public"."enum_binder_items_kind";
  DROP TYPE "public"."enum_thesaurus_entries_lang";
  DROP TYPE "public"."enum_thesaurus_entries_source";
  DROP TYPE "public"."enum_thesaurus_entries_lemma_part_of_speech";`)
}
