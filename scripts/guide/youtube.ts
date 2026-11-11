/**
 * Minimal YouTube Data API v3 client for the guide resolver. Owner: architect.
 * The API key is passed in by the caller (which reads it from the environment only) and is
 * never logged: error messages carry the endpoint and status, never the URL with the key.
 */

export interface ApiVideo {
  id: string;
  snippet?: { channelId?: string; title?: string; liveBroadcastContent?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
  contentDetails?: { contentRating?: { ytRating?: string } };
  liveStreamingDetails?: {
    actualStartTime?: string;
    actualEndTime?: string;
    concurrentViewers?: string;
  };
}

/** The three calls the resolver makes. Quota cost per call is in QUOTA_COST. */
export interface YouTubeApi {
  /** videos.list, at most 50 ids. */
  videos(ids: string[]): Promise<ApiVideo[]>;
  /** playlistItems.list on a channel's uploads playlist: newest video ids (at most 50). */
  uploads(channelId: string): Promise<string[]>;
  /** search.list with eventType=live for one channel: video ids. */
  searchLive(channelId: string): Promise<string[]>;
  /** channels.list forHandle, for curation only (never called by the resolver): channel id or null. */
  lookupHandle(handle: string): Promise<string | null>;
}

export const QUOTA_COST = { videos: 1, uploads: 1, searchLive: 100, lookupHandle: 1 } as const;

export class ApiError extends Error {
  override name = 'ApiError';
  readonly status: number;
  readonly reason: string;
  constructor(endpoint: string, status: number, reason: string) {
    super(`YouTube ${endpoint} failed: HTTP ${status}${reason ? ` (${reason})` : ''}`);
    this.status = status;
    this.reason = reason;
  }
  /** Quota or rate errors: stop calling for the rest of the run. */
  get exhausted(): boolean {
    return /quotaExceeded|dailyLimitExceeded|rateLimitExceeded/.test(this.reason);
  }
}

const BASE = 'https://www.googleapis.com/youtube/v3/';

export function createYouTubeApi(key: string, fetchImpl: typeof fetch = fetch): YouTubeApi {
  if (!key) throw new Error('YouTube API key is empty');

  async function get(endpoint: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(endpoint, BASE);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('key', key);
    let res: Response;
    try {
      res = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      throw new ApiError(endpoint, 0, error instanceof Error ? error.name : 'network');
    }
    if (!res.ok) {
      let reason = '';
      try {
        const body = (await res.json()) as { error?: { errors?: Array<{ reason?: string }> } };
        reason = body.error?.errors?.[0]?.reason ?? '';
      } catch {
        // body was not JSON; keep the status only
      }
      throw new ApiError(endpoint, res.status, reason);
    }
    return res.json();
  }

  return {
    async videos(ids) {
      if (ids.length === 0) return [];
      if (ids.length > 50) throw new Error('videos.list accepts at most 50 ids');
      const body = (await get('videos', {
        part: 'snippet,status,contentDetails,liveStreamingDetails',
        id: ids.join(','),
        maxResults: '50',
      })) as { items?: ApiVideo[] };
      return body.items ?? [];
    },
    async uploads(channelId) {
      const body = (await get('playlistItems', {
        part: 'contentDetails',
        playlistId: `UU${channelId.slice(2)}`,
        maxResults: '50',
      })) as { items?: Array<{ contentDetails?: { videoId?: string } }> };
      return (body.items ?? []).flatMap((i) =>
        i.contentDetails?.videoId ? [i.contentDetails.videoId] : [],
      );
    },
    async searchLive(channelId) {
      const body = (await get('search', {
        part: 'id',
        channelId,
        eventType: 'live',
        type: 'video',
        maxResults: '10',
      })) as { items?: Array<{ id?: { videoId?: string } }> };
      return (body.items ?? []).flatMap((i) => (i.id?.videoId ? [i.id.videoId] : []));
    },
    async lookupHandle(handle) {
      const body = (await get('channels', {
        part: 'id',
        forHandle: handle.startsWith('@') ? handle : `@${handle}`,
      })) as { items?: Array<{ id?: string }> };
      return body.items?.[0]?.id ?? null;
    },
  };
}
