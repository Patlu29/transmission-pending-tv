/**
 * Layout of the TV body, in "cabinet widths" (cabinet width = 1.0). Design-spec section 10.
 * Origin: the centre of the screen glass. +z faces the viewer, +y is up. The glass edge is at z = 0,
 * the cabinet runs back to z = -0.72, and the dome centre is at z = +0.035.
 * Scale the whole TvBody group to taste (for example 0.5 for a half-metre set).
 */
const CABINET_W = 1.0;
const CABINET_H = 0.78;
const SCREEN_W = 0.58;
const SCREEN_H = SCREEN_W * 0.75; // 4:3
const BEZEL = 0.045;
const LEG_H = 0.09;
/** Screen centre in cabinet-local coordinates (left of the cabinet centre). */
const SCREEN_CX = -0.135;

export const TV_LAYOUT = {
  cabinet: {
    width: CABINET_W,
    height: CABINET_H,
    depth: 0.72,
    rearWidth: 0.62,
    rearHeight: 0.5,
    radius: 0.04,
  },
  screen: {
    width: SCREEN_W,
    height: SCREEN_H,
    aspect: 4 / 3,
    cornerRadius: 0.06 * SCREEN_W,
    bulge: 0.035,
  },
  bezel: { width: BEZEL },
  legs: { height: LEG_H, splayDegrees: 6 },
  /** Y of the shelf surface under the feet, in model coordinates. Put the shelf top here. */
  shelfY: -CABINET_H / 2 - LEG_H,
  /** Offset applied to the whole model so the screen centre is the origin. */
  originOffsetX: -SCREEN_CX,
  /** Control plate, cabinet-local (before the origin offset). */
  plate: { cx: 0.36, cy: 0, width: 0.26, height: 0.66 },
  knobs: {
    channel: { x: 0.295, y: 0.215, radius: 0.05, height: 0.045 },
    volume: { x: 0.425, y: 0.215, radius: 0.05, height: 0.045 },
    power: { x: 0.44, y: -0.275, radius: 0.03, height: 0.035 },
  },
  grille: { x: 0.36, y: -0.0725, width: 0.21, height: 0.285 },
  /** Z of the knob bases (plate front plus base plate). */
  knobZ: 0.016,
  screenCx: SCREEN_CX,
} as const;

/** Greys (match src/styles/tokens.css --tv-*). */
export const TV_GREYS = {
  woodDark: '#262626',
  woodMid: '#4a4a4a',
  woodLight: '#6b6b6b',
  bezel: '#141414',
  trim: '#a8a8a8',
  knob: '#cfcfcf',
  knobMark: '#0a0a0a',
  grille: '#0a0a0a',
  glassTint: '#0c0c0c',
} as const;
