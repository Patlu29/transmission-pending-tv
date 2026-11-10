/**
 * Playback timing constants (design-spec 6.1 and 6.3). QA computes the FR-8
 * duration from `intro.characterCount` with these; re-exported by
 * `src/hooks/useIntroClock.ts`.
 */
export const REVEAL_CPS = 60;
export const LINE_GAP_MS = 450;
export const PAGE_HOLD_BASE_MS = 1200;
export const PAGE_HOLD_PER_CHAR_MS = 10;
export const END_HOLD_MS = 3000;

/** Warm-up (full motion) and the hold on the card before page 1. */
export const WARMUP_MS = 2200;
export const CARD_HOLD_MS = 300;
/** Calm / reduced motion: the static card shows this long before page 1. */
export const CALM_CARD_MS = 1500;
/** CRT collapse on power-off (the scene and 2D screen play it; the rasteriser holds the last picture). */
export const COLLAPSE_MS = 450;
/** Black frame on Replay (full motion only). */
export const REPLAY_BLANK_MS = 200;
/** Calm auto-advance (opt-in): a page stays for max(8 s, 25 ms per character). */
export const AUTO_ADVANCE_MIN_MS = 8000;
export const AUTO_ADVANCE_PER_CHAR_MS = 25;
export const NO_SUCH_PAGE_MS = 2000;

/** Haunting (design-spec 16): shortest state ramp, ease-out times, longest page-hold extension. */
export const HAUNT_MIN_STEP_S = 2;
export const HAUNT_EASE_OUT_NATURAL_MS = 3000;
export const HAUNT_EASE_OUT_SKIP_MS = 1200;
export const HAUNT_CREEP_REPLAY_MS = 700;
export const HAUNT_HOLD_EXTENSION_MAX_MS = 6000;
/** An @end anchor fires this long after the line has finished revealing. */
export const CUE_END_DELAY_MS = 300;
/** Text effects redraw at most this often (--haunt-text-redraw-hz). */
export const HAUNT_TEXT_REDRAW_HZ = 30;

/** Intro duration in ms excluding warm-up, from design-spec 6.3. */
export function estimateIntroDurationMs(characters: number, lines: number, pages: number): number {
  return (
    (characters / REVEAL_CPS) * 1000 +
    lines * LINE_GAP_MS +
    pages * PAGE_HOLD_BASE_MS +
    characters * PAGE_HOLD_PER_CHAR_MS +
    END_HOLD_MS
  );
}
