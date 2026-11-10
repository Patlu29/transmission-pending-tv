import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { Texture } from 'three';
import {
  COLLAPSE_SECONDS,
  CRT_DEFAULTS,
  WARMUP_SECONDS,
  createCrtScreenMaterial,
  crtUniforms,
  setCrtTexture,
  type CrtShaderMaterial,
  type CrtUniformValues,
} from '../shaders/crt/createCrtMaterial.ts';

export type ScreenPhase = 'off' | 'warming' | 'on' | 'collapsing';

export interface CrtScreenMaterialProps {
  /** The teletext canvas texture (CanvasTexture). Prepared (sRGB, mipmaps) on mount. */
  texture: Texture | null;
  /** Set powered. false to true plays the warm-up, true to false plays the collapse. */
  power: boolean;
  /** Calm / reduced motion: no warm-up, no collapse animation (cut), frozen noise, no bar, no jitter. */
  calm?: boolean;
  /** Warm-up length in seconds. Default 2.2 (the shader timeline assumes 2.2, so leave it). */
  warmupSeconds?: number;
  /** Collapse length in seconds. Default 0.55. */
  collapseSeconds?: number;
  /** Controlled warm-up progress 0..1. When set it replaces the internal timer. */
  warmupProgress?: number;
  /** Controlled collapse progress 0..1. When set it replaces the internal timer. */
  collapseProgress?: number;
  /** Picture gain 0..1. Use 0.4 for the dim loading card. Default 1. */
  brightness?: number;
  /** Rolling bar 0..1. Set to 0 once the diary index shows. Default 1. */
  bar?: number;
  /** Channel-change burst 0..1 (design-spec 7.4). Default 0. */
  burst?: number;
  /** Noise rate in Hz. 24 for idle and warm-up, 12 behind text (default 12). Clamped to 24. */
  noiseHz?: number;
  /** Barrel strength. 0.04 on the domed set glass, 0.08 on a flat 3d-screen quad. Default 0.06. */
  curvature?: number;
  /** Glass aspect (width / height). Default 4/3. Pass the quad's aspect for 3d-screen. */
  aspect?: number;
  /** Occupant 0..1 (hauntStore.ghost). Forced to 0 in calm mode. */
  ghost?: number;
  /** Occupant closeness 0..1 (hauntStore.ghostNear). */
  ghostNear?: number;
  /** Changes the strip pattern. Default 0. */
  ghostSeed?: number;
  /** Roll phase 0..1 (see `rollPhase`). Forced to 0 in calm mode. */
  roll?: number;
  /** Extra edge dim 0..0.25 (hauntStore.dim x 0.25 in 3d-screen). Forced to 0 in calm mode. */
  hauntVignette?: number;
  /** Any other uniform, set once. Does not include uMap. */
  uniforms?: Partial<Omit<CrtUniformValues, 'uMap'>>;
  /** Called once when the warm-up reaches 1. */
  onWarmupEnd?: () => void;
  /** Called once when the collapse reaches 1. */
  onCollapseEnd?: () => void;
  /** Receives the live phase and the material, for tests and debug panels. */
  controlRef?: RefObject<{ phase: ScreenPhase; material: CrtShaderMaterial } | null>;
}

/**
 * Drop-in child of the `screen` mesh:
 *
 *   <mesh name="screen" geometry={...}>
 *     <CrtScreenMaterial texture={tex} power={isOn} calm={reducedMotion} />
 *   </mesh>
 *
 * Owns the clock uniforms. The scene must be rendering frames while it animates (frameloop "always",
 * or call invalidate()). Greyscale output; use NoToneMapping or NeutralToneMapping on the renderer.
 */
