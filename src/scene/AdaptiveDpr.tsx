import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

/**
 * Lowers the render resolution on devices that cannot hold the frame rate (NFR-1).
 * It only looks at frames drawn while the loop runs continuously (the intro), ignores very long
 * gaps (hidden tab, idle demand frames, asset compiles) and only ever steps down, never up,
 * so the picture cannot flap. The floor is 1, which is the lower end of the Canvas dpr range.
 * The CRT shader reads gl.getPixelRatio() every frame, so grain and scanlines stay consistent.
 */
const WINDOW_MS = 2000; // sample window
const MIN_SAMPLES = 3;
const FPS_FLOOR = 36; // steps down below this (target is 60 desktop, 30 mobile)
const STEP = 0.75;
const GAP_MS = 1500; // longer gaps are a hidden tab or an idle demand loop, not rendering cost
const STRIKES = 2; // consecutive slow windows before a step

export function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ ms: 0, n: 0, strikes: 0 });

  useFrame((state, delta) => {
    if (state.get().frameloop !== 'always') return;
    const a = acc.current;
    const ms = delta * 1000;
    if (ms > GAP_MS) {
      a.ms = 0;
      a.n = 0;
      a.strikes = 0;
      return;
    }
    a.ms += ms;
    a.n += 1;
    if (a.ms < WINDOW_MS) return;
    const fps = a.n >= MIN_SAMPLES ? (a.n * 1000) / a.ms : 60;
    a.ms = 0;
    a.n = 0;
    a.strikes = fps < FPS_FLOOR ? a.strikes + 1 : 0;
    if (a.strikes < STRIKES) return;
    a.strikes = 0;
    const dpr = state.viewport.dpr;
    if (dpr > 1) setDpr(Math.max(1, dpr * STEP));
  });

  return null;
}
