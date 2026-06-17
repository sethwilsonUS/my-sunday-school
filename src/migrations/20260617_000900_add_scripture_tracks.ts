import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_lessons_scriptures_track" AS ENUM('none', 'track-1', 'track-2');
  ALTER TABLE "lessons_scriptures" ADD COLUMN "track" "enum_lessons_scriptures_track" DEFAULT 'none';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "lessons_scriptures" DROP COLUMN "track";
  DROP TYPE "public"."enum_lessons_scriptures_track";`)
}
