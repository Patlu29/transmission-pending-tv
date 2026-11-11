/**
 * Channel guide contract. Owner: architect. Types only (no runtime code), so the build-time
 * scripts in scripts/guide/ can import this file under Node's type stripping.
 * See docs/decisions/0011-environment-player.md §3.
 */

export type GuideSchemaVersion = 1;

/* ---------- Curated input: src/content/guide-sources.json (committed) ---------- */

export type Permission = 'not-required' | 'requested' | 'granted';
export type Confidence = 'high' | 'medium';

export interface GuideSource {
  /** Guide number, 1 upwards (0 is the Occupant and is never in the guide). */
  number: number;
  name: string;
  /** YouTube channel ID, ^UC[A-Za-z0-9_-]{22}$. */
  channelId: string;
  /** BCP 47 primary language subtags, for example ["hi", "en"]. */
  languages: string[];
  genre: string;
  /** ISO 3166-1 alpha-2 country of the broadcaster. */
  country: string;
  /** ISO 3166-1 alpha-2 countries where embedding was tested. */
  regionTested: string[];
  attribution: { label: string; url: string };
  /** Broadcaster terms, in addition to `GuideSources.youtubeTerms`. May be empty. */
  terms: string[];
  permission: Permission;
  confidence: Confidence;
  /** Date (YYYY-MM-DD) the entry was last checked by a person. */
  checked: string;
  enabled: boolean;
  /** True for state-controlled broadcasters; the guide shows a STATE MEDIA tag (design spec v2). Default false. */
  stateMedia?: boolean;
  /** Optional regex (case-insensitive) preferred when a channel runs several live streams. */
  preferTitle?: string;
  /** Free-text curation note; not published. */
  note?: string;
}

export interface GuideSources {
  schemaVersion: GuideSchemaVersion;
  /** Terms that apply to every entry (YouTube ToS, API terms, developer policies, RMF). */
  youtubeTerms: string[];
  channels: GuideSource[];
}

/* ---------- Published output: dist/guide.json (never committed) ---------- */

export type ChannelState = 'live' | 'off-air' | 'not-embeddable' | 'unresolved';

export interface GuideLive {
  /** ^[A-Za-z0-9_-]{11}$ */
  videoId: string;
  /** Plain text, at most 80 characters. */
  title: string;
  /** ISO 8601 time this video was last confirmed live and embeddable. */
  checkedAt: string;
}

export interface GuideChannel {
  number: number;
  name: string;
  channelId: string;
  languages: string[];
  genre: string;
  country: string;
  attribution: { label: string; url: string };
  /** Always present in output; false unless the source says true. */
  stateMedia: boolean;
  state: ChannelState;
  live: GuideLive | null;
  /** True when `live` was kept from an earlier run because this run could not check it. */
  stale: boolean;
}

export interface ChannelGuide {
  schemaVersion: GuideSchemaVersion;
  /** Wall-clock time of the resolver run. NOT a fact: never used by the intro or facts. */
  generatedAt: string;
  /** Release tag (or ref) the site was built from. */
  release: string;
  channels: GuideChannel[];
}
