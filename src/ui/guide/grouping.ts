import type { GuideChannel } from '@/guide/schema';
import { isViaEmbed } from '@/state/channelStore';

/** Full language words for the guide (design-spec v2 1.4: "Hindi", not a code). */
const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'Arabic',
  bn: 'Bengali',
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  gu: 'Gujarati',
  hi: 'Hindi',
  ja: 'Japanese',
  kn: 'Kannada',
  ko: 'Korean',
  ml: 'Malayalam',
  mr: 'Marathi',
  pa: 'Punjabi',
  ta: 'Tamil',
  te: 'Telugu',
  tr: 'Turkish',
  ur: 'Urdu',
  zh: 'Chinese',
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code.toUpperCase();
}

let regionNames: Intl.DisplayNames | null | undefined;
export function countryName(code: string): string {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en-AU'], { type: 'region' });
    } catch {
      regionNames = null;
    }
  }
  return regionNames?.of(code) ?? code;
}

/** Group headings in display order (design-spec v2 1.4). */
export const GROUP_ORDER = [
  'Public service',
  'Parliament',
  'News: Hindi',
  'News: English',
  'News: other languages',
  'Business',
  'Regional',
  'International news',
  'Science',
  'More channels',
] as const;
export type GroupName = (typeof GROUP_ORDER)[number];

export function groupOf(ch: GuideChannel): GroupName {
  if (ch.genre === 'parliament') return 'Parliament';
  if (ch.genre === 'science') return 'Science';
  if (ch.genre === 'business') return 'Business';
  if (isViaEmbed(ch)) return 'Public service';
  if (ch.genre === 'news') {
    if (ch.country !== 'IN') return 'International news';
    const lang = ch.languages[0];
    if (lang === 'hi') return 'News: Hindi';
    if (lang === 'en') return 'News: English';
    return 'Regional';
  }
  return ch.country === 'IN' ? 'More channels' : 'International news';
}

export interface ChannelGroup {
  name: GroupName;
  channels: GuideChannel[];
}

export function groupChannels(channels: GuideChannel[]): ChannelGroup[] {
  const map = new Map<GroupName, GuideChannel[]>();
  for (const ch of channels) {
    const g = groupOf(ch);
    const list = map.get(g) ?? [];
    list.push(ch);
    map.set(g, list);
  }
  return GROUP_ORDER.filter((g) => map.has(g)).map((name) => ({
    name,
    channels: (map.get(name) ?? []).sort((a, b) => a.number - b.number),
  }));
}

export interface GuideFilters {
  language: string;
  genre: string;
  country: string;
  owner: 'all' | 'state-media' | 'other';
  find: string;
}

export const NO_FILTERS: GuideFilters = {
  language: 'all',
  genre: 'all',
  country: 'all',
  owner: 'all',
  find: '',
};

/** Filters change the list only; they never change numbering. */
export function applyFilters(channels: GuideChannel[], f: GuideFilters): GuideChannel[] {
  const find = f.find.trim().toLowerCase();
  return channels.filter(
    (c) =>
      (f.language === 'all' || c.languages.includes(f.language)) &&
      (f.genre === 'all' || c.genre === f.genre) &&
      (f.country === 'all' || c.country === f.country) &&
      (f.owner === 'all' || (f.owner === 'state-media') === c.stateMedia) &&
      (find === '' || c.name.toLowerCase().includes(find)),
  );
}

/** Reason in words for an entry that cannot be started (design-spec v2 1.4). */
export function offAirReason(ch: GuideChannel): string {
  return ch.state === 'not-embeddable'
    ? 'The owner does not allow embedding.'
    : 'No live programme now.';
}
