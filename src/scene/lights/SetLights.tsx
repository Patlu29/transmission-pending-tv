import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { PointLight } from 'three';
import { screenState } from '../integration/screenState';

const MAX_INTENSITY = 4; // point-light intensity at full (never reached: ceiling below)
const CEILING = 0.25; // spec 7.5: at most 25 per cent of max
const CUTOFF_HZ = 2; // spec 7.5: one-pole low-pass at 2 Hz

/**
 * Dark-room lighting. A very dim neutral key so the cabinet reads, and a point
 * light in front of the glass driven by the screen's mean luminance through a
 * one-pole low-pass at 2 Hz, so the room never flickers with the noise.
 * All lights are white (greyscale guarantee).
 */
export function SetLights() {
  const glow = useRef<PointLight>(null);
  const smoothed = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  useFrame((_, delta) => {
    const light = glow.current;
    if (!light) return;
    const target = screenState.meanLuminance;
    const dt = Math.min(delta, 0.1);
    smoothed.current += (target - smoothed.current) * (1 - Math.exp(-2 * Math.PI * CUTOFF_HZ * dt));
    const level = Math.min(1, smoothed.current / 0.5); // 0.5 = luminance ceiling in spec 7.3
    light.intensity = MAX_INTENSITY * CEILING * level;
    if (Math.abs(target - smoothed.current) > 0.002) invalidate();
    else smoothed.current = target;
  });

  return (
    <>
      <ambientLight intensity={0.9} color="#ffffff" />
      <directionalLight position={[-2, 3, 2]} intensity={0.9} color="#ffffff" />
      <pointLight
        ref={glow}
        position={[0, 0, 0.45]}
        intensity={0}
        distance={6}
        decay={1.6}
        color="#ffffff"
      />
    </>
  );
}
