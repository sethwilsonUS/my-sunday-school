import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "lessons" ADD COLUMN "source_lectionary_url" varchar;
  CREATE INDEX "lessons_source_lectionary_url_idx" ON "lessons" USING btree ("source_lectionary_url");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "lessons_source_lectionary_url_idx";
  ALTER TABLE "lessons" DROP COLUMN "source_lectionary_url";`)
}
