// PLACEHOLDER Lumen pane and puck (design-spec-2050 3.1), built from primitives with the spec's node names so
// ControlRings picks them and the technical-artist's `HoloDisplay` can replace this file's component:
//   `screen` (pane glass, takes the screen material as its child), `bezel` (ceramic border), `trim` (edge light),
//   `cabinet` (puck), `control-plate`, `knob-channel` (outer ring), `knob-volume` (inner ring), `knob-power`
//   (dimple). Origin at the glass centre, +z to the viewer. Rings turn about their local z axis; each carries a
//   light dot so the turn is visible.
// TO SWAP: render `HoloDisplay` from '@/scene/materials' with the same children and `burst`.
import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { MeshStandardMaterial } from 'three';
import { HOLO_LAYOUT as L } from './holoLayout';

const LUMEN = '#8fe3ff';
const PEARL = '#e8eaf0';
const GRAPHITE = '#1a2030';

function Ring({ name, radius, dotAngle }: { name: string; radius: number; dotAngle: number }) {
  return (
    <mesh name={name}>
      <torusGeometry args={[radius, L.rings.tube, 10, 48]} />
      <meshStandardMaterial
        color="#223044"
        emissive={LUMEN}
        emissiveIntensity={0.55}
        roughness={0.4}
      />
      {/* the light dot: it shows the ring's turn */}
      <mesh position={[Math.cos(dotAngle) * radius, Math.sin(dotAngle) * radius, 0]}>
        <sphereGeometry args={[L.rings.tube * 2.2, 10, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </mesh>
  );
}

export function HoloDisplay({
  children,
  burst = 0,
}: {
  /** The glass material (holo material on channel 0, flat black on live channels). */
  children?: ReactNode;
  /** 0..1 channel-change pulse of the edge light (300 ms, up to 1.4 x). */
  burst?: number;
}) {
  const edge = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    if (edge.current) edge.current.emissiveIntensity = 1.2 * (1 + 0.4 * burst);
  });
  const { width: w, height: h, thickness: t } = L.pane;
  const e = 0.003; // edge light stroke
  const inset = L.playerInset * w; // the light sits in the 1.5 per cent ring outside the player rect
  return (
    <group name="holo-display">
      {/* ceramic border behind and around the glass */}
      <mesh name="bezel" position={[0, 0, -t / 2 - 0.0005]}>
        <boxGeometry args={[w + 2 * L.pane.border, h + 2 * L.pane.border, t]} />
        <meshStandardMaterial color={PEARL} roughness={0.35} />
      </mesh>
      <mesh name="screen" position={[0, 0, 0.0004]}>
        <planeGeometry args={[w, h]} />
        {children ?? <meshBasicMaterial color="#070b16" />}
      </mesh>
      {/* edge light: steady, flush outside the player rect, screen-owned (exempt from the halo check) */}
      <group name="trim" userData={{ screenOwned: true }}>
        {(
          [
            [0, h / 2 - inset / 2, w - 2 * inset, e],
            [0, -h / 2 + inset / 2, w - 2 * inset, e],
            [-w / 2 + inset / 2, 0, e, h - 2 * inset],
            [w / 2 - inset / 2, 0, e, h - 2 * inset],
          ] as const
        ).map(([x, y, sx, sy], i) => (
          <mesh key={i} position={[x, y, 0.0008]} userData={{ screenOwned: true }}>
            <boxGeometry args={[sx, sy, 0.001]} />
            <meshStandardMaterial
              ref={i === 0 ? edge : undefined}
              color={LUMEN}
              emissive={LUMEN}
              emissiveIntensity={1.2}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* the puck */}
      <mesh
        name="cabinet"
        position={[0, L.puck.topY - L.puck.height / 2, L.puck.z]}
        scale={[L.puck.width, 1, L.puck.depth]}
      >
        <cylinderGeometry args={[0.5, 0.5, L.puck.height, 48]} />
        <meshStandardMaterial color={GRAPHITE} roughness={0.5} />
      </mesh>
      <group
        name="control-plate"
        position={[0, L.plate.y, L.plate.z]}
        rotation={[-L.plate.tilt, 0, 0]}
      >
        <Ring name="knob-channel" radius={L.rings.channel} dotAngle={Math.PI / 2} />
        <Ring name="knob-volume" radius={L.rings.volume} dotAngle={Math.PI / 2} />
        <mesh name="knob-power" position={[0, 0, 0.002]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.03, 0.006, 24]} />
          <meshStandardMaterial color="#223044" emissive={LUMEN} emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}
