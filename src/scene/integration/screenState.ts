// INTEGRATION SEAM 2 of 4: shared mutable screen state.
//
// Written every frame by <ScreenDriver> (src/scene/ScreenDriver.tsx), read by the
// screen material (copied into CRT uniforms in objects/ScreenSurface.tsx) and by
// the room light. A plain object, not React state, so nothing re-renders per frame.
import { COLLAPSE_SECONDS, WARMUP_SECONDS } from '../shaders/crt/createCrtMaterial';

export interface ScreenState {
  /** Screen has power (warming, playing or ended), or is still collapsing. */
  powered: boolean;
  /** Seconds of animation time. Frozen (not advanced) under reduced motion or Calm. */
  time: number;
  /** CRT uWarmup: 0 = set off, 0..1 over the 2.2 s warm-up, 1 = settled. */
  warmup: number;
  /** CRT uCollapse: 0 = not collapsing, 0..1 over the power-off collapse, 1 = black. */
  collapse: number;
  /** Milliseconds since warm-up began, or -1 when not warming (reduced motion never warms). */
  warmMs: number;
  /** CRT uBrightness: 0.4 for the dim loading card, otherwise 1. */
  brightness: number;
  /** CRT uNoiseHz: 24 with no text (idle, warm-up), 12 behind text. */
  noiseHz: number;
  /** CRT uBar: 0 on the diary index (status ended), else 1. */
  bar: number;
  /** True while a live channel drives the room light itself (LiveSpill); ScreenDriver then leaves meanLuminance alone. */
  liveOverride: boolean;
  /** True under reduced motion or Calm. */
  reduced: boolean;
  /** Estimated mean relative luminance of the picture (0..0.5), before the 2 Hz low-pass. */
  meanLuminance: number;
}

export const screenState: ScreenState = {
  powered: false,
  time: 0,
  warmup: 0,
  collapse: 0,
  brightness: 1,
  warmMs: -1,
  liveOverride: false,
  noiseHz: 24,
  bar: 1,
  reduced: false,
  meanLuminance: 0,
};

export const WARMUP_MS = WARMUP_SECONDS * 1000;
export const COLLAPSE_MS = COLLAPSE_SECONDS * 1000;
