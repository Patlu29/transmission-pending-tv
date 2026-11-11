/**
 * Layout of the Lumen pane (design-spec-2050 3.1), in metres. Origin: the centre of the player rect (the `screen`
 * node), +z towards the viewer, +y up. The glass front is at z = 0; the pane is 9 mm thick behind it; the puck sits
 * below and a little behind. The field names `cabinet`, `shelfY` and `originOffsetX` mirror the 1970s `TV_LAYOUT`, so
 * camera framing code only changes the import.
 */
const PANE_W = 1.2;
const PANE_H = (PANE_W * 9) / 16; // 0.675
const BORDER = 0.006;
const GLASS_W = PANE_W - 2 * BORDER;
const GLASS_H = PANE_H - 2 * BORDER;
const INSET = 0.015; // the player rect is the glass inset by 1.5 per cent on every side
const RECT_W = GLASS_W * (1 - 2 * INSET);
const RECT_H = GLASS_H * (1 - 2 * INSET);
const HOVER = 0.04;
const PUCK_H = 0.1;
const PUCK_TOP = -PANE_H / 2 - HOVER;

export const HOLO_LAYOUT = {
  /** The whole device, so framing maths written for the TV keeps working. */
  cabinet: { width: PANE_W, height: PANE_H, depth: 0.3 },
  pane: { width: PANE_W, height: PANE_H, thickness: 0.009, border: BORDER, radius: 0.02 },
  glass: { width: GLASS_W, height: GLASS_H },
  /** The anchor and the `screen` node: this is the player rect. Use `HOLO_LAYOUT.screen.width` as `widthM`. */
  screen: { width: RECT_W, height: RECT_H, aspect: 16 / 9, cornerRadius: 0.006 },
  puck: { width: 0.45, depth: 0.3, height: PUCK_H, cz: -0.06, topY: PUCK_TOP },
  /** Y of the floor under the puck (the "shelf" in the 1970s layout). */
  shelfY: PUCK_TOP - PUCK_H,
  originOffsetX: 0,
  /** Rings and dimple lie flat on the puck's top face; their local z axis points up. */
  rings: {
    channel: { radius: 0.125, width: 0.02 },
    volume: { radius: 0.078, width: 0.016 },
    power: { radius: 0.028 },
  },
} as const;

/** Colours (match src/styles/tokens-2050.css --tv-*). */
export const HOLO_COLOURS = {
  ceramic: '#e8eaf0',
  satin: '#c9d3e4',
  graphite: '#1a2030',
  graphiteMid: '#2a3446',
  slit: '#0a0f1a',
  smoked: '#070b16',
  lumen: '#8fe3ff',
  lumenBright: '#bfefff',
  wall: '#0e1524',
  wallBacklight: '#17304a',
  floor: '#0a0f1a',
} as const;
