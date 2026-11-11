import type { Palette } from './palette';

/**
 * The idle and loading picture (design-spec-2050 3.4, "calibration field"): original, no brands.
 *
 * SEAM: the technical-artist's `drawStandby(ctx, w, h, { loadingPercent?, subCaption? })` in
 * src/scene/materials/standby/ is used when it exists (looked up with an eager glob, so the build
 * passes either way). Until then a small built-in field is drawn: ink, a dot grid, two offset ring
 * sets that make a moire, an iris, corner marks and the caption.
 */
export interface StandbyOptions {
  loadingPercent?: number | null;
  subCaption?: string;
}
type StandbyFn = (ctx: CanvasRenderingContext2D, w: number, h: number, o?: StandbyOptions) => void;

const modules = import.meta.glob<Record<string, unknown>>('/src/scene/materials/standby/*.ts', {
  eager: true,
});
const external = Object.values(modules)
  .map((m) => m.drawStandby)
  .find((f): f is StandbyFn => typeof f === 'function');

function fallback(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: Palette,
  o: StandbyOptions,
) {
  const tt = (i: number) => p.tt[i] ?? p.bg;
  ctx.save();
  ctx.fillStyle = tt(0);
  ctx.fillRect(0, 0, w, h);
  const u = Math.min(w / 1600, h / 900);
  ctx.translate((w - 1600 * u) / 2, (h - 900 * u) / 2);
  ctx.scale(u, u);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = tt(3);
  for (let x = 25; x < 1600; x += 50)
    for (let y = 25; y < 900; y += 50) ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  for (const [cx, colour] of [
    [780, p.lumen],
    [820, p.haze],
  ] as const) {
    ctx.strokeStyle = colour;
    for (let r = 40; r <= 385; r += 15) {
      ctx.beginPath();
      ctx.arc(cx, 450, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const iris = ctx.createRadialGradient(800, 450, 36, 800, 450, 120);
  iris.addColorStop(0, tt(0));
  iris.addColorStop(0.3, p.haze);
  iris.addColorStop(1, p.lumen);
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(800, 450, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tt(0);
  ctx.beginPath();
  ctx.arc(800, 450, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.lumen;
  ctx.lineWidth = 3;
  for (const [x, y, dx, dy] of [
    [30, 30, 1, 1],
    [1570, 30, -1, 1],
    [30, 870, 1, -1],
    [1570, 870, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x + dx * 60, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 60);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tt(7);
  ctx.font = `600 56px ${p.fontDisplay}`;
  ctx.fillText('TRANSMISSION PENDING', 800, 150);
  ctx.fillStyle = tt(5);
  ctx.font = `28px ${p.fontTeletext}`;
  const sub =
    o.loadingPercent != null
      ? `TUNING... ${Math.round(o.loadingPercent)}%`
      : (o.subCaption ?? 'STAND BY');
  ctx.fillText(sub, 800, 212);
  ctx.restore();
}

/** Draws the standby field into a w x h region at the origin. */
export function drawStandbyField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: Palette,
  o: StandbyOptions,
) {
  if (external) {
    external(ctx, w, h, o);
    return;
  }
  fallback(ctx, w, h, p, o);
}
