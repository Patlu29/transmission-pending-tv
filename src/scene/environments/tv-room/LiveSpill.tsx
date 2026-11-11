import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { useDisplayStore } from '../../integration/stores';
import { screenState } from '../../integration/screenState';
import { spill, useRoomClock } from '../shared/clock.ts';

/**
 * Light spill for live channels (design-spec-v2 5.1): the screen-glow point light sits at base 0.22 and
 * moves with the generic spill function (never sampled from the video). Overrides the v1 luminance
 * model while mounted. SetLights low-passes the value at 2 Hz as before.
 */
export function LiveSpill() {
  const calm = useDisplayStore((s) => s.reducedMotion);
  const clock = useRoomClock(calm);
  useEffect(() => {
    screenState.liveOverride = true;
    return () => {
      screenState.liveOverride = false;
    };
  }, []);
  useFrame(() => {
    // SetLights: intensity = MAX * 0.25 * min(1, lum / 0.5). Base 0.22 of the ceiling => lum = 0.11.
    screenState.meanLuminance = 0.11 * spill(clock.current.t, calm);
  }, -5);
  return null;
}
