import type { IntroPage, ResolvedIntro } from '../../facts/schema.ts';
import { wrappedHeight } from './wrap.ts';

/** One screenful of the intro: logical lines [start, end) of a page (sub-pages, design-spec 5.3). */
export interface PlaylistFrame {
  pageIndex: number;
  start: number;
  end: number;
  /** Characters in the frame; drives the hold time. */
  chars: number;
}

/** Cached per resolved intro object (identity), so tests with different facts never share results. */
const cache = new WeakMap<ResolvedIntro, Map<string, PlaylistFrame[]>>();

function packPage(
  page: IntroPage,
  pageIndex: number,
  cols: number,
  capacity: number,
): PlaylistFrame[] {
  const frames: PlaylistFrame[] = [];
  let start = 0;
  let used = 0;
  let chars = 0;
  page.lines.forEach((line, i) => {
    const h = Math.min(wrappedHeight(line, cols), capacity);
    const add = i === start ? h : h + 1; // one blank row between lines
    if (i > start && used + add > capacity) {
      frames.push({ pageIndex, start, end: i, chars });
      start = i;
      used = h;
      chars = 0;
    } else {
      used += add;
    }
    chars += line.text.length;
  });
  frames.push({ pageIndex, start, end: page.lines.length, chars });
  return frames;
}

export function buildPlaylist(
  intro: ResolvedIntro,
  cols: number,
  capacity: number,
): PlaylistFrame[] {
  const key = `${cols}x${capacity}`;
  let perIntro = cache.get(intro);
  if (!perIntro) cache.set(intro, (perIntro = new Map()));
  const hit = perIntro.get(key);
  if (hit) return hit;
  const frames = intro.pages.flatMap((page, i) => packPage(page, i, cols, capacity));
  perIntro.set(key, frames);
  return frames;
}

export function frameIndexAt(list: PlaylistFrame[], pageIndex: number, lineIndex: number): number {
  const i = list.findIndex(
    (f) => f.pageIndex === pageIndex && lineIndex >= f.start && lineIndex < f.end,
  );
  return i < 0 ? 0 : i;
}
