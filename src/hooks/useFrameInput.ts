import { useShallow } from 'zustand/react/shallow';
import { useDisplayStore } from '@/state/displayStore';
import { useIntroStore } from '@/state/introStore';
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
  return { ...intro, ...display };
}
