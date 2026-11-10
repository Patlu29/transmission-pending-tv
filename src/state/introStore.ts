import { create } from 'zustand';
import { facts, intro } from '@/facts';
import { contentRows } from '@/ui/teletext/grid';
import {
  layoutDiary,
  nextView,
  pageNumberOf,
  prevView,
  subContaining,
  viewForPage,
  type DiaryLayout,
  type DiaryView,
} from '@/ui/teletext/diary';
import { buildPlaylist, frameIndexAt, type PlaylistFrame } from '@/ui/teletext/playlist';
import { useDisplayStore } from './displayStore';
import { useUiStore } from './uiStore';

/**
 * 'ready' and 'off' both mean "set is off and can be switched on". Power-off
 * returns to 'ready' (the scene and 2D screen play the CRT collapse when they
 * see the set lose power); 'off' is kept for the architecture contract and is
 * treated the same.
 */
export type IntroStatus = 'off' | 'loading' | 'ready' | 'warming' | 'playing' | 'ended';

export const isPoweredStatus = (s: IntroStatus) =>
  s === 'warming' || s === 'playing' || s === 'ended';

/** `revealedChars` value meaning "the whole line" (calm pages show at once). */
export const ALL_CHARS = Number.MAX_SAFE_INTEGER;

interface IntroState {
  status: IntroStatus;
  /** Intro page and logical line being shown; `revealedChars` of that line are visible. */
  pageIndex: number;
  lineIndex: number;
  revealedChars: number;
  /** Pause freezes the reveal and every timer (WCAG 2.2.2). */
  paused: boolean;
  /** Replay shows a black frame for 200 ms (full motion only). */
  blank: boolean;
  /** Bumped on every jump (power, skip, replay, paging) so the clock resets its timers. */
  epoch: number;
  /** performance.now() at the last status change. */
  statusSince: number;
  /** Calm auto-advance (opt-in, default off). */
  autoAdvance: boolean;

  /** Diary (status 'ended'). */
  diary: DiaryView;
  /** Highlighted commit in the index. */
  diaryCursor: number;
  /** Digits typed so far for a page number. */
  pageEntry: string;
  /** performance.now() when "NO SUCH PAGE" was triggered. */
  noSuchPageAt: number | null;

  markReady(): void;
  power(): void;
  skip(): void;
  replay(): void;
  nextPage(): void;
  prevPage(): void;
  togglePause(): void;
  toggleAutoAdvance(): void;

  goIndex(): void;
  openCommit(index: number): void;
  typeDigit(digit: string): void;
  backspacePage(): void;
  moveCursor(delta: number): void;
  openCursor(): void;
  clearNoSuchPage(): void;

  /** Clock only. */
  startIntro(): void;
  endIntro(): void;
  setProgress(pageIndex: number, lineIndex: number, revealedChars: number): void;
  clearBlank(): void;
}

const announce = (m: string) => useUiStore.getState().announce(m);

export function currentPlaylist(): PlaylistFrame[] {
  const { grid } = useDisplayStore.getState();
  return buildPlaylist(intro, grid.cols, contentRows(grid));
}

function diaryLayout(): DiaryLayout {
  const { grid } = useDisplayStore.getState();
  return layoutDiary(facts.git.commits, grid.cols, contentRows(grid));
}

const reducedNow = () => useDisplayStore.getState().reducedMotion;
const now = () => (typeof performance === 'undefined' ? 0 : performance.now());

const fresh = {
  pageIndex: 0,
  lineIndex: 0,
  revealedChars: 0,
  paused: false,
  blank: false,
  diary: { kind: 'index', sub: 0 } as DiaryView,
  diaryCursor: 0,
  pageEntry: '',
  noSuchPageAt: null as number | null,
};

