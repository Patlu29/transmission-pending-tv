import { useEffect, useId, useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useChannelStore } from '@/state/channelStore';
import { useDisplayStore } from '@/state/displayStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';
import { usePlayerStore } from '@/state/playerStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useUiStore, type FocusTarget } from '@/state/uiStore';
import {
  openGuide,
  openRooms,
  toggleColour,
  toggleFocus,
  toggleLook,
  toggleRoomSound,
  toggleVideoMute,
} from '@/ui/roomActions';
import { DockKey } from './DockKey';
import { FooterLinks } from './FooterLinks';

interface KeySpec {
  id: string;
  label: string;
  onPress: () => void;
  ariaLabel?: string;
  disabled?: boolean;
  pressed?: boolean;
  busy?: boolean;
  large?: boolean;
  describedBy?: string;
  /** Compact layouts keep the lowest four numbers inline; the rest go under "More". */
  pri: number;
  /** 'more' keys always live in the More sheet (design-spec v2 2.3). */
  zone?: 'main' | 'more';
}

/** Where focus goes if the requested key is not on the dock (design-spec 6.4, 6.5; v2 1.12). */
const FOCUS_FALLBACK: Record<FocusTarget, string[]> = {
  power: ['power'],
  skip: ['skip', 'power'],
  pause: ['pause', 'next', 'power'],
  replay: ['replay', 'next', 'power'],
  next: ['next', 'pause', 'power'],
  guide: ['guide', 'calm', 'power'],
  stage: [],
};

