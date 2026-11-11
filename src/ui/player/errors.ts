import type { PlayerErrorClass } from '../../state/playerStore.ts';

/**
 * YouTube IFrame Player error codes to our "no signal" classes (ADR 0011 section 4,
 * design-spec v2 1.9). Unknown codes count as a player fault. Pure.
 */
export function mapPlayerError(code: number): PlayerErrorClass {
  switch (code) {
    case 2:
      return 'garbled';
    case 100:
      return 'off-air';
    case 101:
    case 150:
      return 'not-for-set';
    case 153:
      return 'unverified';
    case 5:
    default:
      return 'fault';
  }
}

export type NoSignalAction = 'next' | 'guide' | 'retry' | 'watch' | 'paste';

export interface NoSignalCopy {
  heading: string;
  body: string;
  actions: NoSignalAction[];
}

/** In-character copy per class. The error class is shown in text only; nothing is sent anywhere. */
export const NO_SIGNAL: Record<PlayerErrorClass, NoSignalCopy> = {
  garbled: {
    heading: 'SIGNAL GARBLED',
    body: 'That link did not lead to a picture. Check the link and try again.',
    actions: ['paste', 'guide'],
  },
  fault: {
    heading: 'FAULT AT THE TRANSMITTER',
    body: 'The player had a turn and stopped. This is usually temporary.',
    actions: ['retry', 'next', 'watch'],
  },
  'off-air': {
    heading: 'OFF AIR',
    body: 'This programme has gone, or it is private.',
    actions: ['next', 'guide'],
  },
  'not-for-set': {
    heading: 'NOT FOR THIS SET',
    body: 'The owner does not allow their picture to be shown on other sites, or it is not available in your region. We do not try to get around that.',
    actions: ['watch', 'next'],
  },
  unverified: {
    heading: 'THE PLAYER COULD NOT CHECK US',
    body: 'The player could not verify this site. That is our fault, not the channel’s. Error class 153.',
    actions: ['retry', 'watch'],
  },
  blocked: {
    heading: 'NO SIGNAL',
    body: 'Your browser may have blocked the player, for example with tracking protection. You can watch it on YouTube instead.',
    actions: ['retry', 'watch'],
  },
};

/** How long the player may take to become ready before we call it blocked (ADR 0011 section 1). */
export const PLAYER_READY_TIMEOUT_MS = 8000;
