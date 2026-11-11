import type { EnvironmentId } from '../scene/environments/contract.ts';
import type { ColourOption } from './settingsStore.ts';

/**
 * Whether the room should show colour (design-spec v2 1.8, V2-FR-14, V2-FR-36).
 *
 * - Other rooms: the Colour option, whatever is playing.
 * - TV room: only with Colour on AND a YouTube channel chosen (playing, paused or shown as a card).
 *   Channel 0 and the idle set stay black and white with the full CRT treatment, whatever the option.
 *
 * `hasLiveChannel` is `channelStore.current !== null`. The scene reads this to set its tint uniforms
 * (tint zero when false); the canvas filter is applied by the UI from the same value.
 */
export function isColourActive(
  colour: ColourOption,
  environment: EnvironmentId,
  hasLiveChannel: boolean,
): boolean {
  if (colour !== 'colour') return false;
  return environment === 'tv-room' ? hasLiveChannel : true;
}
