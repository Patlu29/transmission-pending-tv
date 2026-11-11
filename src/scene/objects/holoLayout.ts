/**
 * Layout of the Lumen pane and its puck, in metres. Origin: the centre of the glass; +z towards the viewer,
 * the glass front is at z = 0 (design-spec-2050 3.1).
 *
 * PLACEHOLDER: these are the scene-developer's stand-ins for the technical-artist's `HOLO_LAYOUT` (the pane,
 * puck and rings of `HoloDisplay`). When that lands, re-export its layout from here; everything in the scene
 * (framing, anchor, creep bounds) reads this file only.
 */
const PANE_W = 1.2;
const PANE_H = (PANE_W * 9) / 16;
const HOVER = 0.04; // the pane hovers 4 cm above the puck
const PUCK_H = 0.1;
const PANE_BOTTOM = -PANE_H / 2;
const PUCK_TOP = PANE_BOTTOM - HOVER;
const FLOOR_Y = PUCK_TOP - PUCK_H;

export const HOLO_LAYOUT = {
  pane: { width: PANE_W, height: PANE_H, thickness: 0.009, border: 0.006 },
  /** The player rect is the glass inset by 1.5 per cent on every side (design-spec-2050 3.2). */
  playerInset: 0.015,
  puck: { width: 0.45, depth: 0.3, height: PUCK_H, topY: PUCK_TOP, z: 0.02 },
  floorY: FLOOR_Y,
  /** The whole device (pane plus puck): the box the watch pose frames and centres. */
  device: {
    width: PANE_W,
    height: PANE_H / 2 - FLOOR_Y,
    cx: 0,
    cy: (PANE_H / 2 + FLOOR_Y) / 2,
  },
  /** Control plate on the puck, tilted towards the viewer so the rings read from the watch pose. */
  plate: { y: PUCK_TOP + 0.002, z: 0.05, tilt: 0.9, radius: 0.16 },
  rings: { channel: 0.12, volume: 0.07, tube: 0.006 },
} as const;

/** Width of the anchor and player rect: the glass inset on both sides. */
export const HOLO_ANCHOR_WIDTH = PANE_W * (1 - 2 * 0.015);
