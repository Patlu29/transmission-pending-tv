import { useEffect } from 'react';
import { glitchOpacity, useHauntStore } from '@/state/hauntStore';
import { HAUNT_TEXT_REDRAW_HZ } from '@/state/timing';

/**
 * The `glitch` cue (design-spec-2050 4.3): while it runs, the display's own UI chrome (HUD plates; the
 * canvas chips are dimmed by the rasteriser) dips in opacity. Published as the CSS variable
 * `--glitch-opacity` on <html> at 30 Hz at most; 1 when idle. It is never read by the dock keys, the
 * info row, notices or any player ancestor. Calm zeroes the haunt store, so it never runs there.
 */
export function useChromeGlitch(): void {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let last = 0;
    const set = (v: number) => root.style.setProperty('--glitch-opacity', String(v));
    const step = (t: number) => {
      const g = useHauntStore.getState().glitch;
      if (!g.active) {
        set(1);
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(step);
      if (t - last < 1000 / HAUNT_TEXT_REDRAW_HZ) return;
      last = t;
      set(Number(glitchOpacity(g, performance.now() - g.startedAt).toFixed(3)));
    };
    const unsub = useHauntStore.subscribe((s) => {
      if (s.glitch.active && !raf) raf = requestAnimationFrame(step);
    });
    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
      set(1);
    };
  }, []);
}
