import { useEffect } from 'react';
import { useDisplayStore } from '@/state/displayStore';
import { useIntroStore } from '@/state/introStore';

/** If the scene never reports ready, enable Power anyway after this long once its chunk has loaded. */
const READY_GRACE_MS = 10000;

/**
 * Moves introStore from 'loading' to 'ready': at once in 2D, or when the scene
 * reports ready (displayStore.sceneReady, or loadProgress reaching 1).
 * `sceneModuleLoaded` comes from the scene host once the lazy chunk resolves.
 */
export function useBootstrap(sceneModuleLoaded: boolean): void {
  useEffect(() => {
    let grace: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const d = useDisplayStore.getState();
      const ready =
        d.renderMode === '2d' || d.sceneReady || (d.loadProgress >= 1 && !d.assetFailed);
      if (ready) useIntroStore.getState().markReady();
    };
    check();
    if (sceneModuleLoaded) {
      grace = setTimeout(() => {
        if (!useDisplayStore.getState().assetFailed) useIntroStore.getState().markReady();
      }, READY_GRACE_MS);
    }
    const unsub = useDisplayStore.subscribe(check);
    return () => {
      unsub();
      clearTimeout(grace);
    };
  }, [sceneModuleLoaded]);
}
