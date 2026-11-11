// Owner: architect (v2 Phase 2), handed to qa-engineer. Browser-side guide validator, ADR 0011 §3.
import { describe, expect, it } from 'vitest';
import { cleanTitle, parseGuide } from '../../src/guide/validate.ts';

const channel = (over: Record<string, unknown> = {}) => ({
  number: 1,
  name: 'DD News',
  channelId: 'UCKwucPzHZ7zCUIf7If-Wo1g',
  languages: ['hi', 'en'],
  genre: 'news',
  country: 'IN',
  attribution: {
    label: 'DD News on YouTube',
    url: 'https://www.youtube.com/channel/UCKwucPzHZ7zCUIf7If-Wo1g',
  },
  state: 'live',
  live: { videoId: 'abcdefghijk', title: 'Live', checkedAt: '2026-11-11T00:00:00.000Z' },
  stale: false,
  ...over,
});
const guide = (channels: unknown[]) => ({
  schemaVersion: 1,
  generatedAt: '2026-11-11T00:00:00.000Z',
  release: 'v2.0.0',
  channels,
});

describe('parseGuide', () => {
  it('accepts a valid guide', () => {
    expect(parseGuide(guide([channel()]))?.channels).toHaveLength(1);
  });
  it.each([null, 'x', { schemaVersion: 2 }, { ...guide([]), generatedAt: 'nope' }])(
    'rejects an unusable envelope (%j)',
    (input) => {
      expect(parseGuide(input)).toBeNull();
    },
  );
  it.each([
    [
      'a bad video id',
      { live: { videoId: 'x"><script>', title: 't', checkedAt: '2026-11-11T00:00:00Z' } },
    ],
    ['a bad channel id', { channelId: 'UC123' }],
    ['state live without a video', { live: null }],
    ['a video on an off-air channel', { state: 'off-air' }],
    ['a javascript: attribution url', { attribution: { label: 'x', url: 'javascript:alert(1)' } }],
    ['an unknown state', { state: 'maybe' }],
  ])('drops a channel with %s', (_label, over) => {
    expect(parseGuide(guide([channel(over)]))?.channels).toEqual([]);
  });
  it('keeps the first of duplicate numbers and sorts by number', () => {
    const g = parseGuide(
      guide([
        channel({ number: 3 }),
        channel({ number: 2, name: 'A' }),
        channel({ number: 2, name: 'B' }),
      ]),
    );
    expect(g?.channels.map((c) => [c.number, c.name])).toEqual([
      [2, 'A'],
      [3, 'DD News'],
    ]);
  });
  it('cleans titles: control characters removed and length capped at 80', () => {
    expect(cleanTitle('a\u0000b\n  c')).toBe('a b c');
    expect(cleanTitle('x'.repeat(200))).toHaveLength(80);
  });
});
