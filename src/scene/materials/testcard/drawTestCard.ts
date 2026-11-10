/**
 * Original test card (design-spec section 11), drawn procedurally into any 2D canvas context.
 * Greyscale only. No broadcaster logo, name, clock, face, mascot or characteristic layout.
 *
 * Needs the fonts "Barlow Condensed" 600 and "Bedstead" loaded for the caption. Await
 * `document.fonts.load('600 32px "Barlow Condensed"')` and `document.fonts.load('22px Bedstead')` first.
 */

/** Greys of the teletext palette (src/styles/tokens.css --tt-0 to --tt-7). */
export const TT = [
  '#000000',
  '#3a3a3a',
  '#5c5c5c',
  '#8c8c8c',
  '#a8a8a8',
  '#cfcfcf',
  '#e8e8e8',
  '#ffffff',
] as const;

export interface TestCardOptions {
  /** Loading state: shows `TUNING... NN%` instead of `STAND BY`. 0 to 100, or null for none. */
  loadingPercent?: number | null;
  /** Override the sub-caption text (default `STAND BY`). Ignored while loadingPercent is set. */
  subCaption?: string;
}

const DISPLAY_FONT = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const TELETEXT_FONT = 'Bedstead, "Courier New", monospace';

interface Layout {
  /** Pixels per composition unit. */
  u: number;
  /** Composition rectangle (the 1000 x 750 card, scaled) inside the canvas. */
  x: number;
  y: number;
  w: number;
  h: number;
  portrait: boolean;
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in ctx)
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function rect(
  ctx: CanvasRenderingContext2D,
  fill: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function line(
  ctx: CanvasRenderingContext2D,
  stroke: string,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Draws the card into a w x h canvas. 4:3 canvases show the exact 1000 x 750 composition. */
export function drawTestCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: TestCardOptions = {},
): void {
  const portrait = width / height < 1.15;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';

  // 1. Field and hairline grid fill the whole canvas.
  const u = portrait ? width / 1000 : Math.min(width / 1000, height / 750);
  const ox = portrait ? 0 : (width - 1000 * u) / 2;
  const oy = portrait ? 0 : (height - 750 * u) / 2;
  rect(ctx, TT[1], 0, 0, width, height);
  ctx.globalAlpha = 0.5;
  const cell = portrait ? width / 20 : 50 * u;
  const hair = Math.max(u, 1);
  for (let gx = ox % cell; gx <= width + 0.5; gx += cell) line(ctx, TT[3], hair, gx, 0, gx, height);
  for (let gy = oy % cell; gy <= height + 0.5; gy += cell) line(ctx, TT[3], hair, 0, gy, width, gy);
  ctx.globalAlpha = 1;

  const L: Layout = portrait
    ? { u, x: 0, y: 0, w: width, h: height, portrait }
    : { u, x: ox, y: oy, w: 1000 * u, h: 750 * u, portrait };

  // Landscape card keeps the composition's own frame; portrait frames the whole canvas.
  const fx = L.x;
  const fy = L.y;
  const fw = L.w;
  const fh = L.h;

  // 2. Double rule frame, square corners.
  ctx.strokeStyle = TT[6];
  ctx.lineWidth = 6 * u;
  ctx.strokeRect(fx + 27 * u, fy + 27 * u, fw - 54 * u, fh - 54 * u);
  ctx.strokeStyle = TT[3];
  ctx.lineWidth = 2 * u;
  ctx.strokeRect(fx + 35 * u, fy + 35 * u, fw - 70 * u, fh - 70 * u);

  // Geometry of the middle of the card.
  const cx = fx + fw / 2;
  const cy = portrait ? fy + fh / 2 : fy + 360 * u;
  const R = portrait ? 0.35 * Math.min(width, height) : 215 * u;
  const k = R / 215; // scale of everything inside the circle (units to px)

  // 10. Corner marks (quarter discs), drawn before the strips so strips sit above them.
  const cap = 60 * u;
  const capGreys = [TT[2], TT[4], TT[5], TT[6]];
  const corners: Array<[number, number, number]> = [
    [fx + 24 * u, fy + 24 * u, 0],
    [fx + fw - 24 * u, fy + 24 * u, 1],
    [fx + fw - 24 * u, fy + fh - 24 * u, 2],
    [fx + 24 * u, fy + fh - 24 * u, 3],
  ];
  corners.forEach(([x, y, i]) => {
    ctx.fillStyle = capGreys[i] ?? TT[4];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, cap, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
    ctx.closePath();
    ctx.fill();
  });

  // 7. Grey scale strip: nine blocks, black to white.
  const gsX = portrait ? fx + 70 * u : fx + 150 * u;
  const gsW = portrait ? fw - 140 * u : 700 * u;
  const gsY = fy + 48 * u;
  const gsH = 70 * u;
  for (let i = 0; i < 9; i += 1) {
    const g = Math.round((i / 8) * 255);
    rect(ctx, `rgb(${g},${g},${g})`, gsX + (gsW / 9) * i, gsY, gsW / 9 + 0.5, gsH);
  }

  // 8. Ramp strip with a line at each tenth.
  const rpY = fy + fh - 90 * u;
  const rpH = 50 * u;
  const grad = ctx.createLinearGradient(gsX, 0, gsX + gsW, 0);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.fillRect(gsX, rpY, gsW, rpH);
  for (let i = 0; i <= 10; i += 1)
    line(ctx, TT[3], Math.max(u, 1), gsX + (gsW / 10) * i, rpY, gsX + (gsW / 10) * i, rpY + rpH);

  // 9. Wedges: five groups of lines narrowing from 12 to 1 unit.
  const widths = [12, 9, 6, 3, 1];
  const drawWedge = (x: number, y: number, w: number, h: number, vertical: boolean): void => {
    rect(ctx, TT[0], x, y, w, h);
    const span = (vertical ? h : w) / 5;
    widths.forEach((lw, gi) => {
      const lwPx = Math.max(lw * u, 0.75);
      ctx.fillStyle = TT[7];
      if (vertical) {
        const gy = y + span * gi;
        for (let px = x; px < x + w; px += lwPx * 2)
          ctx.fillRect(px, gy, Math.min(lwPx, x + w - px), span);
      } else {
        const gx = x + span * gi;
        for (let py = y; py < y + h; py += lwPx * 2)
          ctx.fillRect(gx, py, span, Math.min(lwPx, y + h - py));
      }
    });
  };
  if (!portrait) {
    drawWedge(fx + 48 * u, fy + 160 * u, 82 * u, 430 * u, true);
    drawWedge(fx + 870 * u, fy + 160 * u, 82 * u, 430 * u, true);
  } else {
    const bandH = Math.max(0, Math.min(70 * u, cy - R - (gsY + gsH) - 40 * u));
    if (bandH > 12 * u) {
      drawWedge(gsX, gsY + gsH + 20 * u, gsW, bandH, false);
      drawWedge(
        gsX,
        cy + R + 20 * u + 100 * u,
        gsW,
        Math.min(bandH, rpY - (cy + R + 160 * u)),
        false,
      );
    }
  }

  // 3. Main circle.
  ctx.fillStyle = TT[1];
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = TT[7];
  ctx.lineWidth = 6 * k;
  ctx.stroke();

  // 5. Ring steps, radius 112 to 202 in five 18 unit rings.
  const ringGreys = [TT[1], TT[2], TT[3], TT[5], TT[6]];
  ringGreys.forEach((g, i) => {
    ctx.strokeStyle = g;
    ctx.lineWidth = 18 * k + 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, (112 + 9 + 18 * i) * k, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 6. Cross hairlines through the centre, across the whole frame, with ticks every 50 units.
  const crossLine = Math.max(2 * u, 1);
  line(ctx, TT[6], crossLine, fx + 36 * u, cy, fx + fw - 36 * u, cy);
  line(ctx, TT[6], crossLine, cx, fy + 36 * u, cx, fy + fh - 36 * u);
  for (let d = 50 * u; cx + d < fx + fw - 40 * u; d += 50 * u) {
    for (const s of [-1, 1])
      line(ctx, TT[6], crossLine, cx + s * d, cy - 6 * u, cx + s * d, cy + 6 * u);
  }
  for (let d = 50 * u; cy + d < fy + fh - 40 * u; d += 50 * u) {
    for (const s of [-1, 1])
      line(ctx, TT[6], crossLine, cx - 6 * u, cy + s * d, cx + 6 * u, cy + s * d);
  }

  // 4. Siren: twelve sectors radius 100, 24 unit hub.
  for (let i = 0; i < 12; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? TT[0] : TT[7];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(
      cx,
      cy,
      100 * k,
      (i * Math.PI) / 6 - Math.PI / 2,
      ((i + 1) * Math.PI) / 6 - Math.PI / 2,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = TT[2];
  ctx.beginPath();
  ctx.arc(cx, cy, 12 * k, 0, Math.PI * 2);
  ctx.fill();

  // 11 and 12. Caption plate on top of the circle (it cuts 11 units off the circle, as intended).
  // Portrait cards keep the caption at least about 16 px tall rather than shrinking with the card.
  const tu = portrait ? Math.min((0.9 * fw) / 430, 0.75) : u;
  const plateW = 420 * tu;
  const plateH = 84 * tu;
  const plateCy = cy + (246 / 215) * R;
  const plateX = cx - plateW / 2;
  const plateY = plateCy - plateH / 2;
  rect(ctx, TT[0], plateX, plateY, plateW, plateH);
  ctx.textAlign = 'center';
  ctx.fillStyle = TT[7];
  ctx.font = `600 ${32 * tu}px ${DISPLAY_FONT}`;
  setLetterSpacing(ctx, 2 * tu);
  ctx.fillText('TRANSMISSION PENDING', cx, plateY + 30 * tu);
  setLetterSpacing(ctx, 0);
  line(
    ctx,
    TT[3],
    Math.max(2 * tu, 1),
    plateX + 20 * tu,
    plateY + 40 * tu,
    plateX + plateW - 20 * tu,
    plateY + 40 * tu,
  );
  const loading = options.loadingPercent;
  const sub =
    loading === null || loading === undefined
      ? (options.subCaption ?? 'STAND BY')
      : `TUNING... ${Math.max(0, Math.min(100, Math.round(loading)))}%`;
  ctx.fillStyle = TT[5];
  ctx.font = `${22 * tu}px ${TELETEXT_FONT}`;
  ctx.fillText(sub, cx, plateY + 72 * tu);

  ctx.restore();
}

/** Creates a canvas and draws the card. Browser only. */
export function createTestCardCanvas(
  width = 960,
  height = 720,
  options: TestCardOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) drawTestCard(ctx, width, height, options);
  return canvas;
}
