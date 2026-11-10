// INTEGRATION SEAM 1 of 4: store access.
//
// The scene reads stores only (architecture 4.1). displayStore is the real one.
// src/state/introStore.ts did not exist yet, so useIntroStore below is a PLACEHOLDER
// zustand store with the shape from architecture 4.2.
//
// TO SWAP: delete the placeholder `create(...)` block and its helpers, and write
//   export { useIntroStore } from '@/state/introStore';
// IntroSlice is the minimum the scene needs (status plus power() and nextPage()).
import { create } from 'zustand';

export type IntroStatus = 'off' | 'loading' | 'ready' | 'warming' | 'playing' | 'ended';

export interface IntroSlice {
  status: IntroStatus;
  pageIndex: number;
  lineIndex: number;
  revealedChars: number;
  /** Assumed to toggle: off -> on, and on -> off (user decision: power toggles). */
  power(): void;
  skip(): void;
  replay(): void;
  nextPage(): void;
  prevPage(): void;
}

let warmTimer: ReturnType<typeof setTimeout> | undefined;

export const useIntroStore = create<IntroSlice>()((set, get) => ({
  status: 'ready',
  pageIndex: 0,
  lineIndex: 0,
  revealedChars: 0,
  power() {
    clearTimeout(warmTimer);
    if (get().status === 'off' || get().status === 'ready') {
      set({ status: 'warming' });
      warmTimer = setTimeout(() => set({ status: 'playing' }), 2200);
    } else {
      set({ status: 'ready' });
    }
  },
  skip() {},
  replay() {},
  nextPage() {},
  prevPage() {},
}));

// The real display store exists (src/state/displayStore.ts): `motion` already folds in
// the Calm switch, and it provides screenCanvas, screenVersion, screenRect,
// cameraResetNonce, cameraOffWatch and the scene's reporting actions.
export { useDisplayStore } from '@/state/displayStore';
