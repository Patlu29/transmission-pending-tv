/**
 * Guide resolver core: pure apart from the injected API. Owner: architect.
 * Strategy (ADR 0011 §3), cheapest first:
 *   1. re-validate the previous guide's video ids with videos.list (1 unit per 50 ids);
 *   2. for channels still without a usable stream, read the uploads playlist (1 unit each)
 *      and validate the newest ids (videos.list, batched);
 *   3. only then search.list eventType=live (100 units), capped per day.
 * A daily ledger (Pacific time, when YouTube resets quota) refuses calls over the cap.
 * Any API failure keeps the last good entry (stale) for up to 30 days.
 */
import type {
  ChannelGuide,
  GuideChannel,
  GuideLive,
  GuideSource,
  GuideSources,
} from '../../src/guide/schema.ts';
import { cleanTitle, parseGuide, VIDEO_ID_RE } from '../../src/guide/validate.ts';
import { ApiError, QUOTA_COST, type ApiVideo, type YouTubeApi } from './youtube.ts';

export interface Ledger {
  schemaVersion: 1;
  /** Pacific-time date (YYYY-MM-DD) the counters belong to. */
  day: string;
  units: number;
  searches: number;
}

export interface ResolveLimits {
  /** Units allowed per Pacific day (the project default quota is 10,000). */
  dailyUnitCap: number;
  /** search.list calls allowed per Pacific day. */
  dailySearchCap: number;
  /** Drop a kept (stale) entry once its checkedAt is older than this (YouTube data-refresh rule). */
  staleMaxDays: number;
}

export const DEFAULT_LIMITS: ResolveLimits = {
  dailyUnitCap: 8000,
  dailySearchCap: 40,
  staleMaxDays: 30,
};

export interface ResolveInput {
  sources: GuideSources;
  /** Previously published guide, or null. Untrusted: it is re-validated with parseGuide. */
  previous: unknown;
  ledger: Ledger | null;
  api: YouTubeApi;
  now: Date;
  release: string;
  limits?: Partial<ResolveLimits>;
}

export interface ResolveResult {
  guide: ChannelGuide;
  ledger: Ledger;
  /** Human-readable run log (no secrets). */
  log: string[];
  /** True if at least one API call failed or was refused by the ledger. */
  degraded: boolean;
}

export function pacificDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

class Budget {
  ledger: Ledger;
  private readonly limits: ResolveLimits;
  constructor(ledger: Ledger | null, now: Date, limits: ResolveLimits) {
    const day = pacificDay(now);
    this.ledger =
      ledger && ledger.schemaVersion === 1 && ledger.day === day
        ? { ...ledger }
        : { schemaVersion: 1, day, units: 0, searches: 0 };
    this.limits = limits;
  }
  /** Reserves quota before a call; false means the call must not be made. Failed calls still cost. */
  take(kind: keyof typeof QUOTA_COST): boolean {
    const cost = QUOTA_COST[kind];
    if (this.ledger.units + cost > this.limits.dailyUnitCap) return false;
    if (kind === 'searchLive' && this.ledger.searches >= this.limits.dailySearchCap) return false;
    this.ledger.units += cost;
    if (kind === 'searchLive') this.ledger.searches += 1;
    return true;
  }
}

type Usability = 'usable' | 'not-embeddable' | 'not-live';

