import { drawStandby, type StandbyOptions } from '@/scene/materials/standby/drawStandby';
import type { Palette } from './palette';

/**
 * The idle and loading picture (design-spec-2050 3.4, the "calibration field"): the technical-artist's
 * `drawStandby(ctx, w, h, { loadingPercent?, subCaption? })`, same call shape as the old test card.
 * The palette argument is kept for callers; the art reads its own tones.
 */
export type { StandbyOptions };

export function drawStandbyField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _p: Palette,
  o: StandbyOptions,
) {
  drawStandby(ctx, w, h, o);
}
