import { useEffect, useId, useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDisplayStore } from '@/state/displayStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';
import { useUiStore, type FocusTarget } from '@/state/uiStore';
import { DockKey } from './DockKey';

interface KeySpec {
  id: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pressed?: boolean;
  busy?: boolean;
  large?: boolean;
  /** Compact layouts keep the three lowest numbers inline; the rest go under "More". */
  pri: number;
}

/** Where focus goes if the requested key is not on the dock (design-spec 6.4, 6.5). */
const FOCUS_FALLBACK: Record<FocusTarget, string[]> = {
  power: ['power'],
  skip: ['skip', 'power'],
  pause: ['pause', 'next', 'power'],
  replay: ['replay', 'next', 'power'],
  next: ['next', 'pause', 'power'],
};

export function Dock() {
  const status = useIntroStore((s) => s.status);
  const paused = useIntroStore((s) => s.paused);
  const autoAdvance = useIntroStore((s) => s.autoAdvance);
  const audio = useDisplayStore((s) => s.audio);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const mode = useDisplayStore((s) => s.renderMode);
  const loadProgress = useDisplayStore((s) => s.loadProgress);
  const focusRequest = useUiStore((s) => s.focusRequest);
  const wide = useMediaQuery('(min-width: 1024px)');
  const [moreOpen, setMoreOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sheetId = useId();
  const reasonId = useId();
  const initialFocus = useRef(false);

  const intro = useIntroStore.getState;
  const powered = isPoweredStatus(status);
  const loading = status === 'loading';

  const keys: KeySpec[] = [
    {
      id: 'power',
      label: powered ? 'Switch off' : 'Switch on',
      onPress: () => intro().power(),
      disabled: loading,
      busy: loading,
      large: !powered,
      pri: 3,
    },
  ];
  if (status === 'warming' || status === 'playing') {
    keys.push({
      id: 'skip',
      label: 'Skip intro',
      onPress: () => intro().skip(),
      disabled: status === 'warming',
      pri: 1,
    });
  }
  if (status === 'playing' && (!calm || autoAdvance)) {
    keys.push({
      id: 'pause',
      label: paused ? 'Play' : 'Pause',
      onPress: () => intro().togglePause(),
      pri: 2,
    });
  }
  if (status === 'ended')
    keys.push({ id: 'replay', label: 'Replay', onPress: () => intro().replay(), pri: 1 });
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
  const manual = status === 'ended' || (calm && (status === 'playing' || status === 'warming'));
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
  if (status === 'ended')
    keys.push({ id: 'index', label: 'Index', onPress: () => intro().goIndex(), pri: 5 });
  if (calm && status === 'playing') {
    keys.push({
      id: 'auto',
      label: autoAdvance ? 'Auto-advance: On' : 'Auto-advance: Off',
      onPress: () => intro().toggleAutoAdvance(),
      pressed: autoAdvance,
      pri: 5,
    });
  }

  const compact = (mode === '3d-screen' || (mode === '2d' && !wide)) && keys.length > 4;
  const inline = compact
    ? new Set(
        keys
          .map((k, i) => ({ k, i }))
          .sort((a, b) => a.k.pri - b.k.pri || a.i - b.i)
          .slice(0, 3)
          .map((x) => x.k.id),
      )
    : null;
  const visible = inline ? keys.filter((k) => inline.has(k.id)) : keys;
  const more = inline ? keys.filter((k) => !inline.has(k.id)) : [];

  const focusKey = (target: FocusTarget) => {
    for (const id of FOCUS_FALLBACK[target]) {
      const el = ref.current?.querySelector<HTMLElement>(`[data-key="${id}"]`);
      if (el) {
        el.focus();
        return;
      }
    }
  };

  // Focus moves requested by store actions (Skip -> Replay, Replay -> Pause).
  useEffect(() => {
    if (focusRequest) focusKey(focusRequest.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  // If the focused key was removed by a status change, focus does not fall to the page.
  useEffect(() => {
    if (document.activeElement === document.body && status === 'ended') focusKey('replay');
  }, [status]);

  // Power gets focus once ready, but only if the visitor has not already moved focus.
  useEffect(() => {
    if (status === 'ready' && !initialFocus.current) {
      initialFocus.current = true;
      if (document.activeElement === document.body) focusKey('power');
    }
  }, [status]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        ref.current?.querySelector<HTMLElement>('[data-key="more"]')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const pct = Math.round(loadProgress * 100);
  return (
    <div className="dock" ref={ref} role="group" aria-label="Television controls">
      {loading && (
        <p className="dock__reason" id={reasonId}>
          Tuning in, {pct}%
        </p>
      )}
      <div className="dock__keys">
        {visible.map((k) => (
          <DockKey
            key={k.id}
            id={k.id}
            label={k.label}
            onPress={k.onPress}
            disabled={k.disabled}
            pressed={k.pressed}
            busy={k.busy}
            large={k.large}
            describedBy={k.id === 'power' && loading ? reasonId : undefined}
          />
        ))}
        {more.length > 0 && (
          <DockKey
            id="more"
            label="More"
            onPress={() => setMoreOpen((o) => !o)}
            expanded={moreOpen}
            controls={sheetId}
          />
        )}
      </div>
      {more.length > 0 && moreOpen && (
        <div className="dock__sheet" id={sheetId} role="group" aria-label="More controls">
          {more.map((k) => (
            <DockKey
              key={k.id}
              id={k.id}
              label={k.label}
              onPress={() => {
                k.onPress();
                setMoreOpen(false);
              }}
              disabled={k.disabled}
              pressed={k.pressed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