function classify(v: ApiVideo, channelId: string): Usability {
  if (v.snippet?.channelId !== channelId) return 'not-live';
  if (v.snippet.liveBroadcastContent !== 'live') return 'not-live';
  if (v.liveStreamingDetails?.actualEndTime) return 'not-live';
  if (!v.liveStreamingDetails?.actualStartTime) return 'not-live';
  if (v.status?.privacyStatus !== 'public') return 'not-live';
  if (v.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') return 'not-embeddable';
  if (v.status.embeddable !== true) return 'not-embeddable';
  return 'usable';
}

/** Deterministic choice among several usable live streams of one channel. */
function choose(videos: ApiVideo[], preferTitle: string | undefined): ApiVideo | undefined {
  const re = preferTitle ? new RegExp(preferTitle, 'i') : null;
  const viewers = (v: ApiVideo) => Number(v.liveStreamingDetails?.concurrentViewers ?? 0) || 0;
  const start = (v: ApiVideo) =>
    Date.parse(v.liveStreamingDetails?.actualStartTime ?? '') || Infinity;
  return [...videos].sort((a, b) => {
    if (re) {
      const d = Number(re.test(b.snippet?.title ?? '')) - Number(re.test(a.snippet?.title ?? ''));
      if (d) return d;
    }
    return viewers(b) - viewers(a) || start(a) - start(b) || a.id.localeCompare(b.id);
  })[0];
}

interface Finding {
  usable: ApiVideo[];
  sawNotEmbeddable: boolean;
  /** False if a needed check could not be made (API failure or ledger refusal). */
  checked: boolean;
}

export async function resolveGuide(input: ResolveInput): Promise<ResolveResult> {
  const limits: ResolveLimits = { ...DEFAULT_LIMITS, ...input.limits };
  const budget = new Budget(input.ledger, input.now, limits);
  const log: string[] = [];
  const nowIso = input.now.toISOString();
  let degraded = false;
  let halted = false; // set after a quota or rate error: no further calls this run

  const enabled = input.sources.channels.filter((c) => c.enabled);
  const previous = parseGuide(input.previous);
  const prevByChannel = new Map<string, GuideChannel>(
    (previous?.channels ?? []).map((c) => [c.channelId, c]),
  );
  const findings = new Map<string, Finding>(
    enabled.map((c) => [c.channelId, { usable: [], sawNotEmbeddable: false, checked: true }]),
  );

  async function call<T>(kind: keyof typeof QUOTA_COST, run: () => Promise<T>): Promise<T | null> {
    if (halted) return null;
    if (!budget.take(kind)) {
      degraded = true;
      log.push(
        `ledger: ${kind} refused (units ${budget.ledger.units}, searches ${budget.ledger.searches})`,
      );
      return null;
    }
    try {
      return await run();
    } catch (error) {
      degraded = true;
      if (error instanceof ApiError) {
        log.push(error.message);
        if (error.exhausted || error.status === 403 || error.status === 400) halted = true;
      } else {
        log.push(`${kind}: ${error instanceof Error ? error.message : String(error)}`);
      }
      return null;
    }
  }

  /** Validates ids (batched 50) and records them against their channel. */
  async function validate(ids: Array<{ id: string; channelId: string }>): Promise<Set<string>> {
    const failedChannels = new Set<string>();
    const unique = [
      ...new Map(ids.filter((x) => VIDEO_ID_RE.test(x.id)).map((x) => [x.id, x])).values(),
    ];
    for (let i = 0; i < unique.length; i += 50) {
      const batch = unique.slice(i, i + 50);
      const videos = await call('videos', () => input.api.videos(batch.map((b) => b.id)));
      if (!videos) {
        batch.forEach((b) => failedChannels.add(b.channelId));
        continue;
      }
      const byId = new Map(videos.map((v) => [v.id, v]));
      for (const { id, channelId } of batch) {
        const v = byId.get(id);
        const f = findings.get(channelId);
        if (!v || !f) continue;
        const u = classify(v, channelId);
        if (u === 'usable' && !f.usable.some((x) => x.id === id)) f.usable.push(v);
        if (u === 'not-embeddable') f.sawNotEmbeddable = true;
      }
    }
    return failedChannels;
  }

  // 1. Re-validate previous ids.
  const cached = enabled.flatMap((c) => {
    const id = prevByChannel.get(c.channelId)?.live?.videoId;
    return id ? [{ id, channelId: c.channelId }] : [];
  });
  const failed1 = await validate(cached);
  failed1.forEach((ch) => (findings.get(ch)!.checked = false));

  // 2. Uploads playlist for channels with nothing usable yet.
  const need2 = enabled.filter(
    (c) => findings.get(c.channelId)!.usable.length === 0 && !failed1.has(c.channelId),
  );
  const fromUploads: Array<{ id: string; channelId: string }> = [];
  for (const c of need2) {
    const ids = await call('uploads', () => input.api.uploads(c.channelId));
    if (!ids) findings.get(c.channelId)!.checked = false;
    else fromUploads.push(...ids.map((id) => ({ id, channelId: c.channelId })));
  }
  const failed2 = await validate(fromUploads);
  failed2.forEach((ch) => (findings.get(ch)!.checked = false));

  // 3. search.list fallback, capped.
  const need3 = enabled.filter((c) => {
    const f = findings.get(c.channelId)!;
    return f.usable.length === 0 && f.checked;
  });
  const fromSearch: Array<{ id: string; channelId: string }> = [];
  for (const c of need3) {
    const ids = await call('searchLive', () => input.api.searchLive(c.channelId));
    if (!ids) findings.get(c.channelId)!.checked = false;
    else fromSearch.push(...ids.map((id) => ({ id, channelId: c.channelId })));
  }
  const failed3 = await validate(fromSearch);
  failed3.forEach((ch) => (findings.get(ch)!.checked = false));

  // Assemble.
  const staleLimitMs = limits.staleMaxDays * 86_400_000;
  const channels: GuideChannel[] = enabled
    .map((src: GuideSource): GuideChannel => {
      const f = findings.get(src.channelId)!;
      const base = {
        number: src.number,
        name: src.name,
        channelId: src.channelId,
        languages: src.languages,
        genre: src.genre,
        country: src.country,
        attribution: src.attribution,
        stateMedia: src.stateMedia === true,
      };
      const pick = choose(f.usable, src.preferTitle);
      if (pick) {
        const live: GuideLive = {
          videoId: pick.id,
          title: cleanTitle(pick.snippet?.title ?? src.name),
          checkedAt: nowIso,
        };
        return { ...base, state: 'live', live, stale: false };
      }
      if (f.checked) {
        return {
          ...base,
          state: f.sawNotEmbeddable ? 'not-embeddable' : 'off-air',
          live: null,
          stale: false,
        };
      }
      const prev = prevByChannel.get(src.channelId);
      if (prev?.live && input.now.getTime() - Date.parse(prev.live.checkedAt) <= staleLimitMs) {
        return { ...base, state: 'live', live: prev.live, stale: true };
      }
      return { ...base, state: 'unresolved', live: null, stale: false };
    })
    .sort((a, b) => a.number - b.number);

  const counts = channels.reduce<Record<string, number>>((acc, c) => {
    const k = c.stale ? 'live (stale)' : c.state;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  log.push(
    `resolved ${channels.length} channel(s): ${Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(
        ', ',
      )}; ledger ${budget.ledger.day} units ${budget.ledger.units}, searches ${budget.ledger.searches}`,
  );

  return {
    guide: { schemaVersion: 1, generatedAt: nowIso, release: input.release, channels },
    ledger: budget.ledger,
    log,
    degraded,
  };
}
