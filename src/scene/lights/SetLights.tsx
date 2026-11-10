/* eslint-disable react-hooks/immutability -- three.js lights and scene are mutated imperatively */
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { AmbientLight, DirectionalLight, PointLight } from 'three';
import { screenState } from '../integration/screenState';
import { readHaunt } from '../integration/stores';

const MAX_INTENSITY = 4; // point-light intensity at full (never reached: ceiling below)
const CEILING = 0.25; // spec 7.5: at most 25 per cent of max
const CUTOFF_HZ = 2; // spec 7.5: one-pole low-pass at 2 Hz
const AMBIENT = 0.35;
const KEY = 0.9;
const ENV = 0.4; // GreyEnvironment intensity in Experience
const DIM_MAX = 0.65; // spec 16.6.3: room x (1 - dim x 0.65)

/**
 * Dark-room lighting. A very dim neutral key so the cabinet reads, and a point
 * light in front of the glass driven by the screen's mean luminance through a
 * one-pole low-pass at 2 Hz, so the room never flickers with the noise.
 * All lights are white (greyscale guarantee).
 */
export function SetLights() {
  const glow = useRef<PointLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const key = useRef<DirectionalLight>(null);
  const dimSmoothed = useRef(0);
  const scene = useThree((s) => s.scene);
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

    // Room dim (haunt): key, ambient and environment only. The screen glow is not dimmed.
    const dimTarget = readHaunt().dim;
    dimSmoothed.current +=
      (dimTarget - dimSmoothed.current) * (1 - Math.exp(-2 * Math.PI * CUTOFF_HZ * dt));
    if (Math.abs(dimTarget - dimSmoothed.current) > 0.0005) invalidate();
    else dimSmoothed.current = dimTarget;
    const room = 1 - dimSmoothed.current * DIM_MAX;
    if (ambient.current) ambient.current.intensity = AMBIENT * room;
    if (key.current) key.current.intensity = KEY * room;
    scene.environmentIntensity = ENV * room;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={AMBIENT} color="#ffffff" />
      <directionalLight ref={key} position={[-2, 3, 2]} intensity={KEY} color="#ffffff" />
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
