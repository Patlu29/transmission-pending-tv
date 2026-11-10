import { useEffect } from 'react';
import { useDisplayStore } from '@/state/displayStore';
import { useIntroStore } from '@/state/introStore';
import { chooseMode } from '@/state/modeDetect';

/**
 * Re-evaluates the 3d-set / 3d-screen choice on resize or rotation (debounced
 * 300 ms), but only while the set is not playing (design-spec 3.1). A forced
 * `?mode=` and any fallback to 2D are final.
 */
export function useRenderMode(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const evaluate = () => {
      const d = useDisplayStore.getState();
      const { status } = useIntroStore.getState();
      if (d.forcedMode || d.fallbackReason || d.renderMode === '2d') return;
      if (status === 'warming' || status === 'playing') {
        timer = setTimeout(evaluate, 300); // try again once the show allows a switch
        return;
      }
      const { mode } = chooseMode();
      if (mode !== d.renderMode) d.setRenderMode(mode);
    };
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(evaluate, 300);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
}
