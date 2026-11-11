/* eslint-disable react-hooks/immutability -- room uniforms and the decal material are mutated imperatively by design */
// Mounts the technical-artist's HoloEnvironment and HoloRoom and drives them from the scene: one set of room
// uniforms for this scene (registered so the projector writes `uKeepOut`), `uRoomLight` = 1 - dim x 0.65 low-passed
// at 2 Hz (the haunt `dim` cue; none on live channels), and the Occupant's wall decal (at most 0.10 on channel 0;
// a static 0.04 at most on live channels, none under Calm).
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { MeshBasicMaterial } from 'three';
import { setActiveUniforms } from '../environments/shared/roomUniforms.ts';
import { readHaunt, useDisplayStore } from '../integration/stores';
import { createHoloRoomUniforms, decalOpacity, HoloEnvironment, HoloRoom } from '../materials/holo';

const DIM_MAX = 0.65;
const CUTOFF_HZ = 2;
const ENV_INTENSITY = 0.5;

export function HoloRoomHost({ live = false }: { live?: boolean }) {
  const decalRef = useRef<MeshBasicMaterial>(null);
  const uniforms = useMemo(() => createHoloRoomUniforms(), []);
  const dimSmoothed = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const phone = useDisplayStore((s) => s.renderMode === '3d-screen');

  useLayoutEffect(() => {
    setActiveUniforms(uniforms);
    return () => setActiveUniforms(null);
  }, [uniforms]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const dimTarget = live ? 0 : readHaunt().dim;
    dimSmoothed.current +=
      (dimTarget - dimSmoothed.current) * (1 - Math.exp(-2 * Math.PI * CUTOFF_HZ * dt));
    if (Math.abs(dimTarget - dimSmoothed.current) > 0.0005) invalidate();
    else dimSmoothed.current = dimTarget;
    uniforms.uRoomLight.value = 1 - dimSmoothed.current * DIM_MAX;
    if (decalRef.current) {
      decalRef.current.opacity = live
        ? useDisplayStore.getState().reducedMotion
          ? 0
          : 0.04
        : decalOpacity(readHaunt().shadow);
    }
  });

  return (
    <>
      <HoloEnvironment intensity={ENV_INTENSITY} />
      <HoloRoom
        calm={calm}
        uniforms={uniforms}
        decalRef={decalRef}
        quality={phone ? 'low' : 'high'}
      />
    </>
  );
}
