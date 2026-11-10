import type { TapAction } from '@/ui/teletext/frame';
import { useIntroStore } from '@/state/introStore';
import { useUiStore } from '@/state/uiStore';

/** Runs a tap on the screen (canvas hit layer or 2D screen). */
export function performTap(action: TapAction) {
  const intro = useIntroStore.getState();
  if (action.type === 'commit') return intro.openCommit(action.index);
  switch (action.key) {
    case 'skip':
      return intro.skip();
    case 'pause':
      return intro.togglePause();
    case 'next':
      return intro.nextPage();
    case 'prev':
      return intro.prevPage();
    case 'index':
      return intro.goIndex();
    case 'replay':
      return intro.replay();
    case 'text':
      return useUiStore.getState().openTranscript();
  }
}

/** A tap on empty screen: right half next, left half previous (manual paging only). */
export function performEmptyTap(xFraction: number) {
  const intro = useIntroStore.getState();
  if (xFraction >= 0.5) intro.nextPage();
  else intro.prevPage();
}
