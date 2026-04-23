import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "medium" varchar;

    DO $$
    DECLARE
      passage_text_type text;
    BEGIN
      SELECT data_type
      INTO passage_text_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lessons_scriptures'
        AND column_name = 'passage_text';

      IF passage_text_type IS NULL THEN
        ALTER TABLE "lessons_scriptures" ADD COLUMN "passage_text" jsonb;
      ELSIF passage_text_type <> 'jsonb' THEN
        ALTER TABLE "lessons_scriptures" ADD COLUMN IF NOT EXISTS "passage_text_lexical" jsonb;

        UPDATE "lessons_scriptures"
        SET "passage_text_lexical" = CASE
          WHEN "passage_text" IS NULL OR btrim("passage_text"::text) = '' THEN NULL
          ELSE jsonb_build_object(
            'root',
            jsonb_build_object(
              'type',
              'root',
              'children',
              jsonb_build_array(
                jsonb_build_object(
                  'type',
                  'paragraph',
                  'children',
                  jsonb_build_array(
                    jsonb_build_object(
                      'type',
                      'text',
                      'text',
                      "passage_text"::text,
                      'version',
                      1,
                      'detail',
                      0,
                      'format',
                      0,
                      'mode',
                      'normal',
                      'style',
                      ''
                    )
                  ),
                  'direction',
                  'ltr',
                  'format',
                  '',
                  'indent',
                  0,
                  'version',
                  1,
                  'textFormat',
                  0,
                  'textStyle',
                  ''
                )
              ),
              'direction',
              'ltr',
              'format',
              '',
              'indent',
              0,
              'version',
              1
            )
          )
        END;

        ALTER TABLE "lessons_scriptures" DROP COLUMN "passage_text";
        ALTER TABLE "lessons_scriptures" RENAME COLUMN "passage_text_lexical" TO "passage_text";
      END IF;
    END $$;
  `)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      passage_text_type text;
    BEGIN
      SELECT data_type
      INTO passage_text_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lessons_scriptures'
        AND column_name = 'passage_text';

      IF passage_text_type = 'jsonb' THEN
        ALTER TABLE "lessons_scriptures" ADD COLUMN IF NOT EXISTS "passage_text_plain" varchar;

        UPDATE "lessons_scriptures" scripture
        SET "passage_text_plain" = NULLIF(
          (
            SELECT string_agg(text_node.value, E'\n')
            FROM jsonb_array_elements_text(
              jsonb_path_query_array(scripture."passage_text", '$.root.children.**.text')
            ) AS text_node(value)
          ),
          ''
        );

        ALTER TABLE "lessons_scriptures" DROP COLUMN "passage_text";
        ALTER TABLE "lessons_scriptures" RENAME COLUMN "passage_text_plain" TO "passage_text";
      END IF;
    END $$;

    ALTER TABLE "media" DROP COLUMN IF EXISTS "medium";
  `)
}
