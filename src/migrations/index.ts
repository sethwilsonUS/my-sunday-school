import * as migration_20260423_125019_phase_2_collections from './20260423_125019_phase_2_collections';
import * as migration_20260423_144114_schema_media_medium_scripture_richtext from './20260423_144114_schema_media_medium_scripture_richtext';
import * as migration_20260423_184715_add_collect_to_lessons from './20260423_184715_add_collect_to_lessons';
import * as migration_20260423_190440_add_musings_and_quote_year from './20260423_190440_add_musings_and_quote_year';
import * as migration_20260427_071517_musings_as_authored_entries from './20260427_071517_musings_as_authored_entries';

export const migrations = [
  {
    up: migration_20260423_125019_phase_2_collections.up,
    down: migration_20260423_125019_phase_2_collections.down,
    name: '20260423_125019_phase_2_collections',
  },
  {
    up: migration_20260423_144114_schema_media_medium_scripture_richtext.up,
    down: migration_20260423_144114_schema_media_medium_scripture_richtext.down,
    name: '20260423_144114_schema_media_medium_scripture_richtext',
  },
  {
    up: migration_20260423_184715_add_collect_to_lessons.up,
    down: migration_20260423_184715_add_collect_to_lessons.down,
    name: '20260423_184715_add_collect_to_lessons',
  },
  {
    up: migration_20260423_190440_add_musings_and_quote_year.up,
    down: migration_20260423_190440_add_musings_and_quote_year.down,
    name: '20260423_190440_add_musings_and_quote_year',
  },
  {
    up: migration_20260427_071517_musings_as_authored_entries.up,
    down: migration_20260427_071517_musings_as_authored_entries.down,
    name: '20260427_071517_musings_as_authored_entries',
  },
];
