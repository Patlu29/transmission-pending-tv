import { create } from 'zustand';
import { parseGuide } from '@/guide/validate';
import type { ChannelGuide, GuideChannel } from '@/guide/schema';

/**
 * The channel guide. `guide.json` is fetched from this site's own origin, lazily, the first time
 * the guide (or a next-channel step) needs it, and validated with `parseGuide`, which drops
 * malformed entries. Local builds have no guide.json: in development a sample is built from
 * guide-sources.json; in production the state is 'unavailable' and paste-a-link still works.
 */
export type GuideStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

interface GuideState {
  status: GuideStatus;
  guide: ChannelGuide | null;
  /** True when the dev sample (not a resolved guide) is showing. */
  sample: boolean;
  load(): Promise<void>;
  /** Test and tooling hook: set a guide directly. */
  setGuide(guide: ChannelGuide | null, sample?: boolean): void;
}

export const GUIDE_URL = () => `${import.meta.env.BASE_URL}guide.json`;

let inflight: Promise<void> | null = null;

/** Development only: a guide from the committed sources, with a few channels marked live. */
async function devSample(): Promise<ChannelGuide | null> {
  if (!import.meta.env.DEV) return null;
  try {
    // A real resolved guide kept locally (gitignored, never in public/): served by the dev server from the project root.
    const local = await fetch(`${import.meta.env.BASE_URL}.guide-cache/guide.local.json`);
    if (local.ok && !(local.headers.get('content-type') ?? '').includes('text/html')) {
      const parsed = parseGuide(await local.json());
      if (parsed) return { ...parsed, release: `${parsed.release} (local guide)` };
    }
  } catch {
    /* fall through to the generated sample */
  }
  try {
    const mod = (await import('@/content/guide-sources.json')) as unknown as {
      default: { channels: Array<Record<string, unknown>> };
    };
    const now = new Date().toISOString();
    // Dev only: the first ten enabled channels are marked live with one placeholder id so the
    // layouts can be tried. Real ids come from the scheduled resolver. Playback will report an error.
    const channels = mod.default.channels
      .filter((c) => c.enabled === true)
      .map((c, i): GuideChannel => {
        const live = i < 10;
        return {
          number: c.number as number,
          name: c.name as string,
          channelId: c.channelId as string,
          languages: c.languages as string[],
          genre: c.genre as string,
          country: c.country as string,
          attribution: c.attribution as GuideChannel['attribution'],
          stateMedia: c.stateMedia === true,
          state: live ? 'live' : 'off-air',
          live: live
            ? { videoId: 'jfKfPfyJRdk', title: 'Development sample', checkedAt: now }
            : null,
          stale: false,
        };
      });
    return { schemaVersion: 1, generatedAt: now, release: 'dev-sample', channels };
  } catch {
    return null;
  }
}

export const useGuideStore = create<GuideState>()((set, get) => ({
  status: 'idle',
  guide: null,
  sample: false,
  setGuide: (guide, sample = false) =>
    set({ guide, sample, status: guide ? 'ready' : 'unavailable' }),
  load() {
    if (get().status === 'ready' || inflight) return inflight ?? Promise.resolve();
    set({ status: 'loading' });
    inflight = (async () => {
      try {
        const res = await fetch(GUIDE_URL(), { cache: 'no-cache' });
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok || type.includes('text/html')) throw new Error('no guide');
        const guide = parseGuide(await res.json());
        if (!guide) throw new Error('invalid guide');
        set({ guide, status: 'ready', sample: false });
      } catch {
        const sample = await devSample();
        if (sample)
          set({ guide: sample, status: 'ready', sample: sample.release === 'dev-sample' });
        else set({ guide: null, status: 'unavailable', sample: false });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },
}));
