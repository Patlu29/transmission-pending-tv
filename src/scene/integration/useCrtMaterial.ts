/* eslint-disable react-hooks/immutability -- R3F materials are mutated imperatively by design */
// INTEGRATION SEAM 4 of 4 (part): the CRT material for the screen.
//
// Builds the technical-artist's CRT material and copies the shared `screenState`
// (screenState.ts) and the haunt store into its uniforms every frame. 3d-set passes it
// to <TvBody> as the glass material (objects/TvSet.tsx); 3d-screen draws it on
// <ScreenSurface> (objects/ScreenSurface.tsx).
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { createCrtScreenMaterial } from '../materials';
import { screenState } from './screenState';
import { readHaunt, useDisplayStore } from './stores';
import { useScreenTexture } from './useScreenTexture';

/** Roll offset in screen heights (spec 16.6.1): sine in-out, last 400 ms a damped settle. */
function rollOffset(startedAt: number, dur: number, now: number): number {
  const durMs = dur > 20 ? dur : dur * 1000; // tolerate seconds or milliseconds
  const e = now - startedAt;
  if (e <= 0 || e >= durMs) return 0;
  const mainMs = Math.max(1, durMs - 400);
  if (e < mainMs) {
    const u = e / mainMs;
    return (0.5 - 0.5 * Math.cos(Math.PI * u)) * 1.02; // overshoots by 2 per cent
  }
  const u = (e - mainMs) / 400;
  return 1.02 - 0.02 * (u * u * (3 - 2 * u)); // settles on 1.0, the same picture as 0
}

export function useCrtMaterial(aspect: number, curvature: number) {
  const map = useScreenTexture();
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(
    () => createCrtScreenMaterial(null, { uAspect: aspect, uCurvature: curvature }),
    [aspect, curvature],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uniforms.uMap.value = map;
    invalidate();
  }, [material, map, invalidate]);

  useFrame((state) => {
    const u = material.uniforms as unknown as Record<string, { value: unknown } | undefined>;
    const set = (name: string, value: unknown) => {
      const slot = u[name];
      if (slot) slot.value = value; // haunt uniforms are skipped until the shader has them
    };
    set('uTime', screenState.time);
    set('uWarmup', screenState.warmup);
    set('uCollapse', screenState.collapse);
    set('uCalm', screenState.reduced ? 1 : 0);
    set('uJitter', screenState.reduced ? 0 : 1);
    set('uBrightness', screenState.brightness);
    set('uNoiseHz', screenState.noiseHz);
    set('uBar', screenState.bar);
    set('uPixelRatio', state.gl.getPixelRatio());
    // Haunt (all zero under Calm via readHaunt).
    const h = readHaunt();
    set('uGhost', h.ghost);
    set('uGhostNear', h.ghostNear);
    set('uRoll', h.roll.active ? rollOffset(h.roll.startedAt, h.roll.dur, performance.now()) : 0);
    // 3d-set dims the room instead; 3d-screen darkens the corners (outside the text safe area).
    const edge = useDisplayStore.getState().renderMode === '3d-screen' ? h.dim * 0.25 : 0;
    set('uHauntVignette', edge);
    if (h.roll.active) state.invalidate();
  });

  return material;
}
