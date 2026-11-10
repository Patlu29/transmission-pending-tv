import { useId } from 'react';
import { useDisplayStore } from '@/state/displayStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';

/** Shown while the set is off: tagline, flicker note and the Calm switch (US-11). */
export function StartScreen() {
  const status = useIntroStore((s) => s.status);
  const calm = useDisplayStore((s) => s.calmSwitch);
  const os = useDisplayStore((s) => s.osReducedMotion);
  const noteId = useId();
  if (isPoweredStatus(status)) return null;
  return (
    <section className="start" aria-label="Start">
      <p className="start__tagline">A television with something to say.</p>
      <button
        type="button"
        role="switch"
        aria-checked={calm || os}
        aria-disabled={os || undefined}
        aria-describedby={noteId}
        className={`key key--switch${calm || os ? ' is-on' : ''}`}
        onClick={() => {
          if (!os) useDisplayStore.getState().toggleCalm();
        }}
      >
        {os ? 'Calm mode: on (system setting)' : calm ? 'Calm mode: on' : 'Calm mode: off'}
      </button>
      <p className="start__note" id={noteId}>
        This set crackles and flickers. If you prefer calm, switch on Calm mode here or turn on
        reduced motion in your system settings; this page follows both straight away. Calm mode
        freezes the noise, skips the warm-up and shows each page whole, for you to advance.
      </p>
    </section>
  );
}
