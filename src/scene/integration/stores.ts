// INTEGRATION SEAM 1 of 4: store access. The scene reads stores only (architecture 4.1).
import { create } from 'zustand';
import { useDisplayStore } from '@/state/displayStore';

export { useIntroStore } from '@/state/introStore';
export type { IntroStatus } from '@/state/introStore';
export { useDisplayStore };

// ---------------------------------------------------------------------------
// HAUNT SEAM (round 2). The frontend-developer creates src/state/hauntStore.ts
// (design-spec 16.3 field names). Until it exists, this local stub has the same
// shape. TO SWAP: delete the stub below and write
//   export { useHauntStore } from '@/state/hauntStore';
// (the scene never writes this store).
// ---------------------------------------------------------------------------
export interface HauntState {
  ghost: number;
  ghostNear: number;
  creep: number;
  dim: number;
  shadow: number;
  hum: number;
  roll: { active: boolean; startedAt: number; dur: number };
  knobCue: { nonce: number; which: 'channel' | 'volume'; deg: number; dur: number } | null;
}

export const useHauntStore = create<HauntState>()(() => ({
  ghost: 0,
  ghostNear: 0,
  creep: 0,
  dim: 0,
  shadow: 0,
  hum: 0,
  roll: { active: false, startedAt: 0, dur: 0 },
  knobCue: null,
}));

const ZERO: HauntState = {
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
export function readHaunt(): HauntState {
  return useDisplayStore.getState().reducedMotion ? ZERO : useHauntStore.getState();
}
