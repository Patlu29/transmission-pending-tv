/**
 * The calibration field (design-spec-2050 3.4): the standby and loading graphic, original, no brands. Drawn in a
 * 1600 x 900 unit space. Same call shape as the 1970s `drawTestCard`:
 * `drawStandby(ctx, width, height, { loadingPercent?, subCaption? })`.
 *
 * 16:9 canvases show the whole composition. A 4:3 canvas (the text card, 960 x 720) shows its centre (the rails fall
 * in the margins and are cropped). Portrait and narrow canvases are fitted to the shorter side: the rosette is 0.46 of
 * the width in radius, the ladder runs along the bottom and the rails become two horizontal bands.
 *
 * Needs "Space Grotesk" 600 and "Space Mono" 400 for the caption. Await
 * `document.fonts.load('600 56px "Space Grotesk"')` and `document.fonts.load('28px "Space Mono"')` first.
 */

/** Greys and lights of the screen palette (src/styles/tokens-2050.css --tt-0 to --tt-7). */
export const TT = [
  '#060a14',
  '#162033',
  '#2a3a56',
  '#5a7aa0',
  '#a8c4e4',
  '#cfe3f7',
  '#e6f3ff',
  '#ffffff',
] as const;
const LUMEN = '#8fe3ff';
const LUMEN_BRIGHT = '#bfefff';
const HAZE = '#b9a4ff';

export interface StandbyOptions {
  /** Loading state: caption becomes `TUNING... NN%`. The 40 per cent dimming of the pattern is the material's `uBrightness`. 0 to 100, or null. */
  loadingPercent?: number | null;
  /** Override the sub-caption (default `STAND BY`). Ignored while loadingPercent is set. */
  subCaption?: string;
}

const DISPLAY = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif';
const MONO = '"Space Mono", "Courier New", monospace';

