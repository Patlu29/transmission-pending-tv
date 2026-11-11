import { useChannelStore } from './channelStore';
import { isColourActive } from './derived';
import { useEnvironmentStore } from './environmentStore';
import { useSettingsStore } from './settingsStore';

/** React hook: should the room show colour right now? (See `isColourActive`.) */
export function useColourActive(): boolean {
  const colour = useSettingsStore((s) => s.colour);
  const env = useEnvironmentStore((s) => s.id);
  const live = useChannelStore((s) => s.current !== null);
  return isColourActive(colour, env, live);
}

/** Non-reactive read for `useFrame`. */
export function getColourActive(): boolean {
  return isColourActive(
    useSettingsStore.getState().colour,
    useEnvironmentStore.getState().id,
    useChannelStore.getState().current !== null,
  );
}
