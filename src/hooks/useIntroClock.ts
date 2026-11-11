import { useEffect } from 'react';
import { intro } from '@/facts';
import { useDisplayStore } from '@/state/displayStore';
import { useHauntStore } from '@/state/hauntStore';
import { ALL_CHARS, currentPlaylist, useIntroStore } from '@/state/introStore';
import {
  AUTO_ADVANCE_MIN_MS,
  AUTO_ADVANCE_PER_CHAR_MS,
  CALM_CARD_MS,
  CARD_HOLD_MS,
  END_HOLD_MS,
  HAUNT_HOLD_EXTENSION_MAX_MS,
  LINE_GAP_MS,
  PAGE_HOLD_BASE_MS,
  PAGE_HOLD_PER_CHAR_MS,
  REPLAY_BLANK_MS,
  REVEAL_CPS,
  WARMUP_MS,
} from '@/state/timing';
import { frameIndexAt } from '@/ui/teletext/playlist';

export {
  REVEAL_CPS,
  LINE_GAP_MS,
  PAGE_HOLD_BASE_MS,
  PAGE_HOLD_PER_CHAR_MS,
  END_HOLD_MS,
  estimateIntroDurationMs,
} from '@/state/timing';

/** A frame gap longer than this is a hidden tab or a stall, not elapsed show time. */
const STALL_GAP_MS = 1000;

type Stage = 'reveal' | 'gap' | 'hold' | 'end';

/**
 * Advances playback with requestAnimationFrame, outside R3F, so the intro runs
 * with no <Canvas> (2D mode). Runs only while the set is warming or playing.
 * rAF stops by itself in hidden tabs; a long gap is capped to 100 ms on return.
 */
export function startIntroClock(): () => void {
  let raf = 0;
  let last = 0;
  let epochSeen = -1;
  let statusSeen = '';
  let stage: Stage = 'reveal';
  let elapsed = 0;
  let accum = 0;

  const reset = (revealed: number) => {
    stage = 'reveal';
    elapsed = 0;
    accum = Number.isFinite(revealed) && revealed < ALL_CHARS ? revealed : 0;
  };

  const tick = (dt: number) => {
    const s = useIntroStore.getState();
    const calm = useDisplayStore.getState().reducedMotion;
    if (s.epoch !== epochSeen || s.status !== statusSeen) {
      epochSeen = s.epoch;
      statusSeen = s.status;
      reset(s.revealedChars);
    }
    if (s.paused) return;

    if (s.status === 'warming') {
      if (s.holdCard) return; // idle test card after Stop: waits for Power or Next
      elapsed += dt;
      if (elapsed >= (calm ? CALM_CARD_MS : WARMUP_MS + CARD_HOLD_MS)) s.startIntro();
      return;
    }
    if (s.status !== 'playing') return;

    if (s.blank) {
      elapsed += dt;
      if (elapsed >= REPLAY_BLANK_MS) {
        s.clearBlank();
        reset(0);
      }
      return;
    }

    const list = currentPlaylist();
    const fi = frameIndexAt(list, s.pageIndex, s.lineIndex);
    const frame = list[fi];
    const page = intro.pages[frame?.pageIndex ?? 0];
    if (!frame || !page) return;

    if (calm) {
      // Whole page at once; manual advance, or slow auto-advance when opted in.
      if (s.lineIndex !== frame.end - 1 || s.revealedChars !== ALL_CHARS) {
        s.setProgress(frame.pageIndex, frame.end - 1, ALL_CHARS);
      }
      if (s.autoAdvance) {
        elapsed += dt;
        if (elapsed >= Math.max(AUTO_ADVANCE_MIN_MS, AUTO_ADVANCE_PER_CHAR_MS * frame.chars)) {
          elapsed = 0;
          s.nextPage();
        }
      } else {
        elapsed = 0;
      }
      return;
    }

    const line = page.lines[s.lineIndex];
    if (!line) return;
    const len = line.text.length;

    switch (stage) {
      case 'reveal': {
        accum += (REVEAL_CPS * dt) / 1000;
        const chars = Math.min(len, Math.floor(accum));
        if (chars !== s.revealedChars) s.setProgress(s.pageIndex, s.lineIndex, chars);
        if (chars >= len) {
          stage = s.lineIndex >= frame.end - 1 ? 'hold' : 'gap';
          elapsed = 0;
        }
        break;
      }
      case 'gap':
        elapsed += dt;
        if (elapsed >= LINE_GAP_MS) {
          s.setProgress(s.pageIndex, s.lineIndex + 1, 0);
          reset(0);
        }
        break;
      case 'hold': {
        elapsed += dt;
        const hold = PAGE_HOLD_BASE_MS + PAGE_HOLD_PER_CHAR_MS * frame.chars;
        // An event cue (text effect, roll) on this page extends the hold until it ends, by at most 6 s.
        const waiting =
          useHauntStore.getState().busy && elapsed < hold + HAUNT_HOLD_EXTENSION_MAX_MS;
        if (elapsed >= hold && !waiting) {
          const next = list[fi + 1];
          if (next) {
            s.setProgress(next.pageIndex, next.start, 0);
            reset(0);
          } else {
            stage = 'end';
            elapsed = 0;
          }
        }
        break;
      }
      case 'end':
        elapsed += dt;
        if (elapsed >= END_HOLD_MS) s.endIntro();
        break;
    }
  };

  const loop = (t: number) => {
    raf = 0;
    // Real elapsed time, so a slow device does not stretch the story. Only a gap over about a second
    // (a hidden tab or a stall) counts as a pause.
    const gap = t - last;
    const dt = gap > STALL_GAP_MS ? 0 : Math.max(0, gap);
    last = t;
    tick(dt);
    ensure();
  };

  function ensure() {
    const { status } = useIntroStore.getState();
    if ((status === 'warming' || status === 'playing') && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  const unsubs = [useIntroStore.subscribe(ensure), useDisplayStore.subscribe(ensure)];
  ensure();
  return () => {
    unsubs.forEach((u) => u());
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}

export function useIntroClock(): void {
  useEffect(() => startIntroClock(), []);
}