function spacing(ctx: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in ctx)
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Draws the calibration field into a w x h canvas. */
export function drawStandby(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: StandbyOptions = {},
): void {
  const aspect = width / height;
  const portrait = aspect < 1.15;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // Unit scale and the composition centre (800, 450 in units).
  const s = portrait ? width / 900 : Math.min(width / 1600, height / 900);
  const cx = width / 2;
  const cy = portrait ? height * 0.46 : height / 2;
  const X = (ux: number): number => cx + (ux - 800) * s;
  const Y = (uy: number): number => cy + (uy - 450) * s;
  const px = Math.max(s, 1);

  // 1. Field and dot grid across the whole canvas.
  ctx.fillStyle = TT[0];
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = TT[3];
  ctx.globalAlpha = 0.2;
  const step = 50 * s;
  for (let gy = (cy % step) - step; gy < height + step; gy += step) {
    for (let gx = (cx % step) - step; gx < width + step; gx += step) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5 * s + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 2. Interference rosette: two sets of 24 rings, offset 40 units, additive so moire fringes appear.
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = Math.max(1.5 * s, 0.8);
  const rosette = (ox: number, colour: string): void => {
    ctx.strokeStyle = colour;
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 24; i += 1) {
      ctx.beginPath();
      ctx.arc(X(ox), Y(450), (40 + i * 15) * s, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
  rosette(780, LUMEN);
  rosette(820, HAZE);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // 3. Iris: a disc of radius 120 with a conic gradient and a pupil of radius 36.
  const ix = X(800);
  const iy = Y(450);
  const irisR = 120 * s;
  let fill: CanvasGradient;
  if (typeof ctx.createConicGradient === 'function') {
    fill = ctx.createConicGradient(-Math.PI / 2, ix, iy);
    fill.addColorStop(0, LUMEN);
    fill.addColorStop(0.33, HAZE);
    fill.addColorStop(0.66, '#ffb8dc');
    fill.addColorStop(1, LUMEN);
  } else {
    fill = ctx.createRadialGradient(ix, iy, irisR * 0.3, ix, iy, irisR);
    fill.addColorStop(0, HAZE);
    fill.addColorStop(1, LUMEN);
  }
  ctx.save();
  ctx.shadowColor = LUMEN;
  ctx.shadowBlur = 14 * s;
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.arc(ix, iy, irisR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = TT[0];
  ctx.beginPath();
  ctx.arc(ix, iy, 36 * s, 0, Math.PI * 2);
  ctx.fill();

  // 4. Axes with ticks every 100 units.
  ctx.strokeStyle = TT[4];
  ctx.fillStyle = TT[4];
  ctx.lineWidth = px;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, iy);
  ctx.lineTo(width, iy);
  ctx.moveTo(ix, 0);
  ctx.lineTo(ix, height);
  ctx.stroke();
  for (let k = -16; k <= 16; k += 1) {
    ctx.fillRect(X(800 + k * 100) - px / 2, iy - 6 * s, px, 12 * s);
    ctx.fillRect(ix - 6 * s, Y(450 + k * 100) - px / 2, 12 * s, px);
  }
  ctx.globalAlpha = 1;

  // 5. Corner marks: four L-brackets of 60 units at the field corners.
  const left = portrait ? 30 * s : X(0) < 0 ? 0 : X(0);
  const right = portrait ? width - 30 * s : X(1600) > width ? width : X(1600);
  const top = portrait ? 30 * s : Y(0) < 0 ? 0 : Y(0);
  const bottom = portrait ? height - 30 * s : Y(900) > height ? height : Y(900);
  const inset = 28 * s;
  ctx.strokeStyle = LUMEN_BRIGHT;
  ctx.lineWidth = Math.max(3 * s, 1.5);
  const L = 60 * s;
  for (const [x0, y0, sx, sy] of [
    [left + inset, top + inset, 1, 1],
    [right - inset, top + inset, -1, 1],
    [right - inset, bottom - inset, -1, -1],
    [left + inset, bottom - inset, 1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x0 + sx * L, y0);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0, y0 + sy * L);
    ctx.stroke();
  }

  // 6. Luminance ladder: 12 equal steps from ink to white, perceptually even (even steps of the sRGB value).
  const ladX0 = portrait ? width * 0.08 : X(300);
  const ladW = portrait ? width * 0.84 : 1000 * s;
  const ladY = portrait ? height - 150 * s : Y(820);
  const ladH = 48 * s;
  for (let i = 0; i < 12; i += 1) {
    const g = Math.round((i / 11) * 255);
    ctx.fillStyle = i === 0 ? '#060a14' : `rgb(${g},${g},${Math.min(255, g + 4)})`;
    ctx.fillRect(ladX0 + (ladW / 12) * i, ladY, ladW / 12 + 0.5, ladH);
  }

  // 7. Spectrum rails: 20 bars, 6 units wide, heights stepping 5 to 100 per cent. Margins on 16:9, bands on portrait.
  const bar = (x: number, y: number, w: number, h: number, i: number): void => {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, i % 2 ? HAZE : LUMEN);
    g.addColorStop(1, LUMEN);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  ctx.globalAlpha = 0.85;
  if (!portrait) {
    const railH = 700 * s;
    for (const side of [0, 1]) {
      for (let i = 0; i < 20; i += 1) {
        const h = railH * (0.05 + (i / 19) * 0.95);
        const ux = side === 0 ? 40 + i * 8 : 1600 - 40 - 6 - i * 8;
        bar(X(ux), Y(450) + railH / 2 - h, 6 * s, h, i);
      }
    }
  } else {
    const bandH = 60 * s;
    for (const band of [0, 1]) {
      const by = band === 0 ? top + 90 * s : ladY - 90 * s;
      for (let i = 0; i < 20; i += 1) {
        const h = bandH * (0.05 + (i / 19) * 0.95);
        bar(
          width * 0.08 + ((width * 0.84) / 20) * i,
          band === 0 ? by : by + bandH - h,
          Math.max(6 * s, 3),
          h,
          i,
        );
      }
    }
  }
  ctx.globalAlpha = 1;

  // 8 and 9. Caption and sub-caption.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const capY = portrait ? top + 200 * s : Y(150);
  const capSize = Math.min(56 * s, (width * 0.9) / 14);
  ctx.fillStyle = TT[7];
  ctx.font = `600 ${capSize}px ${DISPLAY}`;
  spacing(ctx, capSize * 0.1);
  ctx.fillText('TRANSMISSION PENDING', cx, capY);
  spacing(ctx, 0);
  const loading = options.loadingPercent;
  const sub =
    loading === null || loading === undefined
      ? (options.subCaption ?? 'STAND BY')
      : `TUNING... ${Math.max(0, Math.min(100, Math.round(loading)))}%`;
  ctx.fillStyle = TT[5];
  ctx.font = `400 ${Math.min(28 * s, capSize * 0.5)}px ${MONO}`;
  ctx.fillText(sub, cx, capY + Math.min(28 * s, capSize * 0.5) * 1.8);

  ctx.restore();
}

/** Creates a canvas and draws the field. Browser only. */
export function createStandbyCanvas(
  width = 1280,
  height = 720,
  options: StandbyOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) drawStandby(ctx, width, height, options);
  return canvas;
}
