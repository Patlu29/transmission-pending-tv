/**
 * Runtime validators for the channel guide. Owner: architect.
 * Pure, no runtime imports: used by the browser (parseGuide) and by scripts/guide/ (Node).
 */
import type {
  ChannelGuide,
  ChannelState,
  GuideChannel,
  GuideLive,
  GuideSource,
  GuideSources,
} from './schema.ts';

export const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const TITLE_MAX = 80;

const STATES: readonly ChannelState[] = ['live', 'off-air', 'not-embeddable', 'unresolved'];
const LANG_RE = /^[a-z]{2,3}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = 200): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isStrArr = (v: unknown, re?: RegExp): v is string[] =>
  Array.isArray(v) && v.every((s) => isStr(s) && (!re || re.test(s)));
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Only https URLs on a host, no credentials. */
export function isSafeHttpsUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 300) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.username === '' && u.password === '' && u.hostname !== '';
  } catch {
    return false;
  }
}

/** Plain text for display: control characters removed, whitespace collapsed, capped. */
export function cleanTitle(raw: string): string {
  const text = raw
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= TITLE_MAX ? text : `${text.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

/* ---------- Browser side: published guide.json ---------- */

function parseLive(v: unknown): GuideLive | null | undefined {
  if (v === null) return null;
  if (!isObj(v)) return undefined;
  if (typeof v.videoId !== 'string' || !VIDEO_ID_RE.test(v.videoId)) return undefined;
  if (typeof v.title !== 'string' || !isIso(v.checkedAt)) return undefined;
  return { videoId: v.videoId, title: cleanTitle(v.title), checkedAt: v.checkedAt };
}

function parseChannel(v: unknown): GuideChannel | undefined {
  if (!isObj(v)) return undefined;
  const { number, name, channelId, languages, genre, country, attribution, state, stale } = v;
  // Older guides predate stateMedia: missing means false; any other non-boolean is malformed.
  const stateMedia = v.stateMedia === undefined ? false : v.stateMedia;
  if (typeof stateMedia !== 'boolean') return;
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1 || number > 999) return;
  if (!isStr(name, 80) || typeof channelId !== 'string' || !CHANNEL_ID_RE.test(channelId)) return;
  if (!isStrArr(languages, LANG_RE) || !isStr(genre, 40)) return;
  if (typeof country !== 'string' || !COUNTRY_RE.test(country)) return;
  if (!isObj(attribution) || !isStr(attribution.label, 80) || !isSafeHttpsUrl(attribution.url))
    return;
  if (!STATES.includes(state as ChannelState) || typeof stale !== 'boolean') return;
  const live = parseLive(v.live);
  if (live === undefined) return;
  if ((state === 'live') !== (live !== null)) return;
  return {
    number,
    name: cleanTitle(name),
    channelId,
    languages: [...languages],
    genre,
    country,
    attribution: { label: cleanTitle(attribution.label), url: attribution.url },
    stateMedia,
    state: state as ChannelState,
    live,
    stale,
  };
}

/**
 * Parses a fetched guide. Returns null if the envelope is unusable; otherwise keeps only the
 * channels that pass every check (malformed entries are dropped, duplicates keep the first).
 */
export function parseGuide(input: unknown): ChannelGuide | null {
  if (!isObj(input) || input.schemaVersion !== 1) return null;
  if (!isIso(input.generatedAt) || !isStr(input.release, 100) || !Array.isArray(input.channels)) {
    return null;
  }
  const seen = new Set<number>();
  const channels: GuideChannel[] = [];
  for (const raw of input.channels) {
    const ch = parseChannel(raw);
    if (!ch || seen.has(ch.number)) continue;
    seen.add(ch.number);
    channels.push(ch);
  }
  channels.sort((a, b) => a.number - b.number);
  return { schemaVersion: 1, generatedAt: input.generatedAt, release: input.release, channels };
}

/* ---------- Build side: committed guide-sources.json ---------- */

export interface SourcesReport {
  errors: string[];
  warnings: string[];
}

/** Validates the curated list. `today` is YYYY-MM-DD; age is only ever a warning. */
export function validateGuideSources(
  input: unknown,
  options: { today: string; maxAgeDays?: number },
): SourcesReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxAge = options.maxAgeDays ?? 90;
  if (!isObj(input)) return { errors: ['guide sources must be a JSON object'], warnings };
  if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!Array.isArray(input.youtubeTerms) || input.youtubeTerms.length === 0) {
    errors.push('youtubeTerms must list at least one https URL');
  } else {
    input.youtubeTerms.forEach((u, i) => {
      if (!isSafeHttpsUrl(u)) errors.push(`youtubeTerms[${i}] is not an https URL`);
    });
  }
  if (!Array.isArray(input.channels) || input.channels.length === 0) {
    errors.push('channels must be a non-empty array');
    return { errors, warnings };
  }

  const numbers = new Set<number>();
  const ids = new Set<string>();
  input.channels.forEach((raw, i) => {
    const at = `channels[${i}]`;
    if (!isObj(raw)) {
      errors.push(`${at} is not an object`);
      return;
    }
    const c = raw as Partial<GuideSource> & Obj;
    const name = typeof c.name === 'string' ? `${at} (${c.name})` : at;
    if (
      typeof c.number !== 'number' ||
      !Number.isInteger(c.number) ||
      c.number < 1 ||
      c.number > 999
    )
      errors.push(`${name}: number must be an integer from 1 to 999 (0 is the Occupant)`);
    else if (numbers.has(c.number)) errors.push(`${name}: duplicate number ${c.number}`);
    else numbers.add(c.number);
    if (!isStr(c.name, 80)) errors.push(`${at}: name is required (at most 80 characters)`);
    if (typeof c.channelId !== 'string' || !CHANNEL_ID_RE.test(c.channelId))
      errors.push(`${name}: channelId must match ${CHANNEL_ID_RE}`);
    else if (ids.has(c.channelId)) errors.push(`${name}: duplicate channelId ${c.channelId}`);
    else ids.add(c.channelId);
    if (!isStrArr(c.languages, LANG_RE) || c.languages.length === 0)
      errors.push(`${name}: languages must be lower-case language subtags`);
    if (!isStr(c.genre, 40)) errors.push(`${name}: genre is required`);
    if (typeof c.country !== 'string' || !COUNTRY_RE.test(c.country))
      errors.push(`${name}: country must be an ISO 3166-1 alpha-2 code`);
    if (!isStrArr(c.regionTested, COUNTRY_RE) || c.regionTested.length === 0)
      errors.push(`${name}: regionTested must list ISO country codes`);
    if (
      !isObj(c.attribution) ||
      !isStr(c.attribution.label, 80) ||
      !isSafeHttpsUrl(c.attribution.url)
    )
      errors.push(`${name}: attribution needs a label and an https url`);
    if (!Array.isArray(c.terms) || !c.terms.every(isSafeHttpsUrl))
      errors.push(`${name}: terms must be a list of https URLs (may be empty)`);
    if (!['not-required', 'requested', 'granted'].includes(c.permission as string))
      errors.push(`${name}: permission must be not-required, requested or granted`);
    if (c.confidence !== 'high' && c.confidence !== 'medium')
      errors.push(
        `${name}: confidence must be high or medium (low-confidence sources are excluded)`,
      );
    if (typeof c.enabled !== 'boolean') errors.push(`${name}: enabled must be true or false`);
    if (c.stateMedia !== undefined && typeof c.stateMedia !== 'boolean')
      errors.push(`${name}: stateMedia must be true or false when present`);
    if (c.preferTitle !== undefined) {
      try {
        new RegExp(String(c.preferTitle), 'i');
      } catch {
        errors.push(`${name}: preferTitle is not a valid regular expression`);
      }
    }
    if (
      typeof c.checked !== 'string' ||
      !DATE_RE.test(c.checked) ||
      Number.isNaN(Date.parse(c.checked))
    ) {
      errors.push(`${name}: checked must be a YYYY-MM-DD date`);
    } else {
      const ageDays = (Date.parse(options.today) - Date.parse(c.checked)) / 86_400_000;
      if (ageDays < 0) errors.push(`${name}: checked date ${c.checked} is in the future`);
      else if (ageDays > maxAge)
        warnings.push(`${name}: last checked ${c.checked}, more than ${maxAge} days ago`);
    }
  });

  if (input.channels.length > 0 && !input.channels.some((c) => isObj(c) && c.enabled === true)) {
    warnings.push('no channel is enabled');
  }
  return { errors, warnings };
}

/** Narrowing helper once validateGuideSources reported no errors. */
export function asGuideSources(input: unknown): GuideSources {
  return input as GuideSources;
}
