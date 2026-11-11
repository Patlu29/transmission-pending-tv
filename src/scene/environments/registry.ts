/**
 * Environment registry. Owner: scene-developer (created by the architect as a scaffold).
 * One dynamic import per environment, so Vite emits one chunk each (ADR 0011 §2).
 * Prefetch a chunk on picker hover or focus by calling `entry.load()` early; it is cached.
 *
 * Nothing imports this file yet, so v1's bundle is unchanged until the frontend wires the picker.
 */
import {
  DEFAULT_BUDGET,
  ENVIRONMENT_IDS,
  type EnvironmentEntry,
  type EnvironmentId,
} from './contract.ts';

export const ENVIRONMENTS: Readonly<Record<EnvironmentId, EnvironmentEntry>> = {
  'tv-room': {
    id: 'tv-room',
    label: '1970s TV room',
    budget: DEFAULT_BUDGET,
    load: () => import('./tv-room/index.tsx'),
  },
  cinema: {
    id: 'cinema',
    label: 'Cinema',
    budget: DEFAULT_BUDGET,
    load: () => import('./cinema/index.tsx'),
  },
  'drive-in': {
    id: 'drive-in',
    label: 'Car at the drive-in',
    budget: DEFAULT_BUDGET,
    load: () => import('./drive-in/index.tsx'),
  },
  'open-air': {
    id: 'open-air',
    label: 'Open-air screen',
    budget: DEFAULT_BUDGET,
    load: () => import('./open-air/index.tsx'),
  },
  bedroom: {
    id: 'bedroom',
    label: 'Rainy-night bedroom',
    budget: DEFAULT_BUDGET,
    load: () => import('./bedroom/index.tsx'),
  },
  'chai-stall': {
    id: 'chai-stall',
    label: 'Chai stall',
    budget: DEFAULT_BUDGET,
    load: () => import('./chai-stall/index.tsx'),
  },
  train: {
    id: 'train',
    label: 'Train window seat',
    budget: DEFAULT_BUDGET,
    load: () => import('./train/index.tsx'),
  },
  'space-deck': {
    id: 'space-deck',
    label: 'Space deck',
    budget: DEFAULT_BUDGET,
    load: () => import('./space-deck/index.tsx'),
  },
};

/** Picker order. The TV room (channel 0's home) is first and is the default. */
export const ENVIRONMENT_ORDER: readonly EnvironmentId[] = ENVIRONMENT_IDS;

export const DEFAULT_ENVIRONMENT: EnvironmentId = 'tv-room';
