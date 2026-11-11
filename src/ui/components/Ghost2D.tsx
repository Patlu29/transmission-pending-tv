import { useEffect, useRef } from 'react';
import { drawGhost2D } from '@/scene/materials/holo/drawGhost2D';
import { useHauntStore } from '@/state/hauntStore';
import { useSettingsStore } from '@/state/settingsStore';
import { HAUNT_TEXT_REDRAW_HZ } from '@/state/timing';
import type { Frame } from '@/ui/teletext/frame';
import type { GridSpec } from '@/ui/teletext/grid';

/**
 * 2D equivalent of the Occupant (design-spec-2050 4.2, 16.5) and the edge dim (16.6.3): the
 * technical-artist's `drawGhost2D` (the 2050 slice-lit figure) into a low-resolution canvas stacked above the
 * card and below the glass chrome, at most 30 Hz, never in Calm (the haunt store is zero there). The text
 * mask is built from the frame's text cells, so the figure is capped over glyphs and one cell round them.
 */
const LAYER_W = 192;
const LAYER_H = 144;

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
    const mask = document.createElement('canvas');
    mask.width = LAYER_W;
    mask.height = LAYER_H;
    let maskedFrame: Frame | null = null;
    let last = 0;
    let raf = 0;

    // Light cells of text on black, at the layer's resolution.
    const buildMask = (f: Frame, g: GridSpec, w: number) => {
      const ctx = mask.getContext('2d');
      if (!ctx) return;
      const s = LAYER_W / Math.max(1, w);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, LAYER_W, LAYER_H);
      ctx.fillStyle = '#fff';
      f.runs.forEach((runs, r) => {
        for (const run of runs) {
          ctx.fillRect(
            (g.originX + run.col * g.cellW) * s,
            (g.originY + r * g.rowH) * s,
            run.text.length * g.cellW * s,
            g.rowH * s,
          );
        }
      });
    };

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (t - last < 1000 / HAUNT_TEXT_REDRAW_HZ) return;
      last = t;
      const { ghost, ghostNear, dim } = useHauntStore.getState();
      vignetteRef.current?.style.setProperty('--haunt-dim', String(dim));
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { frame: f, grid: g, width: w, height: h } = live.current;
      if (ghost < 0.001) {
        ctx.clearRect(0, 0, LAYER_W, LAYER_H);
        return;
      }
      if (maskedFrame !== f) {
        buildMask(f, g, w);
        maskedFrame = f;
      }
      drawGhost2D(ctx, LAYER_W, LAYER_H, {
        ghost,
        near: ghostNear,
        time: t / 1000,
        aspect: w / Math.max(1, h),
        scale: LAYER_W / Math.max(1, w),
        textMask: mask,
        mono: useSettingsStore.getState().colour === 'bw',
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="screen2d__ghost" width={LAYER_W} height={LAYER_H} />
      <div ref={vignetteRef} className="screen2d__vignette" />
    </>
  );
}
