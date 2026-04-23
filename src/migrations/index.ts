import * as migration_20260423_125019_phase_2_collections from './20260423_125019_phase_2_collections';
import * as migration_20260423_144114_schema_media_medium_scripture_richtext from './20260423_144114_schema_media_medium_scripture_richtext';

export const migrations = [
  {
    up: migration_20260423_125019_phase_2_collections.up,
    down: migration_20260423_125019_phase_2_collections.down,
    name: '20260423_125019_phase_2_collections',
  },
  {
    up: migration_20260423_144114_schema_media_medium_scripture_richtext.up,
    down: migration_20260423_144114_schema_media_medium_scripture_richtext.down,
    name: '20260423_144114_schema_media_medium_scripture_richtext'
  },
];
