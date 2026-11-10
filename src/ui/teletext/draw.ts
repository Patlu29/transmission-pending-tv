import type { Frame, RunKind } from './frame';
import type { GridSpec } from './grid';
import type { Palette } from './palette';
import { drawTestCard } from '@/scene/materials/testcard/drawTestCard';
import { trembleOffset, bleedLook } from './effects';
import { glyphMetrics } from './font';

interface Colours {
  fg: string;
  bg: string | null;
}

function coloursFor(kind: RunKind, p: Palette): Colours {
  const tt = (i: number) => p.tt[i] ?? p.bg;
  switch (kind) {
    case 'strong':
      return { fg: p.strong, bg: null };
    case 'fact':
      return { fg: p.factText, bg: p.factBg };
    case 'header':
      return { fg: p.headerText, bg: p.headerBg };
    case 'hilite':
      return { fg: p.headerText, bg: p.headerBg };
    case 'cursor':
      return { fg: p.strong, bg: p.strong };
    case 'fast1':
      return { fg: tt(7), bg: tt(1) };
    case 'fast2':
      return { fg: tt(7), bg: tt(2) };
    case 'fast3':
      return { fg: tt(0), bg: tt(3) };
    case 'fast4':
      return { fg: tt(0), bg: tt(4) };
    default:
      return { fg: p.text, bg: null };
  }
}

/**
 * Draws a frame. `scale` converts on-screen CSS px to canvas pixels, so the
 * grid maths (design-spec 5) stay in on-screen units whatever the canvas size.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  grid: GridSpec,
  p: Palette,
  scale: number,
) {
  const pw = grid.cssW * scale;
  const ph = grid.cssH * scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, pw, ph);

  if (frame.mode === 'card' && frame.card) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawTestCard(ctx, pw, ph, {
      loadingPercent: frame.card.loadingPercent,
      subCaption: frame.card.sub,
    });
    if (frame.card.dim) {
      // Loading: 40 per cent brightness, a black veil at 60 per cent.
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, pw, ph);
      ctx.restore();
    }
    return;
  }
  if (frame.mode !== 'page') return;

  const { drawPx } = glyphMetrics(grid, p.fontTeletext);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.font = `${drawPx}px ${p.fontTeletext}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const baseline = grid.rowH * 0.5 + drawPx * 0.3;
  const fx = frame.fx;

  frame.runs.forEach((runs, r) => {
    const y = grid.originY + r * grid.rowH;
    const shake = fx && fx.kind === 'tremble' && fx.rows.includes(r) ? fx : null;
    for (const run of runs) {
      const x = grid.originX + run.col * grid.cellW;
      const { fg, bg } = coloursFor(run.kind, p);
      // Mosaics, blocks and bars are plain rectangles; VT323 has no sextant glyphs.
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, run.text.length * grid.cellW, grid.rowH);
      }
      if (run.kind === 'cursor') continue;
      ctx.fillStyle = fg;
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
        ctx.fillText(ch, x + (i + 0.5) * grid.cellW + dx, y + baseline + dy);
      }
    }
  });

  if (fx && fx.kind === 'bleed') {
    const { alpha, length } = bleedLook(fx.elapsedMs, fx.durMs);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.rule;
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
