// INTEGRATION SEAM 1 of 4: store access. The scene reads stores only (architecture 4.1).
import { useDisplayStore } from '@/state/displayStore';

export { useIntroStore } from '@/state/introStore';
export type { IntroStatus } from '@/state/introStore';
export { useDisplayStore };

// Haunt state (design-spec 16.3), written only by the frontend's cue scheduler.
// The scene reads it and never writes. Units: values 0..1, `dur` in seconds,
// `startedAt` in performance.now() ms.
import { useHauntStore } from '@/state/hauntStore';
import type { HauntValues, KnobCue, RollState } from '@/state/hauntStore';
export { useHauntStore };

export interface HauntRead extends HauntValues {
  roll: RollState;
  knobCue: KnobCue | null;
}

const ZERO: HauntRead = {
  ghost: 0,
  ghostNear: 0,
  creep: 0,
  dim: 0,
  shadow: 0,
  hum: 0,
  roll: { active: false, startedAt: 0, dur: 0 },
  knobCue: null,
};

/** Haunt values as the scene must use them: all zero under Calm or reduced motion (spec 16.8). */
export function readHaunt(): HauntRead {
  return useDisplayStore.getState().reducedMotion ? ZERO : useHauntStore.getState();
}
