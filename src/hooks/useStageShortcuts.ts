import type { KeyboardEvent } from 'react';
import { useDisplayStore } from '@/state/displayStore';
import { useIntroStore } from '@/state/introStore';
import { useUiStore } from '@/state/uiStore';

/**
 * Single-key shortcuts (design-spec 9.3). WCAG 2.1.4: this handler is attached
 * to the television region only, so the keys do nothing elsewhere on the page.
 * Enter and Space are never remapped on a button; on the stage itself they advance.
 */
export function handleStageKey(e: KeyboardEvent<HTMLElement>): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const intro = useIntroStore.getState();
  const display = useDisplayStore.getState();
  const ui = useUiStore.getState();
  const { status } = intro;
  const calm = display.reducedMotion;
  const onStage = e.target === e.currentTarget;
  const manual = status === 'ended' || (calm && (status === 'playing' || status === 'warming'));
  let handled = true;

  switch (e.key) {
    case 's':
    case 'S':
      intro.skip();
      break;
    case 'p':
    case 'P':
      intro.togglePause();
      break;
    case 'r':
    case 'R':
      intro.replay();
      break;
    case 'm':
    case 'M':
      display.toggleAudio();
      ui.announce(useDisplayStore.getState().audio === 'on' ? 'Sound on' : 'Sound off');
      break;
    case 't':
    case 'T':
      ui.openTranscript();
      break;
    case 'n':
    case 'N':
      intro.nextPage();
      break;
    case 'b':
    case 'B':
      intro.prevPage();
      break;
    case 'i':
    case 'I':
      intro.goIndex();
      break;
    case 'ArrowRight':
      if (manual) intro.nextPage();
      else handled = false;
      break;
    case 'ArrowLeft':
      if (manual) intro.prevPage();
      else handled = false;
      break;
    case 'ArrowDown':
      if (status === 'ended') intro.moveCursor(1);
      else handled = false;
      break;
    case 'ArrowUp':
      if (status === 'ended') intro.moveCursor(-1);
      else handled = false;
      break;
    case 'Home':
      if (display.renderMode === '3d-set' && !calm && status !== 'ended')
        display.requestResetView();
      else if (status === 'ended') intro.goIndex();
      else handled = false;
      break;
    case 'Backspace':
      if (status === 'ended') intro.backspacePage();
      else handled = false;
      break;
    case 'Enter':
    case ' ':
      if (!onStage) {
        handled = false;
      } else if (status === 'ended') intro.openCursor();
      else if (calm) intro.nextPage();
      else handled = false;
      break;
    default:
      if (/^\d$/.test(e.key) && status === 'ended') intro.typeDigit(e.key);
      else handled = false;
  }
  if (handled) e.preventDefault();
}
