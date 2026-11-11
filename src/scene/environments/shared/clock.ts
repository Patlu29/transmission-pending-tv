import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';

/** A pleasant, fixed time for the frozen Calm frame of every room (stars, clouds and so on). */
export const FROZEN_T = 41.7;

/**
 * Shared generic light spill (design-spec-v2 5.0). No component is faster than 1.3 Hz, the swing is
 * plus or minus 13 per cent, and it is never driven by the video. Calm: exactly 1.
 */
export function spill(t: number, calm: boolean): number {
  if (calm) return 1;
  return 1 + 0.08 * Math.sin(2 * Math.PI * 0.6 * t) + 0.05 * Math.sin(2 * Math.PI * 1.3 * t + 1.7);
}

export interface RoomClock {
  t: number;
}

/** Animation time in seconds. Frozen at FROZEN_T under Calm. Updated before the frame renders. */
export function useRoomClock(calm: boolean): MutableRefObject<RoomClock> {
  const clock = useRef<RoomClock>({ t: calm ? FROZEN_T : 0 });
  useFrame((_, delta) => {
    if (calm) clock.current.t = FROZEN_T;
    else clock.current.t += Math.min(delta, 0.1);
  }, -10);
  return clock;
}
