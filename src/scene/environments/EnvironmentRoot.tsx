import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useDisplayStore } from '../integration/stores';
import type { EnvironmentModule } from './contract.ts';
import { EnvironmentCamera } from './EnvironmentCamera.tsx';
import { useChannelNumber, useColourActive, useEnvironmentStore } from './seam.ts';

/**
 * Mounts one room: its Scene, the shared camera and projector, and the viewport uniforms. Used for every
 * environment except tv-room (which composes the same pieces itself so channel 0 keeps v1's rig).
 */
export function EnvironmentRoot({ module }: { module: EnvironmentModule }) {
  const calm = useDisplayStore((s) => s.reducedMotion);
  const pose = useEnvironmentStore((s) => s.pose);
  const colour = useColourActive() ? 'colour' : 'bw';
  const channel = useChannelNumber();
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [calm, pose, colour, channel, invalidate]);
  const Scene = module.Scene;
  return (
    <>
      <Scene calm={calm} pose={pose} colour={colour} channel={channel} />
      <EnvironmentCamera envId={module.id} />
    </>
  );
}
