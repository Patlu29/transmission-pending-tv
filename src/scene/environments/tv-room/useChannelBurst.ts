import { useEffect, useState } from 'react';
import { useDisplayStore } from '../../integration/stores';
import { useChannelStore } from '../seam.ts';

const BURST_MS = 300;
const MIN_GAP_MS = 1000;

/**
 * The bezel channel-change burst (design-spec-v2 1.10): 0..1 for 300 ms (sine envelope) whenever the live
 * channel changes, at most once per 1000 ms, never under Calm. Only the bezel ring uses it, never the player rect.
 * Re-renders only while the burst runs.
 */
export function useChannelBurst(): number {
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    let last = -Infinity;
    let raf = 0;
    const run = (start: number) => {
      const t = (performance.now() - start) / BURST_MS;
      if (t >= 1) {
        setBurst(0);
        return;
      }
      setBurst(Math.sin(Math.PI * t));
      raf = requestAnimationFrame(() => run(start));
    };
    const unsub = useChannelStore.subscribe((s, prev) => {
      if (s.current === prev.current || s.current === null) return;
      if (useDisplayStore.getState().reducedMotion) return;
      const now = performance.now();
      if (now - last < MIN_GAP_MS) return;
      last = now;
      cancelAnimationFrame(raf);
      run(now);
    });
    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, []);
  return burst;
}
