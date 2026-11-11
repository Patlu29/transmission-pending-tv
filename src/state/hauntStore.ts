import { create } from 'zustand';

/**
 * Haunting state (design-spec 16.3). WRITTEN ONLY by the cue scheduler
 * (`src/state/hauntScheduler.ts`). The scene and rasteriser read it; they never write.
 * Every numeric field is 0 and `textEffects` is empty whenever `displayStore.reducedMotion` is true.
 * In `useFrame` read it with `useHauntStore.getState()` (no subscription).
 *
 * Units: state values are 0..1. `dur` and `over` are SECONDS. `startedAt` is a
 * `performance.now()` timestamp in ms. `elapsed` is milliseconds of unpaused show time.
 */
export type TextEffectKind = 'tremble' | 'rewrite' | 'bleed';

export interface TextEffect {
  kind: TextEffectKind;
  /** performance.now() when the effect began. */
  startedAt: number;
  /** Seconds. */
  dur: number;
  /** Milliseconds of unpaused time since it began (frozen by Pause). Use this for animation. */
  elapsed: number;
  params: {
    /** tremble: glyph offset in em. */
    amp?: number;
    /** rewrite: nth space-separated token (from 1), the replacement letters, hold in seconds. */
    word?: number;
    to?: string;
    hold?: number;
    /** bleed: rows below the line (always 1). */
    rows?: number;
  };
}

export interface RollState {
  active: boolean;
  /** performance.now() ms. */
  startedAt: number;
  /** Seconds. */
  dur: number;
}

/** The `glitch` cue (design-spec-2050 4.3): the display's own UI chrome dips in opacity, never below 0.55. */
export interface GlitchState {
  active: boolean;
  /** performance.now() ms. */
  startedAt: number;
  /** Seconds. */
  dur: number;
  /** 0..1: depth of the dip (opacity goes to 1 - amp x 0.45, floored at 0.55). */
  amp: number;
}

export const GLITCH_MIN_OPACITY = 0.55;
export const GLITCH_MAX_DIP = 0.45;

/**
 * Chrome opacity for a glitch at `elapsedMs`: a smooth single dip (sine squared, so at most one dip
 * of about 0.5 to 0.7 Hz, well under 1.5 Hz), never below 0.55. Pure.
 */
export function glitchOpacity(g: Pick<GlitchState, 'amp' | 'dur'>, elapsedMs: number): number {
  const x = elapsedMs / (g.dur * 1000);
  if (!(x > 0 && x < 1)) return 1;
  const env = Math.sin(Math.PI * x) ** 2;
  return Math.max(GLITCH_MIN_OPACITY, 1 - g.amp * GLITCH_MAX_DIP * env);
}

export interface KnobCue {
  /** Increments for every cue so the scene can detect a new one. */
  nonce: number;
  which: 'channel' | 'volume';
  /** Degrees, -60 to 60. */
  deg: number;
  /** Seconds. */
  dur: number;
}

export interface HauntValues {
  /** Figure visibility (how much has emerged). */
  ghost: number;
  /** Figure closeness (size and position). */
  ghostNear: number;
  /** Camera push-in, 3d-set only. */
  creep: number;
  /** Room light removed (3d-set) or extra edge vignette (3d-screen and 2d). */
  dim: number;
  /** Wall decal opacity (3d-set). */
  shadow: number;
  /** Audio swell (only audible if sound is on). */
  hum: number;
}

interface HauntState extends HauntValues {
  roll: RollState;
  knobCue: KnobCue | null;
  /** Running glitch of the display's UI chrome, or idle. */
  glitch: GlitchState;
  /** Map of IntroLine id to the running effect. At most one entry (one effect at a time). */
  textEffects: Record<string, TextEffect>;
  /**
   * True while an event cue is queued, running or scheduled for the current page.
   * The clock extends the page hold (at most 6 s) while it is true.
   */
  busy: boolean;
}

export const HAUNT_ZERO: HauntValues = {
  ghost: 0,
  ghostNear: 0,
  creep: 0,
  dim: 0,
  shadow: 0,
  hum: 0,
};

export const HAUNT_IDLE_ROLL: RollState = { active: false, startedAt: 0, dur: 0 };
export const HAUNT_IDLE_GLITCH: GlitchState = { active: false, startedAt: 0, dur: 0, amp: 0 };

export const useHauntStore = create<HauntState>()(() => ({
  ...HAUNT_ZERO,
  roll: HAUNT_IDLE_ROLL,
  knobCue: null,
  glitch: HAUNT_IDLE_GLITCH,
  textEffects: {},
  busy: false,
}));
