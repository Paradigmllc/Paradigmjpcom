import * as migration_20260520_094907_paradigm_initial from './20260520_094907_paradigm_initial';

export const migrations = [
  {
    up: migration_20260520_094907_paradigm_initial.up,
    down: migration_20260520_094907_paradigm_initial.down,
    name: '20260520_094907_paradigm_initial'
  },
];
