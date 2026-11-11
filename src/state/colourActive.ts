import { isColourActive } from './derived';
import { useSettingsStore } from './settingsStore';

/** React hook: should the site show colour right now? False means Monochrome. (See `isColourActive`.) */
export function useColourActive(): boolean {
  return isColourActive(useSettingsStore((s) => s.colour));
}

/** Non-reactive read for `useFrame`. */
export function getColourActive(): boolean {
  return isColourActive(useSettingsStore.getState().colour);
}
