/**
 * Adapter to the frontend-developer's v2 stores (architecture 12.1). The scene READS id, pose, userFocus,
 * the live channel and colour, and WRITES only: `playerStore.reportCorners`, `environmentStore.setLoading`
 * and `setReady`. This file is the one place that knows their field names.
 */
import { useChannelStore } from '@/state/channelStore';
import { useColourActive } from '@/state/colourActive';
import { useEnvironmentStore } from '@/state/environmentStore';
import { usePlayerStore } from '@/state/playerStore';

export { useChannelStore, useEnvironmentStore, usePlayerStore, useColourActive };

/** True when a YouTube channel (guide or pasted link) is selected. Channel 0 (the Occupant) is false. */
export const useIsLive = () => useChannelStore((s) => s.current !== null);
export const getIsLive = () => useChannelStore.getState().current !== null;

/** The `channel` scene prop: 0 for the Occupant, the guide number for a guide channel, 1 for a pasted link. */
export const useChannelNumber = () =>
  useChannelStore((s) => (s.current === null ? 0 : (s.current.number ?? 1)));

export const useChannelName = () => useChannelStore((s) => s.current?.name ?? null);

/** Step the channel knob: +1 next, -1 previous. */
export const stepChannel = (direction: 1 | -1) => useChannelStore.getState().step(direction);

/**
 * PLACEHOLDER: true when the channel 0 diary is on its last page, so the channel knob moves on to
 * channel 1 (design-spec-v2 section 3, item 3). introStore does not expose it yet, so this is always
 * false and the knob keeps v1's "next diary page" behaviour.
 */
export function isLastDiaryPage(): boolean {
  return false;
}
