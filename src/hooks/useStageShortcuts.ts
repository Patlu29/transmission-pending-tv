import type { KeyboardEvent } from 'react';
import { useChannelStore } from '@/state/channelStore';
import { useDisplayStore } from '@/state/displayStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { useIntroStore } from '@/state/introStore';
import { useUiStore } from '@/state/uiStore';
import {
  openGuide,
  openRooms,
  toggleColour,
  toggleFocus,
  toggleLook,
  toggleRoomSound,
  toggleSolidPanels,
  toggleVideoMute,
  watchAgain,
} from '@/ui/roomActions';

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement;

/**
 * Single-key shortcuts (design-spec 9.3; v2 section 3). WCAG 2.1.4: this handler is attached
 * to the television region only (the stage and the dock inside it), so the keys do nothing
 * elsewhere on the page, and never in a text field. When the YouTube iframe has focus, YouTube
 * owns every key; nothing here fires. Enter and Space are never remapped on a button.
 *
 * Contexts: the v1 keys (S skip, P pause, R replay, T text, N B I pages, digits for diary pages,
 * arrows for the diary) apply on channel 0 in the TV room. Everywhere else digits are channel numbers
 * and Up/Down change channel.
 */
export function handleStageKey(e: KeyboardEvent<HTMLElement>): void {
  if (e.ctrlKey || e.metaKey || e.altKey || isTextField(e.target)) return;
  const intro = useIntroStore.getState();
  const display = useDisplayStore.getState();
  const ui = useUiStore.getState();
  const env = useEnvironmentStore.getState();
  const channels = useChannelStore.getState();
  const { status } = intro;
  const calm = display.reducedMotion;
  const onStage = e.target === e.currentTarget;
  const live = channels.current !== null;
  const channel0 = env.id === 'tv-room' && !live;
  const diary = channel0 && status === 'ended';
  const manual =
    channel0 && (status === 'ended' || (calm && (status === 'playing' || status === 'warming')));
  let handled = true;

  switch (e.key) {
    case 's':
    case 'S':
      if (live) channels.stop();
      else if (channel0) intro.skip();
      else handled = false;
      break;
    case 'p':
    case 'P':
      if (channel0) intro.togglePause();
      else handled = false;
      break;
    case 'r':
    case 'R':
      if (channel0) intro.replay();
      else handled = false;
      break;
    case 'm':
    case 'M':
      if (live) toggleVideoMute();
      else if (channel0) {
        display.toggleAudio();
        ui.announce(useDisplayStore.getState().audio === 'on' ? 'Sound on' : 'Sound off');
      } else handled = false;
      break;
    case 't':
    case 'T':
      if (channel0) ui.openTranscript();
      else handled = false;
      break;
    case 'n':
    case 'N':
      if (channel0) intro.nextPage();
      else handled = false;
      break;
    case 'b':
    case 'B':
      if (channel0) intro.prevPage();
      else handled = false;
      break;
    case 'i':
    case 'I':
      if (channel0) intro.goIndex();
      else handled = false;
      break;
    case 'g':
    case 'G':
      openGuide();
      break;
    case 'v':
    case 'V':
      ui.openPaste();
      break;
    case 'e':
    case 'E':
      openRooms();
      break;
    case 'c':
    case 'C':
      toggleColour();
      break;
    case 'f':
    case 'F':
      if (live) toggleFocus();
      else handled = false;
      break;
    case 'l':
    case 'L':
      if (live) toggleLook();
      else handled = false;
      break;
    case 'w':
    case 'W':
      if (env.pose === 'browse') watchAgain();
      else handled = false;
      break;
    case 'a':
    case 'A':
      toggleRoomSound();
      break;
    case 'u':
    case 'U':
      toggleSolidPanels();
      break;
    case '?':
      ui.openPanel('keys');
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
      if (diary) intro.moveCursor(1);
      else if (env.pose === 'browse') handled = false;
      else channels.step(1);
      break;
    case 'ArrowUp':
      if (diary) intro.moveCursor(-1);
      else if (env.pose === 'browse') handled = false;
      else channels.step(-1);
      break;
    case 'Home':
      if (
        env.pose === 'browse' ||
        (display.renderMode === '3d-set' && !calm && status !== 'ended')
      ) {
        display.requestResetView();
      } else if (diary) intro.goIndex();
      else handled = false;
      break;
    case 'Backspace':
      if (diary) intro.backspacePage();
      else if (channels.digits) channels.clearDigits();
      else handled = false;
      break;
    case 'Escape':
      // Panels close themselves; with none open, move focus from a dock key to the stage.
      if (ui.panel) ui.closePanel();
      else if (!onStage) ui.requestFocus('stage');
      else handled = false;
      break;
    case 'Enter':
    case ' ':
      if (!onStage) handled = false;
      else if (channels.digits) channels.commitDigits();
      else if (diary) intro.openCursor();
      else if (channel0 && calm) intro.nextPage();
      else handled = false;
      break;
    default:
      if (/^\d$/.test(e.key)) {
        if (diary) intro.typeDigit(e.key);
        else channels.typeDigit(e.key);
      } else handled = false;
  }
  if (handled) e.preventDefault();
}
