import type { Facts, ResolvedIntro } from '../../facts/schema.ts';
import {
  ENTRY_INDENT,
  FIRST_COMMIT_PAGE,
  entrySubjectRows,
  layoutDiary,
  pageNumberOf,
  type DiaryView,
} from './diary.ts';
import { contentRows, type GridSpec } from './grid.ts';
import { buildPlaylist, frameIndexAt } from './playlist.ts';
import { bleedsAt, hashSeed, isActive, rewriteText, type FxInput } from './effects.ts';
import { flattenLine, wrapRanges } from './wrap.ts';

/**
 * The frame model: what the screen shows, as rows of styled text runs on the
 * teletext grid. Pure. The canvas rasteriser and the 2D DOM screen both render
 * it, so the two cannot disagree.
 */
export type RunKind =
  | 'copy'
  | 'strong'
  | 'fact'
  | 'header'
  | 'hilite'
  | 'cursor'
  | 'fast1'
  | 'fast2'
  | 'fast3'
  | 'fast4';

export interface Run {
  col: number;
  text: string;
  kind: RunKind;
}

export type DockKey = 'skip' | 'pause' | 'next' | 'prev' | 'index' | 'replay' | 'text';
export type TapAction = { type: 'commit'; index: number } | { type: 'key'; key: DockKey };

/** Tappable box in grid cells (rows and columns). */
export interface Hit {
  row: number;
  rows: number;
  col: number;
  cols: number;
  action: TapAction;
}

/** Motion data for tremble and bleed (rewrite is already applied to the run text). */
export type FrameFx =
  | { kind: 'tremble'; rows: number[]; seed: number; elapsedMs: number; durMs: number; amp: number }
  | {
      kind: 'bleed';
      streaks: Array<{ row: number; col: number }>;
      elapsedMs: number;
      durMs: number;
    };

export interface Frame {
  /** Identity of the screen (page, sub-page, diary view). A change is a cut, which the screens cross-fade. */
  id: string;
  mode: 'dark' | 'card' | 'page';
  cols: number;
  rows: number;
  runs: Run[][];
  hits: Hit[];
  /** Test card state (mode 'card'): sub-caption, loading percent (or null) and whether it is dimmed. */
  card: { sub: string; loadingPercent: number | null; dim: boolean } | null;
  /** Running tremble or bleed, or null. */
  fx: FrameFx | null;
  /** Opacity of the display's own chrome (header and fastext chips): the `glitch` cue dips it, 1 otherwise. */
  chromeAlpha: number;
}

/** Same union as introStore's IntroStatus (kept local so the frame model has no store dependency). */
export type FrameStatus = 'off' | 'loading' | 'ready' | 'warming' | 'playing' | 'ended';

export interface FrameInput {
  status: FrameStatus;
  blank: boolean;
  paused: boolean;
  pageIndex: number;
  lineIndex: number;
  revealedChars: number;
  diary: DiaryView;
  diaryCursor: number;
  pageEntry: string;
  noSuchPage: boolean;
  loadProgress: number;
  assetFailed: boolean;
  reducedMotion: boolean;
  /** Chrome opacity from the `glitch` cue (0.55 to 1); omitted means 1. Never changes the text. */
  chromeAlpha?: number;
  /** The running haunted-text effect, if any. Ignored under reduced motion. */
  fx?: FxInput | null;
}

export interface FrameData {
  intro: ResolvedIntro;
  facts: Facts;
}

const pageTitle = (id: string) => id.replace(/-/g, ' ').toUpperCase();

function emptyRows(grid: GridSpec): Run[][] {
  return Array.from({ length: grid.rows }, () => []);
}

function put(frame: Frame, row: number, col: number, text: string, kind: RunKind) {
  const r = frame.runs[row];
  if (!r || col >= frame.cols || text === '') return;
  r.push({ col, text: text.slice(0, frame.cols - col), kind });
}

function pad(text: string, width: number, align: 'left' | 'center' = 'left'): string {
  const t = text.slice(0, width);
  if (align === 'left') return t.padEnd(width);
  const left = Math.floor((width - t.length) / 2);
  return ' '.repeat(left) + t + ' '.repeat(width - t.length - left);
}

function header(frame: Frame, tag: string, data: FrameData) {
  if (frame.cols <= 20) return; // hidden in the 20-column band (design-spec 5.3)
  const rev = `REV ${data.facts.source.revision}`.toUpperCase();
  const gap = Math.max(1, frame.cols - tag.length - rev.length);
  put(frame, 0, 0, pad(tag + ' '.repeat(gap) + rev, frame.cols), 'header');
}

function fastext(frame: Frame, labels: Array<[string, DockKey | null]>) {
  const row = frame.rows - 1;
  const cell = Math.floor(frame.cols / 4);
  const kinds: RunKind[] = ['fast1', 'fast2', 'fast3', 'fast4'];
  labels.forEach(([label, key], i) => {
    const col = i * cell;
    const width = i === 3 ? frame.cols - col : cell;
    put(frame, row, col, pad(label, width, 'center'), kinds[i] ?? 'fast1');
    if (key && label)
      frame.hits.push({ row, rows: 1, col, cols: width, action: { type: 'key', key } });
  });
}

