import { useUiStore } from '@/state/uiStore';
import { Modal } from './Modal';

const MAP: Array<[string, string]> = [
  ['0 to 9', 'Type a channel number (the diary keeps its own page numbers)'],
  ['Up and Down', 'Previous or next channel (the diary cursor, while the diary shows)'],
  ['G', 'Channel guide'],
  ['V', 'Paste a link'],
  ['E', 'Change the room'],
  ['C', 'Room colour on or off'],
  ['F', 'Focus mode'],
  ['L', 'Look around, W or Escape to watch again'],
  ['S', 'Stop the channel (Skip, while the story plays)'],
  ['M', 'Mute or unmute the video'],
  ['A', 'Room sound on or off'],
  ['?', 'This list'],
  ['Escape', 'Close the open panel; with none open, move focus to the screen'],
  ['Tab', 'Leave the player. Skip to controls comes before it, Back to controls after it'],
];

/** Keyboard help (design-spec v2 section 3). */
export function KeyboardHelp() {
  const open = useUiStore((s) => s.panel === 'keys');
  return (
    <Modal
      open={open}
      labelledBy="keys-title"
      onClose={() => useUiStore.getState().closePanel('keys')}
    >
      <header className="dialog__head">
        <h2 id="keys-title" tabIndex={-1} data-initial-focus>
          Keyboard
        </h2>
        <button
          type="button"
          className="key"
          onClick={() => useUiStore.getState().closePanel('keys')}
        >
          Close
        </button>
      </header>
      <div className="dialog__body">
        <p>
          These keys work while focus is on the screen or the controls. When the video has focus,
          YouTube owns every key; press Tab to leave it.
        </p>
        <dl className="keymap">
          {MAP.map(([key, what]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
