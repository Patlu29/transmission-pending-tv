import { useEffect, useRef } from 'react';
import { useHauntStore } from '@/state/hauntStore';
import { HAUNT_TEXT_REDRAW_HZ } from '@/state/timing';
import type { Frame } from '@/ui/teletext/frame';
import type { GridSpec } from '@/ui/teletext/grid';

/**
 * 2D equivalent of the Occupant ghost layer and the edge dim (design-spec 16.5, 16.6.3).
 *
 * SEAM: the sprite comes from the technical-artist's `drawOccupant(ctx, w, h)`
 * (src/scene/materials/, 256 x 384, greyscale with alpha). It is looked up with a lazy glob,
 * so this renders nothing (and the build still passes) until that file exists.
 */
type OccupantFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
const loaders = import.meta.glob<Record<string, unknown>>('/src/scene/materials/**/*ccupant*.ts');

let spritePromise: Promise<HTMLCanvasElement | null> | null = null;
function loadSprite(): Promise<HTMLCanvasElement | null> {
  spritePromise ??= (async () => {
    for (const load of Object.values(loaders)) {
      const mod = await load();
      const fn = mod.drawOccupant;
      if (typeof fn !== 'function') continue;
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 384;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      (fn as OccupantFn)(ctx, 256, 384);
      return c;
    }
    return null;
  })();
  return spritePromise;
}

const PEAK_LUM = 0.3;
const TEXT_LUM = 0.07;
const ease = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Props {
  width: number;
  height: number;
  grid: GridSpec;
  frame: Frame;
}

export function Haunt2D({ width, height, grid, frame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const live = useRef({ frame, grid, width, height });

  useEffect(() => {
    live.current = { frame, grid, width, height };
  }, [frame, grid, width, height]);

  useEffect(() => {
    let sprite: HTMLCanvasElement | null = null;
    let cancelled = false;
    void loadSprite().then((s) => {
      if (!cancelled) sprite = s;
    });
    let last = 0;
    let raf = 0;
    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (t - last < 1000 / HAUNT_TEXT_REDRAW_HZ) return;
      last = t;
      const { ghost, ghostNear, dim } = useHauntStore.getState();
      const vignette = vignetteRef.current;
      if (vignette) vignette.style.setProperty('--haunt-dim', String(dim));
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { frame: f, grid: g, width: w, height: h } = live.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!sprite || ghost < 0.001) return;

      const near = ease(ghostNear);
      const dh = lerp(0.35, 0.95, near) * h;
      const dw = (dh * 256) / 384;
      const cx = w * (0.5 + 0.06 * Math.sin((2 * Math.PI * (t / 1000)) / 40));
      const cy = h * lerp(0.62, 0.45, near);
      ctx.save();
      ctx.globalAlpha = ghost * PEAK_LUM; // sprite is at most 1.0, so peak luminance stays under 0.30
      ctx.drawImage(sprite, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();

      // Keep the figure at or under 0.07 over text cells and their one-cell dilation (contrast 4.5:1).
      const peak = ghost * PEAK_LUM;
      if (peak > TEXT_LUM) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - TEXT_LUM / peak})`;
        f.runs.forEach((runs, r) => {
          if (runs.length === 0) return;
          const first = runs[0]?.col ?? 0;
          const lastRun = runs[runs.length - 1];
          const end = (lastRun?.col ?? 0) + (lastRun?.text.length ?? 0);
          ctx.fillRect(
            g.originX + (first - 1) * g.cellW,
            g.originY + r * g.rowH - g.rowH * 0.25,
            (end - first + 2) * g.cellW,
            g.rowH * 1.5,
          );
        });
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="screen2d__ghost"
        width={Math.max(1, Math.round(width))}
        height={Math.max(1, Math.round(height))}
      />
      <div ref={vignetteRef} className="screen2d__vignette" />
    </>
  );
}
