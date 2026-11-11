import type { GuideChannel } from '../guide/schema.ts';

/**
 * Pure channel helpers (no store imports, so unit tests can load them under Node).
 */
export interface LiveChannel {
  kind: 'guide' | 'link';
  /** Guide number (1 upward), or null for a pasted link. */
  number: number | null;
  name: string;
  /** ^[A-Za-z0-9_-]{11}$ */
  videoId: string;
  /** Owner label for the info row and the still card. */
  owner: string;
  stateMedia: boolean;
  viaEmbed: boolean;
  /** "Watch on YouTube" target: the video page. */
  watchUrl: string;
}

export function watchUrlFor(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Entries shown through the broadcaster's own YouTube embed with permission pending (design-spec v2 1.4). */
export function isViaEmbed(channel: Pick<GuideChannel, 'name'>): boolean {
  return /^(DD |Sansad)/.test(channel.name);
}

export function liveChannelFromGuide(ch: GuideChannel): LiveChannel | null {
  if (ch.state !== 'live' || !ch.live) return null;
  return {
    kind: 'guide',
    number: ch.number,
    name: ch.name,
    videoId: ch.live.videoId,
    owner: ch.attribution.label,
    stateMedia: ch.stateMedia,
    viaEmbed: isViaEmbed(ch),
    watchUrl: watchUrlFor(ch.live.videoId),
  };
}

export function liveChannelFromLink(videoId: string): LiveChannel {
  return {
    kind: 'link',
    number: null,
    name: 'Your link',
    videoId,
    owner: 'Your link',
    stateMedia: false,
    viaEmbed: false,
    watchUrl: watchUrlFor(videoId),
  };
}

/**
 * The next (direction 1) or previous (-1) LIVE channel after `at`, wrapping. `at` is the current
 * guide number, or null for channel 0 / a pasted link (then next is the first live channel and
 * previous is the last). Off-air entries are skipped.
 */
export function nextLiveChannel(
  channels: GuideChannel[],
  at: number | null,
  direction: 1 | -1,
): GuideChannel | null {
  const live = channels.filter((c) => c.state === 'live' && c.live);
  if (live.length === 0) return null;
  if (at === null) return (direction === 1 ? live[0] : live[live.length - 1]) ?? null;
  if (direction === 1) return live.find((c) => c.number > at) ?? live[0] ?? null;
  return [...live].reverse().find((c) => c.number < at) ?? live[live.length - 1] ?? null;
}
