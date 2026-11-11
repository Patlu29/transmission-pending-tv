import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * Drives a demand frame loop at 30 Hz while a room only has slow ambient motion (drifting cloud,
 * twinkling stars, light spill), instead of 60 Hz. Everything that moves there is 3 px/s drift or
 * 1.5 Hz or slower, so the halved rate looks the same but costs half the GPU time and battery.
 * Camera tweens and the CRT timeline still request their own frames, so they stay smooth. It runs
 * on requestAnimationFrame, so a hidden tab stops it. Mount it only when motion is not reduced.
 */
const INTERVAL_MS = 30; // just under 33.3, so a 60, 120 or 144 Hz display lands on 30 Hz

export function AmbientTicker({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < INTERVAL_MS) return;
      last = t;
      invalidate();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, invalidate]);
  return null;
}