export const useIntroStore = create<IntroState>()((set, get) => {
  const transition = (status: IntroStatus, patch: Partial<IntroState> = {}) =>
    set((s) => ({ status, statusSince: now(), epoch: s.epoch + 1, ...patch }));

  const showDiaryPage = (view: DiaryView) => {
    const layout = diaryLayout();
    const cursor = view.kind === 'commit' ? view.index : get().diaryCursor;
    const diary: DiaryView =
      view.kind === 'index'
        ? { kind: 'index', sub: Math.min(view.sub, layout.subs.length - 1) }
        : view;
    set((s) => ({
      diary,
      diaryCursor: cursor,
      pageEntry: '',
      noSuchPageAt: null,
      epoch: s.epoch + 1,
    }));
    announce(`Page ${pageNumberOf(diary)} of the build diary`);
  };

  const showFrame = (frame: PlaylistFrame) =>
    set((s) => ({
      pageIndex: frame.pageIndex,
      lineIndex: frame.end - 1,
      revealedChars: ALL_CHARS,
      epoch: s.epoch + 1,
    }));

  return {
    status: 'loading',
    ...fresh,
    epoch: 0,
    statusSince: 0,
    autoAdvance: false,

    markReady: () => {
      if (get().status === 'loading') set({ status: 'ready', statusSince: now() });
    },

    power() {
      const { status } = get();
      if (status === 'loading') return;
      if (status === 'ready' || status === 'off') {
        transition('warming', { ...fresh });
        announce('TV on');
      } else {
        transition('ready', { paused: false, blank: false });
        announce('TV off');
        useUiStore.getState().closeTranscript();
      }
    },

    skip() {
      if (get().status !== 'playing') return;
      transition('ended', { ...fresh });
      announce('Intro skipped. Build diary showing.');
      useUiStore.getState().requestFocus('replay');
    },

    replay() {
      if (get().status !== 'ended') return;
      const calm = reducedNow();
      transition('playing', { ...fresh, blank: !calm });
      announce('Replaying the intro.');
      useUiStore.getState().requestFocus(calm ? 'next' : 'pause');
    },

    nextPage() {
      const { status } = get();
      if (status === 'warming' && reducedNow()) {
        get().startIntro();
        return;
      }
      if (status === 'playing' && reducedNow()) {
        const list = currentPlaylist();
        const next = list[frameIndexAt(list, get().pageIndex, get().lineIndex) + 1];
        if (next) showFrame(next);
        else get().endIntro();
        return;
      }
      if (status === 'ended') showDiaryPage(nextView(get().diary, diaryLayout()));
    },

    prevPage() {
      const { status } = get();
      if (status === 'playing' && reducedNow()) {
        const list = currentPlaylist();
        const prev = list[frameIndexAt(list, get().pageIndex, get().lineIndex) - 1];
        if (prev) showFrame(prev);
        return;
      }
      if (status === 'ended') showDiaryPage(prevView(get().diary, diaryLayout()));
    },

    togglePause() {
      if (get().status !== 'playing') return;
      set((s) => ({ paused: !s.paused }));
      announce(get().paused ? 'Paused' : 'Playing');
    },

    toggleAutoAdvance() {
      set((s) => ({ autoAdvance: !s.autoAdvance, epoch: s.epoch + 1 }));
      announce(get().autoAdvance ? 'Auto-advance on' : 'Auto-advance off');
    },

    goIndex() {
      if (get().status === 'ended') showDiaryPage({ kind: 'index', sub: 0 });
    },

    openCommit(index) {
      if (get().status !== 'ended') return;
      if (index >= 0 && index < diaryLayout().entryCount) showDiaryPage({ kind: 'commit', index });
    },

    typeDigit(digit) {
      if (get().status !== 'ended' || !/^\d$/.test(digit)) return;
      const entry = get().pageEntry + digit;
      if (entry.length < 3) {
        set({ pageEntry: entry, noSuchPageAt: null });
        return;
      }
      const view = viewForPage(Number(entry), diaryLayout());
      if (view) showDiaryPage(view);
      else {
        set({ pageEntry: '', noSuchPageAt: now() });
        announce('No such page');
      }
    },

    backspacePage: () => set((s) => ({ pageEntry: s.pageEntry.slice(0, -1) })),

    moveCursor(delta) {
      const { status, diary, diaryCursor } = get();
      if (status !== 'ended' || diary.kind !== 'index') return;
      const layout = diaryLayout();
      const cursor = Math.min(layout.entryCount - 1, Math.max(0, diaryCursor + delta));
      set({ diaryCursor: cursor, diary: { kind: 'index', sub: subContaining(layout, cursor) } });
    },

    openCursor() {
      const { status, diary, diaryCursor } = get();
      if (status === 'ended' && diary.kind === 'index') get().openCommit(diaryCursor);
    },

    clearNoSuchPage: () => set({ noSuchPageAt: null }),

    startIntro() {
      if (get().status !== 'warming') return;
      transition('playing', { pageIndex: 0, lineIndex: 0, revealedChars: 0, blank: false });
    },

    endIntro() {
      if (get().status !== 'playing') return;
      transition('ended', { ...fresh });
      announce('Intro finished. Build diary showing.');
    },

    setProgress: (pageIndex, lineIndex, revealedChars) =>
      set({ pageIndex, lineIndex, revealedChars }),
    clearBlank: () => set({ blank: false }),
  };
});
