/* eslint-disable react-hooks/immutability -- R3F materials are mutated imperatively by design */
// INTEGRATION SEAM 4 of 4 (part): the CRT material for the screen.
//
// Builds the technical-artist's CRT material and copies the shared `screenState`
// (screenState.ts) and the haunt store into its uniforms every frame. 3d-set passes it
// to <TvBody> as the glass material (objects/TvSet.tsx); 3d-screen draws it on
// <ScreenSurface> (objects/ScreenSurface.tsx).
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { createCrtScreenMaterial, rollPhase } from '../materials';
import { publishSceneTest } from './testHook';
import { screenState } from './screenState';
import { readHaunt, useDisplayStore, useIntroStore } from './stores';
import { useScreenTexture } from './useScreenTexture';

const rollScratch = { active: false, startedAt: 0, dur: 0 };

export function useCrtMaterial(aspect: number, curvature: number) {
  const map = useScreenTexture();
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(
    () => createCrtScreenMaterial(null, { uAspect: aspect, uCurvature: curvature }),
    [aspect, curvature],
  );
  useEffect(() => {
    publishSceneTest({ crtUniforms: material.uniforms });
    return () => material.dispose();
  }, [material]);
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
    // rollPhase wants seconds on one clock: startedAt is performance.now() ms, dur is seconds.
    // The roll is never applied while the test card shows (only playing or ended).
    const st = useIntroStore.getState().status;
    rollScratch.active = h.roll.active && (st === 'playing' || st === 'ended');
    rollScratch.startedAt = h.roll.startedAt / 1000;
    rollScratch.dur = h.roll.dur;
    set('uRoll', rollPhase(rollScratch, performance.now() / 1000));
    // 3d-set dims the room instead; 3d-screen darkens the corners (outside the text safe area).
    const edge = useDisplayStore.getState().renderMode === '3d-screen' ? h.dim * 0.25 : 0;
    set('uHauntVignette', edge);
    if (rollScratch.active) state.invalidate();
  });

  return material;
}
