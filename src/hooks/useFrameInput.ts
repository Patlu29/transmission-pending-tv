import { useShallow } from 'zustand/react/shallow';
import { useDisplayStore } from '@/state/displayStore';
import { useHauntStore } from '@/state/hauntStore';
import { useIntroStore } from '@/state/introStore';
import { toFxInput } from '@/ui/teletext/fxFromStore';
import type { FrameInput } from '@/ui/teletext/frame';

/** Subscribes to everything the frame model needs (used by the 2D screen). */
export function useFrameInput(): FrameInput {
  const intro = useIntroStore(
    useShallow((s) => ({
      status: s.status,
      blank: s.blank,
      paused: s.paused,
      pageIndex: s.pageIndex,
      lineIndex: s.lineIndex,
      revealedChars: s.revealedChars,
      diary: s.diary,
      diaryCursor: s.diaryCursor,
      pageEntry: s.pageEntry,
      noSuchPage: s.noSuchPageAt !== null,
    })),
  );
  const display = useDisplayStore(
    useShallow((s) => ({
      loadProgress: s.loadProgress,
      assetFailed: s.assetFailed,
      reducedMotion: s.reducedMotion,
    })),
  );
  // Quantised to the 30 Hz redraw rate so the 2D screen does not re-render at 60 Hz.
  const fx = useHauntStore(
    useShallow((s) => {
      const f = toFxInput(s.textEffects);
      return f
        ? {
            ...f,
            elapsedMs: Math.floor(f.elapsedMs / 33) * 33,
            params: s.textEffects[f.lineId]?.params ?? {},
          }
        : null;
    }),
  );
  return { ...intro, ...display, fx: display.reducedMotion ? null : fx };
}
