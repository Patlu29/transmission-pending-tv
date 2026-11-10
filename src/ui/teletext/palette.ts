/** Colours and fonts for the rasteriser, read from tokens.css so no value is hard-coded here. */
export interface Palette {
  bg: string;
  text: string;
  strong: string;
  factBg: string;
  factText: string;
  headerBg: string;
  headerText: string;
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
    tt: Array.from({ length: 8 }, (_, i) => v(`--tt-${i}`)),
    fontTeletext: v('--font-teletext'),
    fontDisplay: v('--font-display'),
  };
  // Cache only once tokens.css has loaded.
  if (palette.bg) cached = palette;
  return palette;
}

export const FONT_LOAD_SPECS = ['16px Bedstead', '600 16px "Barlow Condensed"'];
