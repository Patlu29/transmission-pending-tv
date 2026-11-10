import type { CommitRef } from '../../facts/schema.ts';
import { wrapRanges } from './wrap.ts';

/** Diary pages (design-spec 5.4): P100 is the index, P101 onward are commit pages, capped at 899. */
export const INDEX_PAGE = 100;
export const FIRST_COMMIT_PAGE = 101;
export const MAX_PAGE = 899;
export const ENTRY_INDENT = 4;

export type DiaryView = { kind: 'index'; sub: number } | { kind: 'commit'; index: number };

export interface DiarySub {
  start: number;
  end: number;
}

export interface DiaryLayout {
  subs: DiarySub[];
  /** Commits that get a page (capped so page numbers stay at or below 899). */
  entryCount: number;
}

export function entrySubjectRows(subject: string, cols: number): string[] {
  const width = Math.max(4, cols - ENTRY_INDENT);
  return wrapRanges(subject, width).map(([a, b]) => subject.slice(a, b));
}

const cache = new Map<string, DiaryLayout>();

export function layoutDiary(commits: CommitRef[], cols: number, capacity: number): DiaryLayout {
  const entryCount = Math.min(commits.length, MAX_PAGE - FIRST_COMMIT_PAGE + 1);
  const key = `${commits.length}|${commits[commits.length - 1]?.hash ?? ''}|${cols}x${capacity}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const subs: DiarySub[] = [];
  let start = 0;
  let used = 0;
  for (let i = 0; i < entryCount; i++) {
    const c = commits[i];
    const h = Math.min(c ? entrySubjectRows(c.subject, cols).length : 1, capacity);
    if (i > start && used + h > capacity) {
      subs.push({ start, end: i });
      start = i;
      used = 0;
    }
    used += h;
  }
  subs.push({ start, end: entryCount });
  const layout = { subs, entryCount };
  cache.set(key, layout);
  return layout;
}

export function pageNumberOf(view: DiaryView): number {
  return view.kind === 'index' ? INDEX_PAGE : FIRST_COMMIT_PAGE + view.index;
}

export function subContaining(layout: DiaryLayout, entry: number): number {
  const i = layout.subs.findIndex((s) => entry >= s.start && entry < s.end);
  return i < 0 ? 0 : i;
}

/** Resolves a typed page number; null when it does not exist. */
export function viewForPage(page: number, layout: DiaryLayout): DiaryView | null {
  if (page === INDEX_PAGE) return { kind: 'index', sub: 0 };
  const index = page - FIRST_COMMIT_PAGE;
  if (index >= 0 && index < layout.entryCount) return { kind: 'commit', index };
  return null;
}

export function nextView(view: DiaryView, layout: DiaryLayout): DiaryView {
  if (view.kind === 'index') {
    return view.sub + 1 < layout.subs.length
      ? { kind: 'index', sub: view.sub + 1 }
      : layout.entryCount > 0
        ? { kind: 'commit', index: 0 }
        : view;
  }
  return view.index + 1 < layout.entryCount ? { kind: 'commit', index: view.index + 1 } : view;
}

export function prevView(view: DiaryView, layout: DiaryLayout): DiaryView {
  if (view.kind === 'index') return view.sub > 0 ? { kind: 'index', sub: view.sub - 1 } : view;
  return view.index > 0
    ? { kind: 'commit', index: view.index - 1 }
    : { kind: 'index', sub: layout.subs.length - 1 };
}
