import { useEffect } from 'react';
import { useDisplayStore } from '@/state/displayStore';

/** Follows prefers-reduced-motion live (US-9). The manual Calm switch is OR-ed in by the store. */
export function useMotionPreference(): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => useDisplayStore.getState().setOsReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
}
