import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_users_roles" AS ENUM('admin');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_lessons_liturgical_season" AS ENUM(
        'advent',
        'christmas',
        'epiphany',
        'lent',
        'holy-week',
        'easter',
        'pentecost',
        'ordinary-time'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_lessons_lectionary_year" AS ENUM('A', 'B', 'C');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_lessons_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "users_roles" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_users_roles",
      "id" serial PRIMARY KEY NOT NULL
    );

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_roles_parent_fk'
      ) THEN
        ALTER TABLE "users_roles"
          ADD CONSTRAINT "users_roles_parent_fk"
          FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "users_roles_order_idx" ON "users_roles" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");

    INSERT INTO "users_roles" ("order", "parent_id", "value")
    SELECT 0, "id", 'admin'::"public"."enum_users_roles"
    FROM "users"
    WHERE NOT EXISTS (
      SELECT 1 FROM "users_roles" WHERE "users_roles"."parent_id" = "users"."id"
    );

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'media' AND column_name = 'alt'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'media' AND column_name = 'alt_text'
      ) THEN
        ALTER TABLE "media" RENAME COLUMN "alt" TO "alt_text";
      END IF;
    END $$;

    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "alt_text" varchar;
    UPDATE "media" SET "alt_text" = '' WHERE "alt_text" IS NULL;
    ALTER TABLE "media" ALTER COLUMN "alt_text" SET NOT NULL;
    ALTER TABLE "media" DROP COLUMN IF EXISTS "alt";
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "artist" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "artist_dates" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "work_date" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "wikimedia_url" varchar;

    CREATE TABLE IF NOT EXISTS "lessons_scriptures" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "reference" varchar NOT NULL,
      "translation" varchar DEFAULT 'NRSV-UE',
      "passage_text" varchar
    );

    CREATE TABLE IF NOT EXISTS "lessons_study_questions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "question" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "lessons_quotes" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar NOT NULL,
      "author" varchar,
      "source" varchar
    );

    CREATE TABLE IF NOT EXISTS "lessons_artworks" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" integer NOT NULL,
      "caption" varchar
    );

    CREATE TABLE IF NOT EXISTS "lessons_video_links" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "youtube_url" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "lessons_links" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "url" varchar NOT NULL,
      "description" varchar
    );

    CREATE TABLE IF NOT EXISTS "lessons" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "liturgical_season" "enum_lessons_liturgical_season" NOT NULL,
      "lectionary_year" "enum_lessons_lectionary_year",
      "notes" jsonb,
      "status" "enum_lessons_status" DEFAULT 'draft' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lessons_scriptures_parent_id_fk'
      ) THEN
        ALTER TABLE "lessons_scriptures"
          ADD CONSTRAINT "lessons_scriptures_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lessons_study_questions_parent_id_fk'
      ) THEN
        ALTER TABLE "lessons_study_questions"
          ADD CONSTRAINT "lessons_study_questions_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lessons_quotes_parent_id_fk'
      ) THEN
        ALTER TABLE "lessons_quotes"
          ADD CONSTRAINT "lessons_quotes_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lessons_artworks_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "lessons_artworks"
          ADD CONSTRAINT "lessons_artworks_image_id_media_id_fk"
          FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lessons_artworks_parent_id_fk'
      ) THEN
        ALTER TABLE "lessons_artworks"
          ADD CONSTRAINT "lessons_artworks_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lessons_video_links_parent_id_fk'
      ) THEN
        ALTER TABLE "lessons_video_links"
          ADD CONSTRAINT "lessons_video_links_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lessons_links_parent_id_fk'
      ) THEN
        ALTER TABLE "lessons_links"
          ADD CONSTRAINT "lessons_links_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lessons_id" integer;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_lessons_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_lessons_fk"
          FOREIGN KEY ("lessons_id") REFERENCES "public"."lessons"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "lessons_scriptures_order_idx" ON "lessons_scriptures" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "lessons_scriptures_parent_id_idx" ON "lessons_scriptures" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "lessons_study_questions_order_idx" ON "lessons_study_questions" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "lessons_study_questions_parent_id_idx" ON "lessons_study_questions" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "lessons_quotes_order_idx" ON "lessons_quotes" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "lessons_quotes_parent_id_idx" ON "lessons_quotes" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "lessons_artworks_order_idx" ON "lessons_artworks" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "lessons_artworks_parent_id_idx" ON "lessons_artworks" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "lessons_artworks_image_idx" ON "lessons_artworks" USING btree ("image_id");
    CREATE INDEX IF NOT EXISTS "lessons_video_links_order_idx" ON "lessons_video_links" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "lessons_video_links_parent_id_idx" ON "lessons_video_links" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "lessons_links_order_idx" ON "lessons_links" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "lessons_links_parent_id_idx" ON "lessons_links" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "lessons_slug_idx" ON "lessons" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "lessons_updated_at_idx" ON "lessons" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "lessons_created_at_idx" ON "lessons" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_lessons_id_idx" ON "payload_locked_documents_rels" USING btree ("lessons_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lessons_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_lessons_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lessons_id";

    DROP TABLE IF EXISTS "lessons_scriptures" CASCADE;
    DROP TABLE IF EXISTS "lessons_study_questions" CASCADE;
    DROP TABLE IF EXISTS "lessons_quotes" CASCADE;
    DROP TABLE IF EXISTS "lessons_artworks" CASCADE;
    DROP TABLE IF EXISTS "lessons_video_links" CASCADE;
    DROP TABLE IF EXISTS "lessons_links" CASCADE;
    DROP TABLE IF EXISTS "lessons" CASCADE;

    DROP TABLE IF EXISTS "users_roles" CASCADE;

    ALTER TABLE "media" DROP COLUMN IF EXISTS "artist";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "artist_dates";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "work_date";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "wikimedia_url";

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'media' AND column_name = 'alt_text'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'media' AND column_name = 'alt'
      ) THEN
        ALTER TABLE "media" RENAME COLUMN "alt_text" TO "alt";
      END IF;
    END $$;

    DROP TYPE IF EXISTS "public"."enum_users_roles";
    DROP TYPE IF EXISTS "public"."enum_lessons_liturgical_season";
    DROP TYPE IF EXISTS "public"."enum_lessons_lectionary_year";
    DROP TYPE IF EXISTS "public"."enum_lessons_status";
  `)
}
