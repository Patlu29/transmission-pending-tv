import type { GridSpec } from './grid';

/**
 * Glyph size for the grid (design-spec 14, design-spec-2050 section 2). The screen face is Space Mono
 * (advance about 0.612 em, close to the 0.612 cell aspect), but the draw size is still derived from
 * the measured advance, not assumed, so any monospaced face works:
 *   advance = measureText('M').width / refPx
 *   drawPx  = cellWidth / advance, capped at rowPitch / 0.9, glyph centred in its cell.
 * The grid geometry (columns, cell width, row pitch) is unchanged.
 */
const REF_PX = 100;
const cache = new Map<string, number>();
let scratch: CanvasRenderingContext2D | null = null;

/** Measured advance of the teletext face in em (cached per family). */
export function measureAdvance(family: string): number {
  const hit = cache.get(family);
  if (hit) return hit;
  if (!scratch) scratch = document.createElement('canvas').getContext('2d');
  let advance = 0.612; // Space Mono's advance, used until the face has loaded
  if (scratch) {
    scratch.font = `${REF_PX}px ${family}`;
    const w = scratch.measureText('M').width / REF_PX;
    if (Number.isFinite(w) && w > 0.1) advance = w;
  }
  cache.set(family, advance);
  return advance;
}

/** Call when fonts finish loading so the next draw measures the real face. */
export function resetFontMetrics(): void {
  cache.clear();
}

export interface GlyphMetrics {
  advance: number;
  drawPx: number;
  /** Extra horizontal space per glyph so DOM text lines up with the cell grid. */
  letterSpacingPx: number;
}

export function glyphMetrics(grid: GridSpec, family: string): GlyphMetrics {
  const advance = measureAdvance(family);
  const drawPx = Math.min(grid.cellW / advance, grid.rowH / 0.9);
  return { advance, drawPx, letterSpacingPx: grid.cellW - advance * drawPx };
}
