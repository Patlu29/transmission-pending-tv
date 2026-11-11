// Owner: architect (v2 Phase 2), handed to qa-engineer. Guide resolver with the YouTube API mocked.
import { describe, expect, it } from 'vitest';
import type { GuideSources } from '../../src/guide/schema.ts';
import { parseGuide } from '../../src/guide/validate.ts';
import { pacificDay, resolveGuide, type Ledger } from '../../scripts/guide/resolve-core.ts';
import { ApiError, type ApiVideo, type YouTubeApi } from '../../scripts/guide/youtube.ts';

const A = 'UCKwucPzHZ7zCUIf7If-Wo1g';
const B = 'UCGDQNvybfDDeGTf4GtigXaw';
const NOW = new Date('2026-11-11T12:00:00Z');

const source = (number: number, channelId: string, extra: Record<string, unknown> = {}) => ({
  number,
  name: `Ch${number}`,
  channelId,
  languages: ['en'],
  genre: 'news',
  country: 'IN',
  regionTested: ['IN'],
  attribution: { label: `Ch${number}`, url: `https://www.youtube.com/channel/${channelId}` },
  terms: [],
  permission: 'not-required' as const,
  confidence: 'high' as const,
  checked: '2026-11-11',
  enabled: true,
  ...extra,
});
const sources = (...channels: ReturnType<typeof source>[]): GuideSources => ({
  schemaVersion: 1,
  youtubeTerms: ['https://www.youtube.com/t/terms'],
  channels,
});

const live = (id: string, channelId: string, extra: Partial<ApiVideo> = {}): ApiVideo => ({
  id,
  snippet: { channelId, title: `Live ${id}`, liveBroadcastContent: 'live' },
  status: { embeddable: true, privacyStatus: 'public' },
  contentDetails: {},
  liveStreamingDetails: { actualStartTime: '2026-11-01T00:00:00Z', concurrentViewers: '10' },
  ...extra,
});

/** A fake API over a fixed world: videos by id, uploads and search results by channel. */
function fakeApi(world: {
  videos?: ApiVideo[];
  uploads?: Record<string, string[]>;
  search?: Record<string, string[]>;
  fail?: Partial<Record<'videos' | 'uploads' | 'searchLive', ApiError>>;
}) {
  const calls: string[] = [];
  const api: YouTubeApi = {
    async videos(ids) {
      calls.push(`videos:${ids.length}`);
      if (world.fail?.videos) throw world.fail.videos;
      return (world.videos ?? []).filter((v) => ids.includes(v.id));
    },
    async uploads(ch) {
      calls.push(`uploads:${ch}`);
      if (world.fail?.uploads) throw world.fail.uploads;
      return world.uploads?.[ch] ?? [];
    },
    async searchLive(ch) {
      calls.push(`search:${ch}`);
      if (world.fail?.searchLive) throw world.fail.searchLive;
      return world.search?.[ch] ?? [];
    },
    async lookupHandle() {
      throw new Error('not used by the resolver');
    },
  };
  return { api, calls };
}

const previousWith = (
  videoId: string,
  channelId: string,
  checkedAt = '2026-11-11T11:30:00.000Z',
) => ({
  schemaVersion: 1,
  generatedAt: checkedAt,
  release: 'v2.0.0',
  channels: [
    {
      ...source(1, channelId),
      state: 'live',
      live: { videoId, title: 'Old', checkedAt },
      stale: false,
    },
  ],
});

const run = (over: Partial<Parameters<typeof resolveGuide>[0]> & { api: YouTubeApi }) =>
  resolveGuide({
    sources: sources(source(1, A)),
    previous: null,
    ledger: null,
    now: NOW,
    release: 'v2.0.0',
    ...over,
  });