function blank(grid: GridSpec, mode: Frame['mode'], card: Frame['card'] = null): Frame {
  return {
    id: mode,
    mode,
    cols: grid.cols,
    rows: grid.rows,
    runs: emptyRows(grid),
    hits: [],
    card,
    fx: null,
    chromeAlpha: 1,
  };
}

function titleRow(frame: Frame, input: FrameInput, title: string, right?: string) {
  if (input.noSuchPage) {
    put(frame, 1, 0, 'NO SUCH PAGE', 'strong');
    return;
  }
  put(frame, 1, 0, title, 'strong');
  if (right && title.length + 1 + right.length <= frame.cols) {
    put(frame, 1, frame.cols - right.length, right, 'copy');
  }
}

function introFrame(input: FrameInput, grid: GridSpec, data: FrameData): Frame {
  const frame = blank(grid, 'page');
  const list = buildPlaylist(data.intro, grid.cols, contentRows(grid));
  const fi = frameIndexAt(list, input.pageIndex, input.lineIndex);
  const pf = list[fi];
  const page = data.intro.pages[pf?.pageIndex ?? 0];
  if (!pf || !page) return frame;

  frame.id = `intro:${pf.pageIndex}:${pf.start}`;
  header(frame, `INTRO ${pf.pageIndex + 1}/${data.intro.pages.length}`, data);
  titleRow(frame, input, pageTitle(page.id));

  const lastRow = grid.rows - 2;
  let row = 2;
  const fx = isActive(input.fx) && !input.reducedMotion ? input.fx : null;
  let fxRows: Array<{ row: number; a: number; b: number }> | null = null;
  const cur: { at: { row: number; col: number } | null } = { at: null };
  for (let li = pf.start; li < pf.end && li <= input.lineIndex; li++) {
    const line = page.lines[li];
    if (!line) break;
    if (li > pf.start) row += 1;
    const flat = flattenLine(line);
    const fxHere = fx && fx.lineId === line.id ? fx : null;
    const rewritten =
      fxHere &&
      fxHere.kind === 'rewrite' &&
      (li !== input.lineIndex || input.revealedChars >= flat.text.length)
        ? rewriteText(flat.text, flat.fact, fxHere)
        : null;
    const text = rewritten ? rewritten.text : flat.text;
    const shown =
      li === input.lineIndex ? Math.min(input.revealedChars, flat.text.length) : flat.text.length;
    const ranges = wrapRanges(flat.text, grid.cols);
    if (fxHere) fxRows = ranges.map(([a, b], ri) => ({ row: row + ri, a, b }));
    ranges.forEach(([a, b], ri) => {
      const r = row + ri;
      if (r > lastRow) return;
      const end = Math.min(b, shown);
      // Group the revealed characters into copy and fact runs.
      let i = a;
      while (i < end) {
        const kindAt = (n: number): RunKind =>
          flat.fact[n] === true ? 'fact' : rewritten?.replaced[n] ? 'strong' : 'copy';
        const kind = kindAt(i);
        let j = i;
        while (j < end && kindAt(j) === kind) j++;
        put(frame, r, i - a, text.slice(i, j), kind);
        i = j;
      }
      const isCursorRow = shown >= a && (shown < b || ri === ranges.length - 1);
      if (!cur.at && li === input.lineIndex && isCursorRow && shown < flat.text.length) {
        cur.at = { row: r, col: shown - a };
      }
    });
    row += ranges.length;
  }
  if (fx && fxRows) {
    const lineRows = fxRows;
    if (fx.kind === 'tremble') {
      frame.fx = {
        kind: 'tremble',
        rows: lineRows.map((r) => r.row),
        seed: hashSeed(fx.lineId),
        elapsedMs: fx.elapsedMs,
        durMs: fx.durMs,
        amp: fx.params.amp ?? 0.04,
      };
    } else if (fx.kind === 'bleed') {
      const last = lineRows[lineRows.length - 1];
      const below = last ? last.row + 1 : lastRow + 1;
      const line = page.lines.find((l) => l.id === fx.lineId);
      if (last && line && below <= lastRow && (frame.runs[below]?.length ?? 1) === 0) {
        const streaks: Array<{ row: number; col: number }> = [];
        const text = flattenLine(line).text;
        for (let i = last.a; i < last.b; i++) {
          if (text[i] !== ' ' && bleedsAt(fx.lineId, i))
            streaks.push({ row: below, col: i - last.a });
        }
        frame.fx = { kind: 'bleed', streaks, elapsedMs: fx.elapsedMs, durMs: fx.durMs };
      }
    }
  }
  if (cur.at && input.status === 'playing' && !input.reducedMotion) {
    put(frame, cur.at.row, cur.at.col, ' ', 'cursor');
  }

  if (input.reducedMotion) {
    fastext(frame, [
      ['PREV', 'prev'],
      ['NEXT', 'next'],
      ['SKIP', 'skip'],
      ['TEXT', 'text'],
    ]);
  } else {
    fastext(frame, [
      ['SKIP', 'skip'],
      [input.paused ? 'PLAY' : 'PAUSE', 'pause'],
      ['', null],
      ['TEXT', 'text'],
    ]);
  }
  return frame;
}

