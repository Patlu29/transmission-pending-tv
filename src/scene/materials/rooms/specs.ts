/** Screen specs and palettes for the nine rooms. Owner: technical-artist. The scene-developer reads `*_SCREEN` for the contract. */
import type { RoomScreenSpec } from './roomKit.ts';

export const BEDROOM_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 1.2,
  fill: 0.6,
  align: 'centre',
  vAlign: 'centre',
};

export const BEDROOM_PALETTE = {
  wall: '#3a3f5c',
  lamp: '#ffb86b',
  blanket: '#6a5a7a',
  rainLight: '#5a7a9a',
  bokeh: '#e8a860',
  wood: '#33241a',
  surround: '#0a0a0a',
  mug: '#c9a24a',
} as const;

export const DRIVE_IN_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 14,
  fill: 0.66,
  align: 'centre',
  vAlign: 'upper',
};

export const DRIVE_IN_PALETTE = {
  sky: '#0b1226',
  tower: '#2a2f3a',
  dash: '#14161a',
  dial: '#ffb347',
  tailLight: '#b02a2a',
  lot: '#1a1c22',
  snackBar: '#e8c26a',
} as const;

export const CHAI_STALL_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 0.7,
  fill: 0.58,
  align: 'centre',
  vAlign: 'centre',
};

export const CHAI_STALL_PALETTE = {
  wood: '#2f5f7a',
  tin: '#6b5a4a',
  brick: '#8a4b3a',
  bulb: '#ffcf70',
  steel: '#b8bcc2',
  glass: '#c7a15a',
  clothes: ['#c28b2c', '#e8e6df', '#7a2630', '#4a5fa8'],
  night: '#0c1020',
} as const;

export const CINEMA_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 6,
  fill: 0.72,
  align: 'centre',
  vAlign: 'centre',
};

export const CINEMA_PALETTE = {
  seats: '#6e1f2b',
  walls: '#1c1418',
  gold: '#b08d4a',
  carpet: '#241a1d',
  curtain: '#4a1620',
  aisle: '#ffcf80',
  exit: '#3ca35c',
} as const;

export const SPACE_DECK_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 3,
  fill: 0.64,
  align: 'centre',
  vAlign: 'centre',
};

export const SPACE_DECK_PALETTE = {
  hull: '#c9ced6',
  panel: '#2a2f3a',
  ocean: '#2f6fb5',
  cloud: '#e8eef7',
  sunrise: '#ffb15e',
  accent: '#3fe0c0',
  rail: '#8a929c',
} as const;

export const TRAIN_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 0.45,
  fill: 0.6,
  align: 'centre',
  vAlign: 'centre',
};

export const TRAIN_PALETTE = {
  seat: '#2d4a7a',
  laminate: '#cfc3a5',
  steel: '#9aa3a8',
  skyHorizon: '#e9a05a',
  skyTop: '#2b3a6b',
  hills: '#2a2f4a',
  poles: '#14141a',
  curtain: '#7a2630',
} as const;

export const OPEN_AIR_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 8,
  fill: 0.7,
  align: 'centre',
  vAlign: 'centre',
};

export const OPEN_AIR_PALETTE = {
  sky: '#101830',
  horizon: '#3a2b4a',
  grass: '#20301f',
  stringLights: '#ffd9a0',
  beanbags: ['#b24a3a', '#2a4a63', '#c9a24a'],
  truss: '#0a0a0a',
  moon: '#e9ecf2',
} as const;

export const MOUNTAIN_SKY_SCREEN: RoomScreenSpec = {
  aspect: 16 / 9,
  widthM: 12,
  fill: 0.72,
  align: 'centre',
  vAlign: 'upper',
};

/** Palette (design-spec-v2 5.9), sRGB hex. */
export const MOUNTAIN_SKY_PALETTE = {
  zenith: '#0b1030',
  midSky: '#3a2f6b',
  horizon: '#e0845a',
  horizonPale: '#f2c9a8',
  cloudTop: '#f2c9a8',
  cloudShadow: '#5a4a7a',
  farRidge: '#2b2a52',
  midRidge: '#1c1c3a',
  nearRidge: '#101022',
  aurora1: '#3fe0a0',
  aurora2: '#8a5ae0',
  frame: '#0a0a12',
  hairline: '#cfd8ff',
} as const;
