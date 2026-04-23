import * as migration_20260423_125019_phase_2_collections from './20260423_125019_phase_2_collections';

export const migrations = [
  {
    up: migration_20260423_125019_phase_2_collections.up,
    down: migration_20260423_125019_phase_2_collections.down,
    name: '20260423_125019_phase_2_collections'
  },
];
