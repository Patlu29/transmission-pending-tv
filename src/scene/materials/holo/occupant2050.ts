/**
 * The Occupant, 2050 figure (design-spec-2050 4.2). Original: a slice-lit head and shoulders with a seam of light
 * for a face. Procedural, about 0 kB. The shader cuts it into 48 slices; this draws the underlying silhouette.
 *
 * Head: a tall egg, 1.45 times taller than wide, tilted 6 degrees clockwise, narrower at the chin; a darker smooth
 * crown cap, no parting, no ears, no nose, no mouth. Face: two hollow voids (the right a little larger and lower),
 * and a thin vertical seam of light from brow to chin (the brightest tone). Neck: long and narrow with a thin bright
 * ring. Shoulders: narrow, sloping about 22 degrees, a high plain collar line, no lapels, no hands; the body dissolves
 * into noise below the chest.
 *
 * Output: R = G = B = tone (face about 0.85, body 0.6, ring and seam 1.0, voids 0), alpha = coverage. The shader
 * and the 2D layer colour it with `--screen-ghost`. Mode "silhouette" is a soft white shape for the wall decal.
 * Same API as the 1970s `drawOccupant` (this file replaces it for 2050).
 */
export const OCCUPANT_W = 256;
export const OCCUPANT_H = 384;
/** Head centre and radii in sprite pixels (rx 40, ry 58: 1.45 times taller than wide). */
export const OCCUPANT_HEAD = { x: 128, y: 120, rx: 40, ry: 58 } as const;

export interface OccupantOptions {
  mode?: 'sprite' | 'silhouette';
  /** Kept for API compatibility with the 1970s figure; the 2050 figure has no mouth. */
  mouth?: number;
}

function grey(v: number, a = 1): string {
  const g = Math.round(v * 255);
  return `rgba(${g},${g},${g},${a})`;
}

function headPath(ctx: CanvasRenderingContext2D): void {
  const { x, y, rx, ry } = OCCUPANT_HEAD;
  ctx.beginPath();
  for (let i = 0; i <= 72; i += 1) {
    const th = (i / 72) * Math.PI * 2;
    const taper = 1 - 0.2 * Math.max(0, -Math.cos(th));
    const px = Math.sin(th) * rx * taper;
    const py = -Math.cos(th) * ry;
    if (i === 0) ctx.moveTo(x + px, y + py);
    else ctx.lineTo(x + px, y + py);
  }
  ctx.closePath();
}

function bodyPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Long narrow neck, narrow shoulders sloping about 22 degrees, high plain collar line.
  ctx.beginPath();
  ctx.moveTo(114, 160);
  ctx.lineTo(113, 214);
  ctx.bezierCurveTo(96, 220, 70, 228, 48, 252);
  ctx.lineTo(44, h + 4);
  ctx.lineTo(w - 44, h + 4);
  ctx.lineTo(w - 48, 252);
  ctx.bezierCurveTo(w - 70, 228, w - 96, 220, 143, 214);
  ctx.lineTo(142, 160);
  ctx.closePath();
}

/** Draws the Occupant into a w by h context (default 256 by 384). */
export function drawOccupant(
  ctx: CanvasRenderingContext2D,
  w = OCCUPANT_W,
  h = OCCUPANT_H,
  options: OccupantOptions = {},
): void {
  const mode = options.mode ?? 'sprite';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.scale(w / OCCUPANT_W, h / OCCUPANT_H);
  const W = OCCUPANT_W;
  const H = OCCUPANT_H;
  const { x: hx, y: hy, rx, ry } = OCCUPANT_HEAD;
  const tilt = (6 * Math.PI) / 180; // clockwise on screen

  if (mode === 'silhouette') {
    const off = 2000;
    ctx.shadowColor = 'rgba(255,255,255,1)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = -off;
    ctx.fillStyle = '#ffffff';
    ctx.translate(off, 0);
    bodyPath(ctx, W, H);
    ctx.fill();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(tilt);
    ctx.translate(-hx, -hy);
    headPath(ctx);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }

  // Body, then the collar line and neck ring, then the head.
  ctx.fillStyle = grey(0.6);
  bodyPath(ctx, W, H);
  ctx.fill();
  ctx.strokeStyle = grey(0.78);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, 252);
  ctx.bezierCurveTo(70, 228, 96, 220, 113, 214);
  ctx.moveTo(w - 48, 252);
  ctx.bezierCurveTo(w - 70, 228, w - 96, 220, 143, 214);
  ctx.stroke();
  // neck ring: a thin bright ellipse
  ctx.strokeStyle = grey(1);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(128, 196, 20, 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  ctx.translate(-hx, -hy);
  headPath(ctx);
  const face = ctx.createRadialGradient(hx, hy + 10, 6, hx, hy + 10, ry);
  face.addColorStop(0, grey(0.88));
  face.addColorStop(0.7, grey(0.83));
  face.addColorStop(1, grey(0.7));
  ctx.fillStyle = face;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // darker smooth crown cap, no parting
  const cap = ctx.createLinearGradient(0, hy - ry, 0, hy - ry * 0.3);
  cap.addColorStop(0, grey(0.42));
  cap.addColorStop(0.8, grey(0.52));
  cap.addColorStop(1, grey(0.52, 0));
  ctx.fillStyle = cap;
  ctx.fillRect(hx - rx - 4, hy - ry - 2, rx * 2 + 8, ry * 0.7);
  // two hollow voids: tall ellipses, the right a little larger and lower
  const hollow = (ex: number, ey: number, erx: number, ery: number): void => {
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, ery);
    g.addColorStop(0, grey(0, 1));
    g.addColorStop(0.75, grey(0, 1));
    g.addColorStop(1, grey(0, 0));
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(erx / ery, 1);
    ctx.translate(-ex, -ey);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ex, ey, ery, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  hollow(hx - 18, hy + 2, 8, 14);
  hollow(hx + 18, hy + 8, 9, 16);
  // the seam of light: a 2 unit line from brow to chin, the brightest part of the figure
  ctx.fillStyle = grey(1);
  ctx.fillRect(hx - 1, hy - ry * 0.62, 2, ry * 1.62);
  ctx.restore();
  ctx.restore();

  // the body dissolves below the chest
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(0, 290, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Creates a sprite canvas. Browser only. */
export function createOccupantCanvas(
  options: OccupantOptions = {},
  w = OCCUPANT_W,
  h = OCCUPANT_H,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) drawOccupant(ctx, w, h, options);
  return canvas;
}
