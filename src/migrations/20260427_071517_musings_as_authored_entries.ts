import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "lessons_musings" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "body" varchar NOT NULL,
      "author" varchar NOT NULL
    );

    INSERT INTO "lessons_musings" ("_order", "_parent_id", "id", "title", "body", "author")
    SELECT 0, "id", concat('legacy-musing-', "id"), 'Musing', "musings", 'Seth Wilson'
    FROM "lessons"
    WHERE "musings" IS NOT NULL AND btrim("musings") <> '';

    ALTER TABLE "lessons_musings" ADD CONSTRAINT "lessons_musings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "lessons_musings_order_idx" ON "lessons_musings" USING btree ("_order");
    CREATE INDEX "lessons_musings_parent_id_idx" ON "lessons_musings" USING btree ("_parent_id");
    ALTER TABLE "lessons" DROP COLUMN "musings";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "lessons" ADD COLUMN "musings" varchar;

    UPDATE "lessons"
    SET "musings" = first_musing."body"
    FROM (
      SELECT DISTINCT ON ("_parent_id") "_parent_id", "body"
      FROM "lessons_musings"
      ORDER BY "_parent_id", "_order"
    ) AS first_musing
    WHERE "lessons"."id" = first_musing."_parent_id";

    DROP TABLE "lessons_musings" CASCADE;
  `)
}
