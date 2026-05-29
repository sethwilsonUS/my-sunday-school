import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_lessons_observance_type" AS ENUM('sunday', 'holy-day', 'commemoration', 'other');
  ALTER TABLE "lessons" ADD COLUMN "observance_type" "enum_lessons_observance_type" DEFAULT 'sunday' NOT NULL;
  CREATE INDEX "lessons_observance_type_idx" ON "lessons" USING btree ("observance_type");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "lessons_observance_type_idx";
  ALTER TABLE "lessons" DROP COLUMN "observance_type";
  DROP TYPE "public"."enum_lessons_observance_type";`)
}
