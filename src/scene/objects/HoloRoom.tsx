// PLACEHOLDER Holo room (design-spec-2050 3.1): deep ink floor, a frosted back-lit wall panel that receives the
// Occupant's shadow, an overhead ring light and a wall back-light whose intensity is the `dim` cue
// (x (1 - dim x 0.65), low-passed at 2 Hz), and a light cushion under the puck. TO SWAP: the technical-artist's
// coloured environment and room pieces replace this file's component; keep the decal drive in `useFrame`.
// On live channels the Occupant is off and the decal is a static 0.04 at most (none under Calm), and the room
// lights use the shared `spill(t)`; nothing here is drawn over the pane.
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { MeshBasicMaterial, PointLight } from 'three';
import { readHaunt, useDisplayStore } from '../integration/stores';
import { decalOpacity, OccupantDecal } from '../materials';
import { spill } from '../materials/rooms/roomKit.ts';
import { HOLO_LAYOUT as L } from './holoLayout';

const WALL_Z = -0.9;
const DIM_MAX = 0.65;
const CUTOFF_HZ = 2;

export function HoloRoom({ live = false }: { live?: boolean }) {
  const decalRef = useRef<MeshBasicMaterial>(null);
  const ringLight = useRef<PointLight>(null);
  const wallLight = useRef<PointLight>(null);
  const dimSmoothed = useRef(0);
  const time = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  useFrame((_, delta) => {
    const calm = useDisplayStore.getState().reducedMotion;
    const dt = Math.min(delta, 0.1);
    if (!calm) time.current += dt;
    const dimTarget = live ? 0 : readHaunt().dim;
    dimSmoothed.current +=
      (dimTarget - dimSmoothed.current) * (1 - Math.exp(-2 * Math.PI * CUTOFF_HZ * dt));
    if (Math.abs(dimTarget - dimSmoothed.current) > 0.0005) invalidate();
    else dimSmoothed.current = dimTarget;
    const room = (1 - dimSmoothed.current * DIM_MAX) * (live ? spill(time.current, calm) : 1);
    if (ringLight.current) ringLight.current.intensity = 5 * room;
    if (wallLight.current) wallLight.current.intensity = 3 * room;
    if (decalRef.current)
      decalRef.current.opacity = live ? (calm ? 0 : 0.04) : decalOpacity(readHaunt().shadow);
  });

  return (
    <group name="room">
      <mesh name="floor" position={[0, L.floorY - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#0a0f1a" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh name="wall" position={[0, 0.6, WALL_Z]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#0e1524" roughness={1} />
      </mesh>
      {/* frosted back-lit panel behind the device */}
      <mesh name="wall-panel" position={[0, 0.1, WALL_Z + 0.01]}>
        <planeGeometry args={[3.2, 1.8]} />
        <meshStandardMaterial
          color="#17304a"
          emissive="#17304a"
          emissiveIntensity={0.5}
          roughness={1}
        />
      </mesh>
      <OccupantDecal position={[-1.5, 0.05, WALL_Z + 0.02]} shadow={0} decalRef={decalRef} />
      {/* overhead ring light */}
      <mesh position={[0, 1.7, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.012, 8, 40]} />
        <meshBasicMaterial color="#cfeaff" toneMapped={false} />
      </mesh>
      <pointLight
        ref={ringLight}
        position={[0, 1.6, 0.3]}
        color="#cfeaff"
        intensity={5}
        distance={8}
        decay={2}
      />
      <pointLight
        ref={wallLight}
        position={[0, 0.3, WALL_Z + 0.5]}
        color="#6aa8d8"
        intensity={3}
        distance={6}
        decay={2}
      />
      {/* light cushion under the puck */}
      <mesh position={[0, L.floorY + 0.001, L.puck.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.42, 48]} />
        <meshBasicMaterial
          color="#8fe3ff"
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