export function CrtScreenMaterial({
  texture,
  power,
  calm = false,
  warmupSeconds = WARMUP_SECONDS,
  collapseSeconds = COLLAPSE_SECONDS,
  warmupProgress,
  collapseProgress,
  brightness = 1,
  bar = 1,
  burst = 0,
  noiseHz = 12,
  curvature = CRT_DEFAULTS.uCurvature,
  aspect = CRT_DEFAULTS.uAspect,
  ghost = 0,
  ghostNear = 0,
  ghostSeed = 0,
  roll = 0,
  hauntVignette = 0,
  uniforms,
  onWarmupEnd,
  onCollapseEnd,
  controlRef,
}: CrtScreenMaterialProps) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(() => createCrtScreenMaterial(null, uniforms), [uniforms]);

  const live = useRef({
    phase: 'off' as ScreenPhase,
    progress: 0,
    power,
    calm,
    onWarmupEnd,
    onCollapseEnd,
    warmupProgress,
    collapseProgress,
    warmupSeconds,
    collapseSeconds,
  });
  useEffect(() => {
    Object.assign(live.current, {
      power,
      calm,
      onWarmupEnd,
      onCollapseEnd,
      warmupProgress,
      collapseProgress,
      warmupSeconds,
      collapseSeconds,
    });
    invalidate();
  }, [
    power,
    calm,
    onWarmupEnd,
    onCollapseEnd,
    warmupProgress,
    collapseProgress,
    warmupSeconds,
    collapseSeconds,
    invalidate,
  ]);

  useEffect(() => {
    setCrtTexture(material, texture);
  }, [texture, material]);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    if (controlRef) controlRef.current = { phase: live.current.phase, material };
  }, [controlRef, material]);

  useFrame((state, delta) => {
    const s = live.current;
    const u = crtUniforms(material);
    const dt = Math.min(delta, 0.1); // a hidden tab must not skip the whole warm-up

    // Phase transitions.
    if (s.power && (s.phase === 'off' || s.phase === 'collapsing')) {
      s.phase = s.calm ? 'on' : 'warming';
      s.progress = s.calm ? 1 : 0;
      if (s.calm) s.onWarmupEnd?.();
    } else if (!s.power && (s.phase === 'on' || s.phase === 'warming')) {
      s.phase = s.calm ? 'off' : 'collapsing';
      s.progress = 0;
      if (s.calm) s.onCollapseEnd?.();
    }
    if (s.calm && s.phase === 'warming') {
      s.phase = 'on';
      s.onWarmupEnd?.();
    } else if (s.calm && s.phase === 'collapsing') {
      s.phase = 'off';
      s.onCollapseEnd?.();
    }

    // Advance timers.
    if (s.phase === 'warming') {
      s.progress =
        s.warmupProgress ?? Math.min(1, s.progress + dt / Math.max(0.05, s.warmupSeconds));
      if (s.progress >= 1) {
        s.phase = 'on';
        s.onWarmupEnd?.();
      }
    } else if (s.phase === 'collapsing') {
      s.progress =
        s.collapseProgress ?? Math.min(1, s.progress + dt / Math.max(0.05, s.collapseSeconds));
      if (s.progress >= 1) {
        s.phase = 'off';
        s.onCollapseEnd?.();
      }
    }

    u.uWarmup.value = s.phase === 'off' ? 0 : s.phase === 'warming' ? s.progress : 1;
    u.uCollapse.value = s.phase === 'collapsing' ? s.progress : 0;
    // A finished collapse is black: keep the shader on its off state.
    if (s.phase === 'off') u.uCollapse.value = 0;

    u.uTime.value = state.clock.elapsedTime;
    u.uCalm.value = s.calm ? 1 : 0;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uBrightness.value = brightness;
    u.uBar.value = bar;
    u.uBurst.value = burst;
    u.uNoiseHz.value = Math.min(24, Math.max(0, noiseHz));
    u.uCurvature.value = curvature;
    u.uAspect.value = aspect;
    // Calm means everything haunted is zero.
    u.uGhost.value = s.calm ? 0 : ghost;
    u.uGhostNear.value = s.calm ? 0 : ghostNear;
    u.uGhostSeed.value = ghostSeed;
    u.uRoll.value = s.calm ? 0 : roll;
    u.uHauntVignette.value = s.calm ? 0 : Math.min(0.25, Math.max(0, hauntVignette));

    if (controlRef?.current) controlRef.current.phase = s.phase;
  });

  return <primitive object={material} attach="material" />;
}
