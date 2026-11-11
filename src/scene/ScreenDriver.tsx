import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { COLLAPSE_MS, screenState, WARMUP_MS } from './integration/screenState';
import { useDisplayStore, useHauntStore, useIntroStore } from './integration/stores';
import { estimateHoloMeanLuminance } from './materials/holo';

/**
 * Derives screenState (warm-up timeline, CRT collapse on power-off, brightness,
 * animation time) from the stores. Renders nothing. Keeps requesting frames only
 * while something is moving, so the demand frame loop stays idle otherwise.
 */
export function ScreenDriver() {
  const invalidate = useThree((s) => s.invalidate);
  const warmStart = useRef(-1);
  const collapseMs = useRef(COLLAPSE_MS); // COLLAPSE_MS means finished
  const prevPowered = useRef(false);
  const prevStatus = useRef(useIntroStore.getState().status);

  useEffect(() => {
    const onChange = () => {
      const { status } = useIntroStore.getState();
      const reduced = useDisplayStore.getState().motion === 'reduced';
      const powered = status === 'warming' || status === 'playing' || status === 'ended';
      if (status === 'warming' && prevStatus.current !== 'warming')
        warmStart.current = performance.now();
      if (powered && !prevPowered.current) collapseMs.current = COLLAPSE_MS; // reset
      if (!powered && prevPowered.current) collapseMs.current = reduced ? COLLAPSE_MS : 0;
      prevPowered.current = powered;
      prevStatus.current = status;
      invalidate();
    };
    onChange();
    const a = useIntroStore.subscribe(onChange);
    const b = useDisplayStore.subscribe(onChange);
    const c = useHauntStore.subscribe(() => invalidate());
    return () => {
      a();
      b();
      c();
    };
  }, [invalidate]);

  useFrame((_, delta) => {
    const { status } = useIntroStore.getState();
    const reduced = useDisplayStore.getState().motion === 'reduced';
    const powered = status === 'warming' || status === 'playing' || status === 'ended';
    const s = screenState;
    let moving = false;

    s.reduced = reduced;
    if (!reduced) {
      s.time += delta;
    }

    if (status === 'warming' && !reduced) {
      s.warmMs = performance.now() - warmStart.current;
      moving = s.warmMs < WARMUP_MS;
    } else {
      s.warmMs = -1;
    }

    const collapsing = !powered && collapseMs.current < COLLAPSE_MS;
    if (collapsing) {
      collapseMs.current = Math.min(COLLAPSE_MS, collapseMs.current + delta * 1000);
      moving = true;
    }

    s.powered = powered || collapsing;
    s.brightness = status === 'loading' ? 0.4 : 1;
    if (collapsing) {
      s.warmup = 1;
      s.collapse = collapseMs.current / COLLAPSE_MS;
    } else if (powered) {
      s.warmup = s.warmMs >= 0 ? Math.min(1, s.warmMs / WARMUP_MS) : 1;
      s.collapse = 0;
    } else {
      s.warmup = status === 'loading' ? 1 : 0; // loading shows the dim test card
      s.collapse = 0;
    }

    s.noiseHz = status === 'playing' || status === 'ended' ? 12 : 24;
    s.bar = status === 'ended' ? 0 : 1;
    // Mean luminance for the room light, from the technical-artist's model.
    s.meanLuminance = estimateHoloMeanLuminance({
      warmup: s.warmup,
      collapse: s.collapse,
      pictureMean: status === 'playing' || status === 'ended' ? 0.12 : 0.066,
      brightness: s.brightness,
    });

    if (moving || (status === 'playing' && !reduced)) invalidate();
  });

  return null;
}
