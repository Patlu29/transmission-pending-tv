import { useEffect, useState } from 'react';
import { useEnvironmentStore } from '@/state/environmentStore';
import { useChannelStore } from '@/state/channelStore';
import { useDisplayStore } from '@/state/displayStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useUiStore } from '@/state/uiStore';
import { toggleSolidPanels } from '@/ui/roomActions';
import { FooterLinks } from './FooterLinks';

/** Shown while the set is off: tagline, flicker note and the Calm switch (US-11), plus the v2 doors. */
export function StartScreen() {
  const status = useIntroStore((s) => s.status);
  const calm = useDisplayStore((s) => s.calmSwitch);
  const os = useDisplayStore((s) => s.osReducedMotion);
  const env = useEnvironmentStore((s) => s.id);
  const live = useChannelStore((s) => s.current);
  const panel = useUiStore((s) => s.panel);
  const solid = useSettingsStore((s) => s.solidPanels);
  const noteId = 'start-note';
  const powered = isPoweredStatus(status);
  const [gone, setGone] = useState(false);
  // Fade out over 300 ms at power-on instead of cutting, then unmount.
  useEffect(() => {
    if (!powered) return;
    const t = setTimeout(() => setGone(true), 320);
    return () => {
      clearTimeout(t);
      setGone(false);
    };
  }, [powered]);
  // The start screen belongs to the TV room with the set off and nothing chosen.
  if (env !== 'tv-room' || live) return null;
  if (powered && gone) return null;
  return (
    <section
      className={`start${powered ? ' start--leaving' : ''}${panel ? ' start--behind' : ''}`}
      aria-label="Start"
      inert={powered || undefined}
    >
      <p className="start__tagline">A display with something to say.</p>
      <button
        type="button"
        aria-pressed={calm || os}
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
        Mild horror theme. Slow and creepy, with no jump scares. Expect flicker, trembling text, a
        pale figure and a slowly closing camera. Calm mode turns every effect off.
      </p>
      <p className="start__line">
        Channels come from YouTube. You will be asked before anything loads.
      </p>
      <div className="start__doors">
        <button
          type="button"
          className="key"
          onClick={() => useUiStore.getState().openPanel('guide')}
        >
          Channel guide
        </button>
        <button
          type="button"
          className="key key--two"
          onClick={() => useUiStore.getState().openPanel('picker')}
        >
          <span>Change the room</span>
          <span className="key__sub">Try the mountain sky</span>
        </button>
      </div>
      <button type="button" className="key" aria-pressed={solid} onClick={toggleSolidPanels}>
        {solid ? 'Solid panels: on' : 'Solid panels: off'}
      </button>
      <FooterLinks className="footer-links--start" />
    </section>
  );
}
