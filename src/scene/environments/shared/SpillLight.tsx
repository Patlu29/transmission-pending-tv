import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import type { PointLight } from 'three';
import { spill, type RoomClock } from './clock.ts';

/**
 * A point light whose intensity is `base * spill(t)`: the shared generic light spill (components no
 * faster than 1.3 Hz, plus or minus 13 per cent, never driven by the video). Exactly `base` under Calm.
 */
export function SpillLight({
  clock,
  calm,
  base,
  position,
  color = '#ffffff',
  distance = 0,
  decay = 2,
}: {
  clock: MutableRefObject<RoomClock>;
  calm: boolean;
  base: number;
  position: [number, number, number];
  color?: string;
  distance?: number;
  decay?: number;
}) {
  const light = useRef<PointLight>(null);
  useFrame(() => {
    if (light.current) light.current.intensity = base * spill(clock.current.t, calm);
  });
  return (
    <pointLight
      ref={light}
      position={position}
      color={color}
      intensity={base}
      distance={distance}
      decay={decay}
    />
  );
}
