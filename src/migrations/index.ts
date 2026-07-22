import * as migration_20260423_125019_phase_2_collections from './20260423_125019_phase_2_collections'
import * as migration_20260423_144114_schema_media_medium_scripture_richtext from './20260423_144114_schema_media_medium_scripture_richtext'
import * as migration_20260423_184715_add_collect_to_lessons from './20260423_184715_add_collect_to_lessons'
import * as migration_20260423_190440_add_musings_and_quote_year from './20260423_190440_add_musings_and_quote_year'
import * as migration_20260427_071517_musings_as_authored_entries from './20260427_071517_musings_as_authored_entries'
import * as migration_20260427_142353_add_media_image_sizes from './20260427_142353_add_media_image_sizes'
import * as migration_20260507_000900_add_source_lectionary_url from './20260507_000900_add_source_lectionary_url'
import * as migration_20260529_000900_add_observance_type_to_lessons from './20260529_000900_add_observance_type_to_lessons'
import * as migration_20260617_000900_add_scripture_tracks from './20260617_000900_add_scripture_tracks'
import * as migration_20260629_000900_add_media_title_theme from './20260629_000900_add_media_title_theme'
import * as migration_20260722_014930_add_mcp_api_keys from './20260722_014930_add_mcp_api_keys'

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
  {
    up: migration_20260427_142353_add_media_image_sizes.up,
    down: migration_20260427_142353_add_media_image_sizes.down,
    name: '20260427_142353_add_media_image_sizes',
  },
  {
    up: migration_20260507_000900_add_source_lectionary_url.up,
    down: migration_20260507_000900_add_source_lectionary_url.down,
    name: '20260507_000900_add_source_lectionary_url',
  },
  {
    up: migration_20260529_000900_add_observance_type_to_lessons.up,
    down: migration_20260529_000900_add_observance_type_to_lessons.down,
    name: '20260529_000900_add_observance_type_to_lessons',
  },
  {
    up: migration_20260617_000900_add_scripture_tracks.up,
    down: migration_20260617_000900_add_scripture_tracks.down,
    name: '20260617_000900_add_scripture_tracks',
  },
  {
    up: migration_20260629_000900_add_media_title_theme.up,
    down: migration_20260629_000900_add_media_title_theme.down,
    name: '20260629_000900_add_media_title_theme',
  },
  {
    up: migration_20260722_014930_add_mcp_api_keys.up,
    down: migration_20260722_014930_add_mcp_api_keys.down,
    name: '20260722_014930_add_mcp_api_keys',
  },
]
