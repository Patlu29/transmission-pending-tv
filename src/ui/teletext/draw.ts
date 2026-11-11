import { bleedLook, trembleOffset } from './effects';
import { glyphMetrics } from './font';
import type { Frame, RunKind } from './frame';
import type { GridSpec } from './grid';
import type { Palette } from './palette';
import { drawStandbyField } from './standby';

/**
 * Draws a frame as light-field text (design-spec-2050 3.5): a rounded ink card with a thin lumen
 * edge, Space Mono on the cell grid, verified facts as lit chips, header and fastext as rounded chips.
 * Colour is allowed; Monochrome is a CSS filter on the canvas element. Mosaics and chips are plain
 * rounded rectangles (no font glyphs).
 */
interface Colours {
  fg: string;
  /** Chip fill behind the run, or null. */
  chip: string | null;
}

const CHROME: ReadonlySet<RunKind> = new Set<RunKind>([
  'header',
  'fast1',
  'fast2',
  'fast3',
  'fast4',
]);

function coloursFor(kind: RunKind, p: Palette): Colours {
  switch (kind) {
    case 'strong':
      return { fg: p.strong, chip: null };
    case 'fact':
      return { fg: p.factText, chip: p.factBg };
    case 'header':
    case 'hilite':
      return { fg: p.headerText, chip: p.headerBg };
    case 'cursor':
      return { fg: p.strong, chip: p.strong };
    case 'fast1':
    case 'fast2':
    case 'fast3':
    case 'fast4':
      return { fg: p.tt[7] ?? p.strong, chip: p.chip };
    default:
      return { fg: p.text, chip: null };
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Static spectrum rails in the side margins of the 16:9 pane (calibration-field look, no animation). */
function drawRails(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x0: number,
  width: number,
  height: number,
) {
  if (width < 12) return;
  const bars = 20;
  const barW = Math.min(width / (bars * 1.6), height * 0.012);
  const gap = (width - bars * barW) / (bars + 1);
  for (let i = 0; i < bars; i++) {
    const h = height * (0.05 + (0.95 * (i + 1)) / bars) * 0.5;
    ctx.fillStyle = i < bars / 2 ? p.lumen : p.haze;
    ctx.globalAlpha = 0.45;
    const x = x0 + gap + i * (barW + gap);
    roundRect(ctx, x, (height - h) / 2, barW, h, barW / 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Draws a frame. `scale` converts on-screen CSS px to canvas pixels, so the grid maths (design-spec 5)
 * stay in on-screen units. `pane` is the whole canvas: in 3d-set the pane is 16:9 and the text card
 * (the grid's cssW x cssH) is a centred 4:3 region; elsewhere the card fills the pane.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  grid: GridSpec,
  p: Palette,
  scale: number,
  pane?: { width: number; height: number },
) {
  const cardW = grid.cssW * scale;
  const cardH = grid.cssH * scale;
  const pw = pane?.width ?? cardW;
  const ph = pane?.height ?? cardH;
  const offsetX = (pw - cardW) / 2;
  const chromeAlpha = frame.chromeAlpha;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, pw, ph);

  if (frame.mode === 'card' && frame.card) {
    drawStandbyField(ctx, pw, ph, p, {
      loadingPercent: frame.card.loadingPercent,
      subCaption: frame.card.sub,
    });
    if (frame.card.dim) {
      // Loading: 40 per cent brightness, a veil at 60 per cent.
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, pw, ph);
      ctx.restore();
    }
    return;
  }
  if (frame.mode !== 'page') return;

  // Side rails, then the card with its thin lumen edge.
  if (offsetX > 1) {
    ctx.save();
    ctx.globalAlpha = chromeAlpha;
    drawRails(ctx, p, 0, offsetX, ph);
    drawRails(ctx, p, offsetX + cardW, offsetX, ph);
    ctx.restore();
  }
  const radius = Math.min(28 * scale, cardH / 6);
  ctx.save();
  roundRect(ctx, offsetX, 0, cardW, cardH, radius);
  ctx.fillStyle = p.bg;
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, scale);
  ctx.strokeStyle = p.lumen;
  ctx.stroke();
  ctx.restore();

  const { drawPx } = glyphMetrics(grid, p.fontTeletext);
  ctx.setTransform(scale, 0, 0, scale, offsetX, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Space Mono's line box is 1.481 em; glyphs are placed by their baseline (the DOM's half-leading gives the same spot).
  const baseline = grid.rowH * 0.5 + drawPx * 0.38;
  const fx = frame.fx;
  const fringe = fx && fx.kind === 'tremble' ? Math.min(1.5, 0.03 * grid.fontPx) : 0;
  const chipRadius = Math.max(3, grid.rowH * 0.22);

  frame.runs.forEach((runs, r) => {
    const y = grid.originY + r * grid.rowH;
    const shake = fx && fx.kind === 'tremble' && fx.rows.includes(r) ? fx : null;
    for (const run of runs) {
      const x = grid.originX + run.col * grid.cellW;
      const { fg, chip } = coloursFor(run.kind, p);
      const chrome = CHROME.has(run.kind);
      ctx.globalAlpha = chrome ? chromeAlpha : 1;
      if (chip) {
        // Lit chips and header chips are rounded rectangles; the cursor is a slim lit bar.
        ctx.fillStyle = chip;
        if (run.kind === 'cursor') {
          ctx.fillRect(
            x + grid.cellW * 0.1,
            y + grid.rowH * 0.12,
            grid.cellW * 0.8,
            grid.rowH * 0.76,
          );
        } else if (run.kind === 'fact') {
          roundRect(
            ctx,
            x - 1,
            y + grid.rowH * 0.08,
            run.text.length * grid.cellW + 2,
            grid.rowH * 0.84,
            6,
          );
          ctx.fill();
        } else if (run.kind.startsWith('fast')) {
          const w = run.text.length * grid.cellW;
          roundRect(ctx, x + 2, y + grid.rowH * 0.06, w - 4, grid.rowH * 0.88, chipRadius);
          ctx.fill();
          ctx.fillStyle = p.lumen; // a 2 px underline in lumen
          ctx.fillRect(x + chipRadius, y + grid.rowH * 0.88, w - 2 * chipRadius, 2);
        } else {
          roundRect(
            ctx,
            x,
            y + grid.rowH * 0.06,
            run.text.length * grid.cellW,
            grid.rowH * 0.88,
            chipRadius,
          );
          ctx.fill();
        }
      }
      if (run.kind === 'cursor') continue;
      // Strong text and fact chips (most numerals) are Bold: Space Mono's dotted zero is faint under about 18 px.
      ctx.font = `${run.kind === 'strong' || run.kind === 'fact' ? '700 ' : ''}${drawPx}px ${p.fontTeletext}`;
      // A soft text glow on the strong tone only; body text has none, so contrast is not reduced.
      if (run.kind === 'strong') {
        ctx.shadowColor = p.glow;
        ctx.shadowBlur = 8;
      }
      for (let i = 0; i < run.text.length; i++) {
        const ch = run.text[i];
        if (!ch || ch === ' ') continue;
        let dx = 0;
        let dy = 0;
        if (shake) {
          const [ox, oy] = trembleOffset(
            shake.seed,
            r,
            run.col + i,
            shake.elapsedMs,
            shake.durMs,
            shake.amp,
          );
          dx = ox * grid.fontPx;
          dy = oy * grid.fontPx;
        }
        const gx = x + (i + 0.5) * grid.cellW + dx;
        const gy = y + baseline + dy;
        if (shake && fringe > 0 && run.kind !== 'fact') {
          // Glyph drift: a thin haze and lumen fringe on either side (35 per cent, at most 1.5 px).
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = p.haze;
          ctx.fillText(ch, gx - fringe, gy);
          ctx.fillStyle = p.lumen;
          ctx.fillText(ch, gx + fringe, gy);
          ctx.restore();
        }
        ctx.fillStyle = fg;
        ctx.fillText(ch, gx, gy);
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }
  });
  ctx.globalAlpha = 1;

  if (fx && fx.kind === 'bleed') {
    // Light smear: threads of light fall into the blank row below, 0.25 cell wide.
    const { alpha, length } = bleedLook(fx.elapsedMs, fx.durMs);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.lumen;
    const w = grid.cellW * 0.25;
    for (const st of fx.streaks) {
      ctx.fillRect(
        grid.originX + (st.col + 0.5) * grid.cellW - w / 2,
        grid.originY + st.row * grid.rowH,
        w,
        grid.rowH * length,
      );
    }
    ctx.restore();
  }
}
