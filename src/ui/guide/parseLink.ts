import { VIDEO_ID_RE } from '../../guide/validate.ts';

/**
 * Paste-a-link (design-spec v2 1.5, ADR 0011): single-video YouTube links only.
 * Accepts watch?v=, youtu.be/, /live/ID and /embed/ID on YouTube hosts. Everything else is rejected,
 * so no other site's URL ever reaches the player and the CSP stays tight. Pure; nothing is stored.
 */
export type LinkProblem = 'empty' | 'not-url' | 'host' | 'list' | 'no-id';

export type LinkResult = { ok: true; videoId: string } | { ok: false; problem: LinkProblem };

/** In-character messages, one per problem (design-spec v2 1.5). */
export const LINK_MESSAGES: Record<LinkProblem, string> = {
  empty: 'Paste a link first. The set cannot guess.',
  'not-url': 'That is not a link. Try one that starts with https://.',
  host: 'Only YouTube links work on this set.',
  list: 'That points to a channel or a list, not one live video. Paste the link of the video itself.',
  'no-id': 'No picture found in that link.',
};

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);

function toUrl(raw: string): URL | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // "hello" has no dot: that is text, not a link.
    return url.hostname.includes('.') ? url : null;
  } catch {
    return null;
  }
}

export function parseVideoLink(input: string): LinkResult {
  const raw = input.trim();
  if (raw === '') return { ok: false, problem: 'empty' };
  const url = toUrl(raw);
  if (!url) return { ok: false, problem: 'not-url' };

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase() ?? '';

  if (SHORT_HOSTS.has(host)) {
    const id = segments[0] ?? '';
    return VIDEO_ID_RE.test(id) ? { ok: true, videoId: id } : { ok: false, problem: 'no-id' };
  }
  if (!YOUTUBE_HOSTS.has(host)) return { ok: false, problem: 'host' };

  // Channel, handle, user, playlist and list forms are never a single video.
  if (
    first === 'playlist' ||
    first === 'channel' ||
    first === 'c' ||
    first === 'user' ||
    first.startsWith('@') ||
    (first === 'embed' && segments[1] === 'videoseries')
  ) {
    return { ok: false, problem: 'list' };
  }
  if (first === 'watch') {
    const id = url.searchParams.get('v') ?? '';
    if (id !== '')
      return VIDEO_ID_RE.test(id) ? { ok: true, videoId: id } : { ok: false, problem: 'no-id' };
    return { ok: false, problem: url.searchParams.has('list') ? 'list' : 'no-id' };
  }
  if (first === 'live' || first === 'embed') {
    const id = segments[1] ?? '';
    return VIDEO_ID_RE.test(id) ? { ok: true, videoId: id } : { ok: false, problem: 'no-id' };
  }
  // A channel's live page, such as /@name/live, was caught above (handle). Anything else has no video.
  return { ok: false, problem: 'no-id' };
}
