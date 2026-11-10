/**
 * The Occupant: an original pale head-and-shoulders bust (design-spec 16.5). Procedural, about 0 kB.
 *
 * Head: a tall egg (1.4 times taller than wide) tilted 5 degrees, narrower at the chin, with a darker crown cap and
 * a centre parting. No ears, no nose. Two dark hollow eyes (left larger and lower). Long narrow neck, wide
 * sloping shoulders, two wide pointed 1970s lapel collars meeting low on the chest. The body dissolves below the
 * chest; there are no hands.
 *
 * Output: greyscale. Mode "sprite": R = G = B = tone (face about 0.85, body 0.6, hollows 0), alpha = coverage.
 * Mode "silhouette": solid white with a soft edge, for the wall decal.
 * Tone values are stored directly (not as sRGB light), the shader scales them.
 */
export const OCCUPANT_W = 256;
export const OCCUPANT_H = 384;
/** Head centre in sprite pixels (for placement maths shared with the shader). */
export const OCCUPANT_HEAD = { x: 128, y: 120, rx: 44, ry: 62 } as const;

export interface OccupantOptions {
  mode?: 'sprite' | 'silhouette';
  /** 0..1 draws the thin mouth slit (only for the 2D layer when the figure is near). Default 0. */
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
    const taper = 1 - 0.18 * Math.max(0, -Math.cos(th)); // narrower at the chin
    const px = Math.sin(th) * rx * taper;
    const py = -Math.cos(th) * ry;
    if (i === 0) ctx.moveTo(x + px, y + py);
    else ctx.lineTo(x + px, y + py);
  }
  ctx.closePath();
}

function bodyPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Neck from the chin, then shoulders dropping about 18 degrees each side, open at the bottom.
  ctx.beginPath();
  ctx.moveTo(106, 168);
  ctx.lineTo(106, 205);
  ctx.bezierCurveTo(80, 212, 50, 232, 26, 268);
  ctx.lineTo(26, h + 4);
  ctx.lineTo(w - 26, h + 4);
  ctx.lineTo(w - 26, 268);
  ctx.bezierCurveTo(w - 50, 232, w - 80, 212, 150, 205);
  ctx.lineTo(150, 168);
  ctx.closePath();
}

function lapel(ctx: CanvasRenderingContext2D, mirror: boolean): void {
  const m = (x: number): number => (mirror ? OCCUPANT_W - x : x);
  ctx.beginPath();
  ctx.moveTo(m(104), 206);
  ctx.lineTo(m(44), 282);
  ctx.lineTo(m(92), 284);
  ctx.lineTo(m(128), 318);
  ctx.lineTo(m(122), 252);
  ctx.closePath();
}

/** Draws the Occupant into a w by h context (default 256 by 384). It scales from the 256 by 384 design. */
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

  if (mode === 'silhouette') {
    // Soft edge by drawing the shape off canvas and casting its blurred shadow back in.
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
    ctx.rotate((-5 * Math.PI) / 180);
    ctx.translate(-hx, -hy);
    headPath(ctx);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }

  // Body, paler collars, then the head.
  ctx.fillStyle = grey(0.6);
  bodyPath(ctx, W, H);
  ctx.fill();
  for (const mirror of [false, true]) {
    ctx.fillStyle = grey(0.72);
    lapel(ctx, mirror);
    ctx.fill();
    ctx.strokeStyle = grey(0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Dark V of the chest between the lapels.
  ctx.fillStyle = grey(0.28);
  ctx.beginPath();
  ctx.moveTo(122, 206);
  ctx.lineTo(128, 318);
  ctx.lineTo(134, 206);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate((-5 * Math.PI) / 180);
  ctx.translate(-hx, -hy);
  headPath(ctx);
  const face = ctx.createRadialGradient(hx, hy + 8, 6, hx, hy + 8, ry);
  face.addColorStop(0, grey(0.88));
  face.addColorStop(0.7, grey(0.82));
  face.addColorStop(1, grey(0.7));
  ctx.fillStyle = face;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Darker crown cap with a centre parting.
  const cap = ctx.createLinearGradient(0, hy - ry, 0, hy - ry * 0.35);
  cap.addColorStop(0, grey(0.4));
  cap.addColorStop(0.8, grey(0.5));
  cap.addColorStop(1, grey(0.5, 0));
  ctx.fillStyle = cap;
  ctx.fillRect(hx - rx - 4, hy - ry - 2, rx * 2 + 8, ry * 0.7);
  ctx.strokeStyle = grey(0.25);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx, hy - ry);
  ctx.lineTo(hx + 1, hy - ry * 0.55);
  ctx.stroke();
  // Hollow eyes: the darkest tone in the sprite (zero), left larger and lower.
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
  hollow(hx - 21, hy + 6, 10, 17);
  hollow(hx + 21, hy, 8.5, 14);
  // Mouth slit, only when asked (the shader draws its own from near 0.8).
  const mouth = options.mouth ?? 0;
  if (mouth > 0) {
    ctx.fillStyle = grey(0, mouth);
    ctx.fillRect(hx - 11, hy + ry - 41 - 1.5, 22, 3);
  }
  ctx.restore();
  // Rim light.
  headPath(ctx);
  ctx.strokeStyle = grey(1, 0.7);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // The body dissolves below the chest: fade the alpha from y 290 to the bottom.
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