function diaryFrame(input: FrameInput, grid: GridSpec, data: FrameData): Frame {
  const frame = blank(grid, 'page');
  const commits = data.facts.git.commits;
  const layout = layoutDiary(commits, grid.cols, contentRows(grid));
  const view = input.diary;
  const entry = input.pageEntry;
  const tagBase = entry ? `LOG ${entry.padEnd(3, '_')}` : `LOG ${pageNumberOf(view)}`;
  const lastRow = grid.rows - 2;
  frame.id =
    view.kind === 'index'
      ? `diary:index:${Math.min(view.sub, layout.subs.length - 1)}`
      : `diary:commit:${view.index}`;

  if (view.kind === 'index') {
    const sub = Math.min(view.sub, layout.subs.length - 1);
    const range = layout.subs[sub] ?? { start: 0, end: 0 };
    header(
      frame,
      layout.subs.length > 1 && !entry ? `${tagBase} ${sub + 1}/${layout.subs.length}` : tagBase,
      data,
    );
    const last = sub === layout.subs.length - 1;
    titleRow(frame, input, 'BUILD LOG', last ? 'LAST PAGE' : `${sub + 1}/${layout.subs.length}`);
    let row = 2;
    for (let i = range.start; i < range.end; i++) {
      const commit = commits[i];
      if (!commit) break;
      const rows = entrySubjectRows(commit.subject, grid.cols);
      const height = Math.min(rows.length, lastRow - row + 1);
      if (height <= 0) break;
      const selected = i === input.diaryCursor;
      rows.slice(0, height).forEach((text, k) => {
        const line =
          k === 0
            ? `${String(FIRST_COMMIT_PAGE + i).padEnd(ENTRY_INDENT)}${text}`
            : ' '.repeat(ENTRY_INDENT) + text;
        put(
          frame,
          row + k,
          0,
          selected ? pad(line, grid.cols) : line,
          selected ? 'hilite' : 'copy',
        );
      });
      frame.hits.push({
        row,
        rows: height,
        col: 0,
        cols: grid.cols,
        action: { type: 'commit', index: i },
      });
      row += height;
    }
  } else {
    const commit = commits[view.index];
    header(frame, tagBase, data);
    titleRow(frame, input, 'COMMIT');
    if (commit) {
      let row = 2;
      for (const [a, b] of wrapRanges(commit.subject, grid.cols)) {
        if (row > lastRow) break;
        put(frame, row++, 0, commit.subject.slice(a, b), 'strong');
      }
      row += 1;
      const facts: Array<[string, string]> = [
        ['HASH ', commit.shortHash],
        ['DATE ', commit.dateDisplay.toUpperCase()],
      ];
      for (const [label, value] of facts) {
        if (row > lastRow) break;
        put(frame, row, 0, label, 'copy');
        put(frame, row, label.length, value, 'fact');
        row++;
      }
      if (row <= lastRow) {
        const n = String(view.index + 1);
        const total = String(layout.entryCount);
        put(frame, row, 0, 'PAGE ', 'copy');
        put(frame, row, 5, n, 'fact');
        put(frame, row, 5 + n.length, ' OF ', 'copy');
        put(frame, row, 9 + n.length, total, 'fact');
        row++;
      }
      if (view.index === layout.entryCount - 1 && row <= lastRow)
        put(frame, row, 0, 'LAST PAGE', 'strong');
    }
  }
  fastext(frame, [
    ['PREV', 'prev'],
    ['INDEX', 'index'],
    ['NEXT', 'next'],
    ['REPLAY', 'replay'],
  ]);
  return frame;
}

/** Builds what the screen should show for the given playback and display state. */
export function buildFrame(input: FrameInput, grid: GridSpec, data: FrameData): Frame {
  const frame = buildFrameInner(input, grid, data);
  frame.chromeAlpha = input.reducedMotion ? 1 : (input.chromeAlpha ?? 1);
  return frame;
}

function buildFrameInner(input: FrameInput, grid: GridSpec, data: FrameData): Frame {
  switch (input.status) {
    case 'loading': {
      return blank(grid, 'card', {
        sub: input.assetFailed ? 'NO SIGNAL' : 'TUNING...',
        loadingPercent: input.assetFailed ? null : Math.round(input.loadProgress * 100),
        dim: true,
      });
    }
    case 'warming':
      return blank(grid, 'card', { sub: 'STAND BY', loadingPercent: null, dim: false });
    case 'playing':
      return input.blank ? blank(grid, 'dark') : introFrame(input, grid, data);
    case 'ended':
      return diaryFrame(input, grid, data);
    default:
      return blank(grid, 'dark');
  }
}
