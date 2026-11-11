import cuesText from '@/content/intro.cues?raw';
import { intro } from '@/facts';
import { rewriteTimelineMs, letterIndices, wordRange } from '@/ui/teletext/effects';
import { parseCues, isStateCue, type Cue, type StateCueKind } from './cues';
import { useDisplayStore } from './displayStore';
import { useIntroStore, type IntroStatus } from './introStore';
import {
  HAUNT_EASE_OUT_NATURAL_MS,
  HAUNT_EASE_OUT_SKIP_MS,
  HAUNT_CREEP_REPLAY_MS,
  HAUNT_MIN_STEP_S,
  CUE_END_DELAY_MS,
} from './timing';
import {
  HAUNT_IDLE_GLITCH,
  HAUNT_IDLE_ROLL,
  HAUNT_ZERO,
  useHauntStore,
  type HauntValues,
  type TextEffect,
} from './hauntStore';

/** Peak change per second for each state, so no step beats 0.1 of its range in 300 ms (design-spec 16.7). */
const RATE: Record<StateCueKind, number> = {
  ghost: 0.08,
  'ghost-near': 0.08,
  creep: 0.04,
  dim: 0.15,
  shadow: 0.1,
  hum: 0.15,
};

const KEY_OF: Record<StateCueKind, keyof HauntValues> = {
  ghost: 'ghost',
  'ghost-near': 'ghostNear',
  creep: 'creep',
  dim: 'dim',
  shadow: 'shadow',
  hum: 'hum',
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

interface Ramp {
  from: number;
  to: number;
  start: number;
  over: number;
}

/**
 * Fires the cues in src/content/intro.cues as the intro crosses their anchors
 * and writes `hauntStore`. Runs on its own rAF loop, only while something is
 * happening. Pause freezes it; Calm zeroes everything within one frame.
 */
export function startHauntScheduler(): () => void {
  const parsed = parseCues(cuesText, intro);
  for (const e of parsed.errors) console.error(`[cues] ${e}`);
  for (const w of parsed.warnings) console.warn(`[cues] ${w}`);
  const cues = parsed.cues;

  let raf = 0;
  let last = 0;
  let now = 0;
  let statusSeen: IntroStatus | null = null;
  let epochSeen = -1;
  let started = new Set<string>();
  let ended = new Set<string>();
  let fired = new Set<number>();
  let pending: Array<{ cue: Cue; at: number }> = [];
  let queue: Cue[] = [];
  let running: { lineId: string; startNow: number; effect: TextEffect } | null = null;
  let rollEndNow = 0;
  let glitchEndNow = 0;
  let knobNonce = 0;
  const values: HauntValues = { ...HAUNT_ZERO };
  const ramps: Partial<Record<keyof HauntValues, Ramp>> = {};

  const reachedZero = () =>
    Object.values(values).every((v) => v === 0) &&
    Object.keys(ramps).length === 0 &&
    !running &&
    pending.length === 0 &&
    queue.length === 0 &&
    rollEndNow === 0 &&
    glitchEndNow === 0;

  function resetTracking() {
    started = new Set();
    ended = new Set();
    fired = new Set();
    pending = [];
    queue = [];
  }

  function publish() {
    const s = useHauntStore.getState();
    const roll = rollEndNow > 0 ? s.roll : HAUNT_IDLE_ROLL;
    const glitch = glitchEndNow > 0 ? s.glitch : HAUNT_IDLE_GLITCH;
    const effects = running ? { [running.lineId]: running.effect } : {};
    const busy =
      queue.length > 0 ||
      running !== null ||
      rollEndNow > 0 ||
      pending.some((p) => !isStateCue(p.cue.kind) && p.cue.kind !== 'knob');
    let changed = s.busy !== busy || s.roll !== roll || s.glitch !== glitch;
    for (const k of Object.keys(values) as Array<keyof HauntValues>) {
      if (Math.abs(s[k] - values[k]) > 1e-4) changed = true;
    }
    if (running || Object.keys(s.textEffects).length > 0) changed = true;
    if (changed) useHauntStore.setState({ ...values, busy, roll, glitch, textEffects: effects });
  }

  function zeroAll() {
    Object.assign(values, HAUNT_ZERO);
    for (const k of Object.keys(ramps) as Array<keyof HauntValues>) delete ramps[k];
    running = null;
    rollEndNow = 0;
    glitchEndNow = 0;
    resetTracking();
    useHauntStore.setState({
      ...HAUNT_ZERO,
      roll: HAUNT_IDLE_ROLL,
      glitch: HAUNT_IDLE_GLITCH,
      knobCue: null,
      textEffects: {},
      busy: false,
    });
  }

  function easeOut(ms: number) {
    pending = [];
    queue = [];
    running = null;
    rollEndNow = 0;
    glitchEndNow = 0;
    for (const k of Object.keys(values) as Array<keyof HauntValues>) {
      if (values[k] > 0) ramps[k] = { from: values[k], to: 0, start: now, over: ms };
    }
  }

  function startState(cue: Cue) {
    const key = KEY_OF[cue.kind as StateCueKind];
    const to = Number(cue.params.to);
    const from = values[key];
    // Rate limit: smoothstep peaks at 1.5 times the mean speed.
    const minOver = Math.max(
      HAUNT_MIN_STEP_S,
      (1.5 * Math.abs(to - from)) / RATE[cue.kind as StateCueKind],
    );
    const over = Math.max(Number(cue.params.over), minOver) * 1000;
    ramps[key] = { from, to, start: now, over };
  }

  function startEffect(cue: Cue) {
    const lineId = cue.anchor.lineId;
    if (!lineId) return;
    const line = intro.pages.flatMap((p) => p.lines).find((l) => l.id === lineId);
    if (!line) return;
    let durS = Number(cue.params.dur);
    if (cue.kind === 'rewrite') {
      const range = wordRange(line.text, Number(cue.params.word));
      const n = range ? letterIndices(line.text, range).length : 0;
      durS = Math.max(durS, rewriteTimelineMs(n, Number(cue.params.hold)) / 1000);
    }
    const effect: TextEffect = {
      kind: cue.kind as TextEffect['kind'],
      startedAt: performance.now(),
      dur: durS,
      elapsed: 0,
      params: {
        amp: cue.params.amp === undefined ? undefined : Number(cue.params.amp),
        word: cue.params.word === undefined ? undefined : Number(cue.params.word),
        to: cue.params.to === undefined ? undefined : String(cue.params.to),
        hold: cue.params.hold === undefined ? undefined : Number(cue.params.hold),
        rows: cue.params.rows === undefined ? undefined : Number(cue.params.rows),
      },
    };
    running = { lineId, startNow: now, effect };
  }

  function fire(cue: Cue) {
    switch (cue.kind) {
      case 'tremble':
      case 'rewrite':
      case 'bleed':
        queue.push(cue);
        break;
      case 'roll': {
        const dur = Number(cue.params.dur);
        rollEndNow = now + dur * 1000;
        useHauntStore.setState({ roll: { active: true, startedAt: performance.now(), dur } });
        break;
      }
      case 'glitch': {
        const dur = Number(cue.params.dur);
        glitchEndNow = now + dur * 1000;
        useHauntStore.setState({
          glitch: { active: true, startedAt: performance.now(), dur, amp: Number(cue.params.amp) },
        });
        break;
      }
      case 'knob':
        useHauntStore.setState({
          knobCue: {
            nonce: ++knobNonce,
            which: cue.params.which === 'volume' ? 'volume' : 'channel',
            deg: Number(cue.params.deg),
            dur: Number(cue.params.over),
          },
        });
        break;
      default:
        startState(cue);
    }
  }

  function observe() {
    const s = useIntroStore.getState();
    const page = intro.pages[s.pageIndex];
    const line = page?.lines[s.lineIndex];
    if (!page || !line) return;
    started.add(line.id);
    if (s.lineIndex === 0) started.add(page.id);
    if (s.revealedChars >= line.text.length) {
      ended.add(`${line.id}@end`);
      if (s.lineIndex === page.lines.length - 1) ended.add(`${page.id}@end`);
    }
    for (const cue of cues) {
      if (fired.has(cue.index)) continue;
      const base = cue.anchor.lineId ?? cue.anchor.pageId;
      const hit = cue.anchor.end ? ended.has(`${base}@end`) : started.has(base);
      if (!hit) continue;
      fired.add(cue.index);
      const delay = (cue.anchor.end ? CUE_END_DELAY_MS : 0) + cue.anchor.offsetS * 1000;
      pending.push({ cue, at: now + delay });
    }
  }

  function transition(s: ReturnType<typeof useIntroStore.getState>, prev: IntroStatus | null) {
    if (s.status === 'ended' && prev === 'playing') {
      easeOut(s.endReason === 'skip' ? HAUNT_EASE_OUT_SKIP_MS : HAUNT_EASE_OUT_NATURAL_MS);
      resetTracking();
    } else if (s.status === 'playing' && prev === 'ended') {
      // Replay: everything at once, camera creep over 700 ms.
      const creep = values.creep;
      zeroAll();
      if (creep > 0) {
        values.creep = creep;
        ramps.creep = { from: creep, to: 0, start: now, over: HAUNT_CREEP_REPLAY_MS };
      }
    } else if (s.status !== 'ended') {
      zeroAll();
    }
  }

  const tick = (dt: number) => {
    const s = useIntroStore.getState();
    const calm = useDisplayStore.getState().reducedMotion;
    if (s.status !== statusSeen || s.epoch !== epochSeen) {
      const prev = statusSeen;
      const statusChanged = s.status !== statusSeen;
      statusSeen = s.status;
      epochSeen = s.epoch;
      if (statusChanged) transition(s, prev);
      else if (s.status === 'playing') zeroAll(); // epoch jump while playing (Calm paging): start clean
    }
    if (calm) {
      if (!reachedZero() || useHauntStore.getState().busy || useHauntStore.getState().knobCue)
        zeroAll();
      return;
    }
    if (!(s.status === 'playing' && s.paused)) now += dt;
    if (s.status === 'playing' && !s.blank && !s.paused) observe();

    // Scheduled cues.
    if (!(s.status === 'playing' && s.paused)) {
      const due = pending.filter((p) => p.at <= now);
      if (due.length > 0) {
        pending = pending.filter((p) => p.at > now);
        for (const p of due) fire(p.cue);
      }
      // One text effect at a time.
      if (!running && queue.length > 0) {
        const next = queue.shift();
        if (next) startEffect(next);
      }
    }

    // Ramps.
    for (const k of Object.keys(ramps) as Array<keyof HauntValues>) {
      const r = ramps[k];
      if (!r) continue;
      const x = (now - r.start) / r.over;
      values[k] = r.from + (r.to - r.from) * smooth(x);
      if (x >= 1) {
        values[k] = r.to;
        delete ramps[k];
      }
    }

    if (running) {
      running.effect = { ...running.effect, elapsed: now - running.startNow };
      if (running.effect.elapsed >= running.effect.dur * 1000) running = null;
    }
    if (rollEndNow > 0 && now >= rollEndNow) rollEndNow = 0;
    if (glitchEndNow > 0 && now >= glitchEndNow) glitchEndNow = 0;
    publish();
  };

  const loop = (t: number) => {
    raf = 0;
    const gap = t - last;
    const dt = gap > 1000 ? 0 : Math.max(0, gap); // real time; a gap over 1 s is a hidden tab or stall
    last = t;
    tick(dt);
    ensure();
  };

  function ensure() {
    if (raf) return;
    const s = useIntroStore.getState();
    const active = s.status === 'playing' || !reachedZero();
    const calmDirty = useDisplayStore.getState().reducedMotion && !reachedZero();
    if (active || calmDirty || s.status !== statusSeen) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  const unsubs = [useIntroStore.subscribe(ensure), useDisplayStore.subscribe(ensure)];
  ensure();
  return () => {
    unsubs.forEach((u) => u());
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    zeroAll();
  };
}
