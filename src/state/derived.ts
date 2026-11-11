import type { ColourOption } from './settingsStore.ts';

/**
 * Whether the site should show colour (2050 theme, T50-5): the Colour switch, on every room and on
 * channel 0. Off is Monochrome. The v1 colour-era tint rule (TV room only with a live channel) is retired.
 */
export function isColourActive(colour: ColourOption): boolean {
  return colour === 'colour';
}
