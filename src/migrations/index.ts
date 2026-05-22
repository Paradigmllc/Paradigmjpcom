import * as migration_20260520_094907_paradigm_initial from './20260520_094907_paradigm_initial';
import * as migration_20260522_023308_add_missing_tables from './20260522_023308_add_missing_tables';

export const migrations = [
  {
    up: migration_20260520_094907_paradigm_initial.up,
    down: migration_20260520_094907_paradigm_initial.down,
    name: '20260520_094907_paradigm_initial',
  },
  {
    up: migration_20260522_023308_add_missing_tables.up,
    down: migration_20260522_023308_add_missing_tables.down,
    name: '20260522_023308_add_missing_tables'
  },
];