export function Dock() {
  const status = useIntroStore((s) => s.status);
  const paused = useIntroStore((s) => s.paused);
  const autoAdvance = useIntroStore((s) => s.autoAdvance);
  const audio = useDisplayStore((s) => s.audio);
  const calmSwitch = useDisplayStore((s) => s.calmSwitch);
  const osCalm = useDisplayStore((s) => s.osReducedMotion);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const mode = useDisplayStore((s) => s.renderMode);
  const loadProgress = useDisplayStore((s) => s.loadProgress);
  const env = useEnvironmentStore((s) => s.id);
  const pose = useEnvironmentStore((s) => s.pose);
  const userFocus = useEnvironmentStore((s) => s.userFocus);
  const live = useChannelStore((s) => s.current);
  const muted = usePlayerStore((s) => s.muted);
  const playerPhase = usePlayerStore((s) => s.phase);
  const roomSound = useSettingsStore((s) => s.roomSound);
  const colourSetting = useSettingsStore((s) => s.colour);
  const focusRequest = useUiStore((s) => s.focusRequest);
  const wide = useMediaQuery('(min-width: 1024px)');
  const [moreOpen, setMoreOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sheetId = useId();
  const reasonId = useId();
  const colourReasonId = useId();
  const initialFocus = useRef(false);

  const intro = useIntroStore.getState;
  const isTv = env === 'tv-room';
  const channel0 = isTv && live === null;
  const powered = isPoweredStatus(status);
  const loading = status === 'loading';
  // On channel 0 while the story runs, the phone bar is Power or Skip, Calm, Pause, More (design-spec v2 2.4).
  const storyBusy =
    channel0 && (status === 'warming' || status === 'playing' || status === 'ended');
  const roomPri = storyBusy ? 2 : 0;

  const keys: KeySpec[] = [];
  if (isTv) {
    keys.push({
      id: 'power',
      label: powered ? 'Switch off' : 'Switch on',
      onPress: () => {
        // Switching on from a live channel returns to channel 0 (the story).
        if (live) useChannelStore.getState().playStory();
        else intro().power();
      },
      disabled: loading,
      busy: loading,
      large: !powered,
      describedBy:
        [loading ? reasonId : '', !powered && channel0 ? 'start-note' : '']
          .filter(Boolean)
          .join(' ') || undefined,
      pri: 0,
    });
  }
  // FR-31: the Calm key is always on the dock, directly after Power.
  keys.push({
    id: 'calm',
    label: osCalm ? 'Calm: on (system)' : calmSwitch ? 'Calm: on' : 'Calm: off',
    onPress: () => {
      useDisplayStore.getState().toggleCalm();
      useUiStore
        .getState()
        .announce(useDisplayStore.getState().calmSwitch ? 'Calm mode on' : 'Calm mode off');
    },
    disabled: osCalm,
    pressed: calmSwitch || osCalm,
    pri: 0,
  });

  // Channel 0: the v1 story controls.
  if (channel0 && (status === 'warming' || status === 'playing')) {
    keys.push({
      id: 'skip',
      label: 'Skip intro',
      onPress: () => intro().skip(),
      disabled: status === 'warming',
      pri: 0,
    });
  }
  if (channel0 && status === 'playing' && (!calm || autoAdvance)) {
    keys.push({
      id: 'pause',
      label: paused ? 'Play' : 'Pause',
      onPress: () => intro().togglePause(),
      pri: 0,
    });
  }
  if (channel0 && status === 'ended')
    keys.push({ id: 'replay', label: 'Replay', onPress: () => intro().replay(), pri: 0 });

  keys.push({ id: 'guide', label: 'Guide', onPress: openGuide, pri: roomPri });
  keys.push({
    id: 'room',
    label: 'Room',
    ariaLabel: 'Room: change the room',
    onPress: openRooms,
    pri: roomPri,
  });
  keys.push({
    id: 'colour',
    label: colourSetting === 'colour' && !channel0 ? 'Colour: on' : 'Colour: off',
    ariaLabel: 'Room colour',
    onPress: toggleColour,
    pressed: colourSetting === 'colour' && !channel0,
    disabled: channel0,
    describedBy: channel0 ? colourReasonId : undefined,
    pri: 3,
  });

  if (live && playerPhase !== 'none' && playerPhase !== 'error') {
    keys.push({
      id: 'sound',
      label: muted ? 'Unmute video' : 'Mute video',
      onPress: toggleVideoMute,
      pressed: !muted,
      pri: 2,
    });
  }
  if (!live && channel0) {
    keys.push({
      id: 'sound',
      label: audio === 'on' ? 'Sound on' : 'Sound off',
      onPress: () => {
        useDisplayStore.getState().toggleAudio();
        useUiStore
          .getState()
          .announce(useDisplayStore.getState().audio === 'on' ? 'Sound on' : 'Sound off');
      },
      pressed: audio === 'on',
      pri: 4,
    });
    keys.push({
      id: 'text',
      label: 'Read full text',
      onPress: () => useUiStore.getState().openTranscript(),
      pri: 4,
    });
  }

  const manual =
    channel0 && (status === 'ended' || (calm && (status === 'playing' || status === 'warming')));
  if (manual) {
    keys.push({
      id: 'prev',
      label: 'Previous',
      onPress: () => intro().prevPage(),
      disabled: status === 'warming',
      pri: 3,
    });
    keys.push({ id: 'next', label: 'Next', onPress: () => intro().nextPage(), pri: 2 });
  }
  if (channel0 && status === 'ended')
    keys.push({ id: 'index', label: 'Index', onPress: () => intro().goIndex(), pri: 5 });
  if (channel0 && calm && status === 'playing') {
    keys.push({
      id: 'auto',
      label: autoAdvance ? 'Auto-advance: On' : 'Auto-advance: Off',
      onPress: () => intro().toggleAutoAdvance(),
      pressed: autoAdvance,
      pri: 5,
    });
  }

  // Channel stepping: a live channel, or the channel 0 diary once it is showing.
  if (live || (channel0 && status === 'ended')) {
    keys.push({
      id: 'chprev',
      label: 'Previous channel',
      onPress: () => useChannelStore.getState().step(-1),
      pri: 2,
    });
    keys.push({
      id: 'chnext',
      label: 'Next channel',
      onPress: () => useChannelStore.getState().step(1),
      pri: 2,
    });
  }
  if (live && mode === '3d-set' && !calm) {
    keys.push({
      id: 'look',
      label: pose === 'browse' ? 'Watch' : 'Look around',
      onPress: toggleLook,
      pri: 3,
    });
  }
  if (live) {
    keys.push({ id: 'focus', label: 'Focus', onPress: toggleFocus, pressed: userFocus, pri: 3 });
    keys.push({
      id: 'stop',
      label: 'Stop',
      onPress: () => useChannelStore.getState().stop(),
      pri: 2,
      zone: 'more',
    });
  }
  keys.push({
    id: 'roomsound',
    label: roomSound ? 'Room sound: on' : 'Room sound: off',
    onPress: toggleRoomSound,
    pressed: roomSound,
    pri: 6,
    zone: 'more',
  });
  keys.push({
    id: 'keys',
    label: 'Keyboard help',
    onPress: () => useUiStore.getState().openPanel('keys'),
    pri: 6,
    zone: 'more',
  });

  const main = keys.filter((k) => k.zone !== 'more');
  const sheet = keys.filter((k) => k.zone === 'more');
  const compact = mode === '3d-screen' || (mode === '2d' && !wide);
  const inline = compact
    ? new Set(
        main
          .map((k, i) => ({ k, i }))
          .sort((a, b) => a.k.pri - b.k.pri || a.i - b.i)
          .slice(0, 4)
          .map((x) => x.k.id),
      )
    : null;
  const visible = inline ? main.filter((k) => inline.has(k.id)) : main;
  const more = [...(inline ? main.filter((k) => !inline.has(k.id)) : []), ...sheet];

  const focusKey = (target: FocusTarget) => {
    if (target === 'stage') {
      document.querySelector<HTMLElement>('.stage')?.focus();
      return;
    }
    for (const id of FOCUS_FALLBACK[target]) {
      const el = ref.current?.querySelector<HTMLElement>(`[data-key="${id}"]`);
      if (el) {
        el.focus();
        return;
      }
    }
  };

  // Focus moves requested by store actions (Skip -> Replay, Stop -> Guide).
  useEffect(() => {
    if (focusRequest) focusKey(focusRequest.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  // If the focused key was removed by a status change, focus does not fall to the page.
  useEffect(() => {
    if (document.activeElement === document.body && status === 'ended' && channel0)
      focusKey('replay');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Power (or Guide, where there is no Power) gets focus once ready, but only if the visitor has not moved focus.
  useEffect(() => {
    if (status === 'ready' && !initialFocus.current) {
      initialFocus.current = true;
      if (document.activeElement === document.body) focusKey(isTv ? 'power' : 'guide');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // A dialog handles its own Escape; the sheet must stay so focus can return to its opener.
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setMoreOpen(false);
        ref.current?.querySelector<HTMLElement>('[data-key="more"]')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const pct = Math.round(loadProgress * 100);
  const renderKey = (k: KeySpec, inSheet = false) => (
    <DockKey
      key={k.id}
      id={k.id}
      label={k.label}
      ariaLabel={k.ariaLabel}
      onPress={() => {
        k.onPress();
        // Keys that open a dialog or toggle a setting keep the sheet open, so focus has somewhere to return to.
        if (inSheet && !['text', 'keys', 'roomsound'].includes(k.id)) setMoreOpen(false);
      }}
      disabled={k.disabled}
      pressed={k.pressed}
      busy={k.busy}
      large={k.large}
      describedBy={k.describedBy}
    />
  );
  return (
    <div className="dock" id="dock" ref={ref} role="group" aria-label="Television controls">
      {loading && isTv && (
        <p className="dock__reason" id={reasonId}>
          Tuning in, {pct}%
        </p>
      )}
      {channel0 && (
        <p className="dock__note" id={colourReasonId}>
          Channel 0 is always black and white
        </p>
      )}
      <div className="dock__keys">
        {visible.map((k) => renderKey(k))}
        <DockKey
          id="more"
          label="More"
          onPress={() => setMoreOpen((o) => !o)}
          expanded={moreOpen}
          controls={sheetId}
        />
      </div>
      {moreOpen && (
        <div className="dock__sheet" id={sheetId} role="group" aria-label="More controls">
          {more.map((k) => renderKey(k, true))}
          <FooterLinks className="footer-links--sheet" />
        </div>
      )}
    </div>
  );
}
