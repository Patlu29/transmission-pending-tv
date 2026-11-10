/**
 * Teletext grid maths (design-spec 5.1 and 5.2). Pure; no DOM except the
 * optional token read.
 */
export interface GridTokens {
  minFontPx: number;
  maxFontPx: number;
  cellAspect: number;
  rowPitch: number;
  safeArea: number;
  minRows: number;
  colsWide: number;
  colsMedium: number;
  colsNarrow: number;
  colsTiny: number;
}

export const DEFAULT_GRID_TOKENS: GridTokens = {
  minFontPx: 16,
  maxFontPx: 40,
  cellAspect: 0.6,
  rowPitch: 1.1,
  safeArea: 0.92,
  minRows: 12,
  colsWide: 40,
  colsMedium: 32,
  colsNarrow: 26,
  colsTiny: 20,
};

let cachedTokens: GridTokens | null = null;

/** Reads the grid tokens from tokens.css once (falls back to the documented defaults). */
export function readGridTokens(): GridTokens {
  if (cachedTokens) return cachedTokens;
  // Structural typing keeps this module free of DOM types so unit tests can import it under Node.
  const g = globalThis as unknown as {
    document?: { documentElement: unknown };
    getComputedStyle?: (el: unknown) => { getPropertyValue(name: string): string };
  };
  if (!g.document || !g.getComputedStyle) return DEFAULT_GRID_TOKENS;
  const cs = g.getComputedStyle(g.document.documentElement);
  const num = (name: string, fallback: number) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  if (cs.getPropertyValue('--tt-cell-aspect').trim() === '') return DEFAULT_GRID_TOKENS;
  const d = DEFAULT_GRID_TOKENS;
  cachedTokens = {
    minFontPx: num('--tt-min-font-px', d.minFontPx),
    maxFontPx: d.maxFontPx,
    cellAspect: num('--tt-cell-aspect', d.cellAspect),
    rowPitch: num('--tt-row-pitch', d.rowPitch),
    safeArea: num('--tt-safe-area', d.safeArea),
    minRows: d.minRows,
    colsWide: num('--tt-cols-wide', d.colsWide),
    colsMedium: num('--tt-cols-medium', d.colsMedium),
    colsNarrow: num('--tt-cols-narrow', d.colsNarrow),
    colsTiny: num('--tt-cols-tiny', d.colsTiny),
  };
  return cachedTokens;
}

export interface GridSpec {
  cols: number;
  rows: number;
  /** Font size in on-screen CSS px. */
  fontPx: number;
  cellW: number;
  rowH: number;
  /** Top-left of the grid inside the screen, in on-screen CSS px. */
  originX: number;
  originY: number;
  /** On-screen size the grid was computed for. */
  cssW: number;
  cssH: number;
  /** Safe width under 192 px: the plain version should be offered. */
  tooSmall: boolean;
}

/** Rows reserved: header, title, fastext. */
export const RESERVED_ROWS = 3;

export function contentRows(grid: Pick<GridSpec, 'rows'>): number {
  return Math.max(1, grid.rows - RESERVED_ROWS);
}

export function computeGrid(
  cssW: number,
  cssH: number,
  t: GridTokens = readGridTokens(),
): GridSpec {
  const safeW = Math.floor(cssW * t.safeArea);
  const safeH = cssH * t.safeArea;
  const tooSmall = safeW < 192;
  const cols =
    safeW >= 384
      ? t.colsWide
      : safeW >= 320
        ? t.colsMedium
        : safeW >= 250
          ? t.colsNarrow
          : t.colsTiny;
  let fontPx = Math.min(safeW / (cols * t.cellAspect), t.maxFontPx);
  fontPx = Math.min(fontPx, safeH / (t.minRows * t.rowPitch));
  fontPx = Math.max(fontPx, 4);
  const cellW = fontPx * t.cellAspect;
  const rowH = fontPx * t.rowPitch;
  const rows = Math.max(6, Math.floor(safeH / rowH));
  return {
    cols,
    rows,
    fontPx,
    cellW,
    rowH,
    originX: (cssW - cols * cellW) / 2,
    originY: (cssH - rows * rowH) / 2,
    cssW,
    cssH,
    tooSmall,
  };
}
