import { useEffect, useRef } from 'react';
import { facts } from '@/facts';
import { useIntroStore } from '@/state/introStore';
import { useUiStore } from '@/state/uiStore';
import { IntroPages } from './IntroText';

const SHORTCUTS: Array<[string, string]> = [
  ['S', 'Skip the intro'],
  ['P', 'Pause or play'],
  ['R', 'Replay'],
  ['M', 'Sound on or off'],
  ['T', 'Read full text'],
  ['N or Right arrow', 'Next page'],
  ['B or Left arrow', 'Previous page'],
  ['I', 'Diary index'],
  ['Up and Down arrows', 'Move through the diary list'],
  ['Digits', 'Type a diary page number'],
  ['Home', 'Reset the view, or go to the index'],
  ['Escape', 'Close this panel'],
];

/** "Read full text": a modal dialog with the intro and the diary (design-spec 9.4). */
export function TranscriptDialog() {
  const open = useUiStore((s) => s.transcriptOpen);
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const status = useIntroStore((s) => s.status);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-close]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const onClose = () => {
    useUiStore.getState().closeTranscript();
    const el = opener.current;
    opener.current = null;
    if (el?.isConnected) el.focus();
    else document.querySelector<HTMLElement>('.dock [data-key="text"]')?.focus();
  };

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="transcript-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) useUiStore.getState().closeTranscript();
      }}
    >
      <div className="dialog__panel">
        <header className="dialog__head">
          <h2 id="transcript-title">Intro text</h2>
          <button
            type="button"
            className="key"
            data-close
            onClick={() => useUiStore.getState().closeTranscript()}
          >
            Close
          </button>
        </header>
        <div className="dialog__body">
          <IntroPages tagFacts={false} />
          <section>
            <h2>Build log</h2>
            <ol className="dialog__diary">
              {facts.git.commits.map((c, i) => (
                <li key={c.hash}>
                  {status === 'ended' ? (
                    <button
                      type="button"
                      className="linkkey"
                      onClick={() => {
                        useUiStore.getState().closeTranscript();
                        useIntroStore.getState().openCommit(i);
                      }}
                    >
                      {c.shortHash}, {c.dateDisplay}: {c.subject}
                    </button>
                  ) : (
                    <span>
                      {c.shortHash}, {c.dateDisplay}: {c.subject}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <details className="dialog__keys">
            <summary>Keyboard</summary>
            <p>These keys work while focus is on the display or its controls.</p>
            <dl>
              {SHORTCUTS.map(([key, what]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </div>
    </dialog>
  );
}