describe('resolveGuide', () => {
  it('re-validates a cached live id for 1 unit and nothing else', async () => {
    const { api, calls } = fakeApi({ videos: [live('aaaaaaaaaaa', A)] });
    const r = await run({ api, previous: previousWith('aaaaaaaaaaa', A) });
    expect(calls).toEqual(['videos:1']);
    expect(r.guide.channels[0]).toMatchObject({
      state: 'live',
      stale: false,
      live: { videoId: 'aaaaaaaaaaa' },
    });
    expect(r.ledger.units).toBe(1);
  });

  it('rediscovers an ended stream from the uploads playlist before searching', async () => {
    const ended = live('aaaaaaaaaaa', A, {
      liveStreamingDetails: {
        actualStartTime: '2026-11-01T00:00:00Z',
        actualEndTime: '2026-11-11T11:00:00Z',
      },
    });
    const { api, calls } = fakeApi({
      videos: [ended, live('bbbbbbbbbbb', A)],
      uploads: { [A]: ['bbbbbbbbbbb'] },
    });
    const r = await run({ api, previous: previousWith('aaaaaaaaaaa', A) });
    expect(calls).toEqual(['videos:1', `uploads:${A}`, 'videos:1']);
    expect(r.guide.channels[0]?.live?.videoId).toBe('bbbbbbbbbbb');
    expect(r.ledger.searches).toBe(0);
  });

  it('falls back to search.list (100 units) only when uploads has nothing live', async () => {
    const { api, calls } = fakeApi({
      videos: [live('ccccccccccc', A)],
      search: { [A]: ['ccccccccccc'] },
    });
    const r = await run({ api });
    expect(calls).toEqual([`uploads:${A}`, `search:${A}`, 'videos:1']);
    expect(r.guide.channels[0]?.state).toBe('live');
    expect(r.ledger).toMatchObject({ units: 102, searches: 1 });
  });

  it('reports off-air when every check succeeds and nothing is live', async () => {
    const { api } = fakeApi({});
    const r = await run({ api });
    expect(r.guide.channels[0]).toMatchObject({ state: 'off-air', live: null, stale: false });
    expect(r.degraded).toBe(false);
  });

  it('reports not-embeddable when the only live stream cannot be embedded or is age-restricted', async () => {
    const blocked = live('ddddddddddd', A, {
      status: { embeddable: false, privacyStatus: 'public' },
    });
    const aged = live('eeeeeeeeeee', A, {
      contentDetails: { contentRating: { ytRating: 'ytAgeRestricted' } },
    });
    const { api } = fakeApi({
      videos: [blocked, aged],
      uploads: { [A]: ['ddddddddddd', 'eeeeeeeeeee'] },
    });
    const r = await run({ api });
    expect(r.guide.channels[0]?.state).toBe('not-embeddable');
  });

  it('ignores a live video that belongs to another channel', async () => {
    const { api } = fakeApi({
      videos: [live('fffffffffff', B)],
      uploads: { [A]: ['fffffffffff'] },
    });
    const r = await run({ api });
    expect(r.guide.channels[0]?.state).toBe('off-air');
  });

  it('chooses among several live streams by preferTitle, then most viewers', async () => {
    const one = live('ggggggggggg', A, {
      snippet: { channelId: A, title: 'Sansad TV 1', liveBroadcastContent: 'live' },
    });
    const two = live('hhhhhhhhhhh', A, {
      snippet: { channelId: A, title: 'Sansad TV 2', liveBroadcastContent: 'live' },
      liveStreamingDetails: { actualStartTime: '2026-11-01T00:00:00Z', concurrentViewers: '999' },
    });
    const world = { videos: [one, two], uploads: { [A]: ['ggggggggggg', 'hhhhhhhhhhh'] } };
    const byViewers = await run({ api: fakeApi(world).api });
    expect(byViewers.guide.channels[0]?.live?.videoId).toBe('hhhhhhhhhhh');
    const byTitle = await run({
      api: fakeApi(world).api,
      sources: sources(source(1, A, { preferTitle: 'TV 1$' })),
    });
    expect(byTitle.guide.channels[0]?.live?.videoId).toBe('ggggggggggg');
  });

  it('keeps the last good entry as stale when the API fails, and stops calling after a quota error', async () => {
    const quota = new ApiError('videos', 403, 'quotaExceeded');
    const { api, calls } = fakeApi({ fail: { videos: quota } });
    const r = await run({ api, previous: previousWith('aaaaaaaaaaa', A) });
    expect(calls).toEqual(['videos:1']);
    expect(r.guide.channels[0]).toMatchObject({
      state: 'live',
      stale: true,
      live: { videoId: 'aaaaaaaaaaa' },
    });
    expect(r.degraded).toBe(true);
  });

  it('drops a stale entry older than 30 days (unresolved)', async () => {
    const { api } = fakeApi({
      fail: {
        videos: new ApiError('videos', 500, 'backendError'),
        uploads: new ApiError('playlistItems', 500, ''),
      },
    });
    const r = await run({
      api,
      previous: previousWith('aaaaaaaaaaa', A, '2026-10-01T00:00:00.000Z'),
    });
    expect(r.guide.channels[0]).toMatchObject({ state: 'unresolved', live: null });
  });

  it('respects the daily unit cap and the search cap from the ledger', async () => {
    const day = pacificDay(NOW);
    const nearlyFull: Ledger = { schemaVersion: 1, day, units: 7950, searches: 0 };
    const { api, calls } = fakeApi({});
    const r = await run({ api, ledger: nearlyFull });
    expect(calls).toEqual([`uploads:${A}`]); // the 100-unit search would cross 8,000
    expect(r.ledger.units).toBe(7951);
    expect(r.guide.channels[0]?.state).toBe('unresolved');

    const searchesUsed: Ledger = { schemaVersion: 1, day, units: 0, searches: 40 };
    const second = fakeApi({});
    await run({ api: second.api, ledger: searchesUsed });
    expect(second.calls).toEqual([`uploads:${A}`]);
  });

  it('starts a fresh ledger on a new Pacific day', async () => {
    const old: Ledger = { schemaVersion: 1, day: '2026-11-09', units: 7999, searches: 40 };
    const { api } = fakeApi({});
    const r = await run({ api, ledger: old });
    expect(r.ledger.day).toBe(pacificDay(NOW));
    expect(r.ledger.units).toBe(101);
  });

  it('batches validation in groups of 50 and publishes only enabled channels', async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `v${String(i).padStart(10, '0')}`);
    const { api, calls } = fakeApi({ uploads: { [A]: ids } });
    const r = await run({ api, sources: sources(source(1, A), source(2, B, { enabled: false })) });
    expect(calls.filter((c) => c.startsWith('videos'))).toEqual(['videos:50', 'videos:10']);
    expect(r.guide.channels.map((c) => c.number)).toEqual([1]);
  });

  it('produces output that passes the browser validator and contains no key-like data', async () => {
    const { api } = fakeApi({
      videos: [
        live('aaaaaaaaaaa', A, {
          snippet: { channelId: A, title: 'Bad\u0007 title', liveBroadcastContent: 'live' },
        }),
      ],
    });
    const r = await run({ api, previous: previousWith('aaaaaaaaaaa', A) });
    const parsed = parseGuide(JSON.parse(JSON.stringify(r.guide)));
    expect(parsed?.channels).toHaveLength(1);
    expect(parsed?.channels[0]?.live?.title).toBe('Bad title');
    expect(JSON.stringify(r)).not.toMatch(/key=|AIza/);
  });
});
