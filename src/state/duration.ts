import type { ResolvedIntro } from '../facts/schema.ts';
import type { Cue } from './cues.ts';
import {
  END_HOLD_MS,
  HAUNT_HOLD_EXTENSION_MAX_MS,
  LINE_GAP_MS,
  PAGE_HOLD_BASE_MS,
  PAGE_HOLD_PER_CHAR_MS,
  REVEAL_CPS,
  CUE_END_DELAY_MS,
} from './timing.ts';
import { buildPlaylist } from '../ui/teletext/playlist.ts';
import { rewriteTimelineMs, letterIndices, wordRange } from '../ui/teletext/effects.ts';

/** Measured extra time per screen in a 60 fps browser run (2D, 40 x 16 grid). */
export const MEASURED_SCREEN_OVERHEAD_MS = 500;

export interface DurationOptions {
  /** Grid used to split pages into screens (default: 40 columns, 13 content rows, the 3d-set grid). */
  cols?: number;
  contentRows?: number;
}

/**
 * Full-motion story duration in ms, excluding warm-up. Simulates useIntroClock: reveal time,
 * line gaps, the hold on every screen (pages can split into several), the end hold, and the hold
 * extension while any event cue (text effect or roll) is queued, running or pending. Text effects run
 * one at a time, each starting 300 ms (plus any offset) after its line has finished revealing, and
 * a hold waits for them by at most 6 s.
 */
export function estimateStoryDurationMs(
  intro: ResolvedIntro,
  cues: Cue[],
  { cols = 40, contentRows = 13 }: DurationOptions = {},
): number {
  const frames = buildPlaylist(intro, cols, contentRows);
  let t = 0;
  let textEnd = 0;
  let busyUntil = 0;
  for (const f of frames) {
    const page = intro.pages[f.pageIndex];
    if (!page) continue;
    for (let li = f.start; li < f.end; li++) {
      const line = page.lines[li];
      if (!line) continue;
      t += (line.text.length / REVEAL_CPS) * 1000;
      for (const c of cues) {
        if (c.anchor.lineId !== line.id || !c.anchor.end) continue;
        const at = t + CUE_END_DELAY_MS + c.anchor.offsetS * 1000;
        if (c.kind === 'roll') {
          busyUntil = Math.max(busyUntil, at + Number(c.params.dur) * 1000);
        } else if (c.kind === 'tremble' || c.kind === 'rewrite' || c.kind === 'bleed') {
          let durMs = Number(c.params.dur) * 1000;
          if (c.kind === 'rewrite') {
            const range = wordRange(line.text, Number(c.params.word));
            const n = range ? letterIndices(line.text, range).length : 0;
            durMs = Math.max(durMs, rewriteTimelineMs(n, Number(c.params.hold)));
          }
          const start = Math.max(at, textEnd);
          textEnd = start + durMs;
          busyUntil = Math.max(busyUntil, textEnd);
        }
      }
      if (li < f.end - 1) t += LINE_GAP_MS;
    }
    const hold = PAGE_HOLD_BASE_MS + PAGE_HOLD_PER_CHAR_MS * f.chars;
    const wait =
      busyUntil > t + hold ? Math.min(busyUntil - t, hold + HAUNT_HOLD_EXTENSION_MAX_MS) : hold;
    t += wait;
  }
  // Calibrated against a real browser run: each screen costs about half a second more than the
  // ideal timeline (cue scheduling and clock ticks).
  return t + END_HOLD_MS + frames.length * MEASURED_SCREEN_OVERHEAD_MS;
}
