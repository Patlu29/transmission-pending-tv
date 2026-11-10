import type { Frame, TapAction } from './frame';
import type { GridSpec } from './grid';

/** Minimum tap height in CSS px (`--target-min`): rows are padded in hit-testing, not in drawing. */
const MIN_TARGET = 44;

/** Finds the action under a point (CSS px, relative to the screen's top-left). */
export function findHit(frame: Frame, grid: GridSpec, x: number, y: number): TapAction | null {
  let best: { action: TapAction; distance: number } | null = null;
  for (const hit of frame.hits) {
    const top = grid.originY + hit.row * grid.rowH;
    const height = hit.rows * grid.rowH;
    const pad = Math.max(0, (MIN_TARGET - height) / 2);
    const left = grid.originX + hit.col * grid.cellW;
    const width = hit.cols * grid.cellW;
    if (x < left || x > left + width || y < top - pad || y > top + height + pad) continue;
    const distance = Math.abs(y - (top + height / 2));
    if (!best || distance < best.distance) best = { action: hit.action, distance };
  }
  return best?.action ?? null;
}
