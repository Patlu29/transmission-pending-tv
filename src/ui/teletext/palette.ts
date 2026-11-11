/**
 * Colours and fonts for the light-field rasteriser, read from the 2050 tokens so no value is
 * hard-coded here. Colour is allowed (2050 theme); Monochrome is a CSS filter on the canvas element,
 * so the canvas is always drawn in colour.
 */
export interface Palette {
  bg: string;
  text: string;
  strong: string;
  factBg: string;
  factText: string;
  headerBg: string;
  headerText: string;
  rule: string;
  /** Lit-chip glass fill for the fastext chips (design-spec-2050 3.5). */
  chip: string;
  /** Accent family: edge lines, underlines, the Occupant's fringe. */
  lumen: string;
  haze: string;
  smear: string;
  glow: string;
  tt: string[];
  fontTeletext: string;
  fontDisplay: string;
}

let cached: Palette | null = null;

export function readPalette(force = false): Palette {
  if (cached && !force) return cached;
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const palette: Palette = {
    bg: v('--screen-bg'),
    text: v('--screen-text'),
    strong: v('--screen-text-strong'),
    factBg: v('--screen-fact-bg'),
    factText: v('--screen-fact-text'),
    headerBg: v('--screen-header-bg'),
    headerText: v('--screen-header-text'),
    rule: v('--screen-rule'),
    chip: v('--glass-chip-fill'),
    lumen: v('--lumen'),
    haze: v('--haze'),
    smear: v('--screen-smear'),
    glow: v('--screen-glow'),
    tt: Array.from({ length: 8 }, (_, i) => v(`--tt-${i}`)),
    fontTeletext: v('--font-teletext'),
    fontDisplay: v('--font-display'),
  };
  // Cache only once the tokens have loaded.
  if (palette.bg) cached = palette;
  return palette;
}

/** Faces to await before the first canvas draw (the monospaced screen face and the display face). */
export const FONT_LOAD_SPECS = [
  '16px "Space Mono"',
  '700 16px "Space Mono"',
  '600 16px "Space Grotesk"',
];
