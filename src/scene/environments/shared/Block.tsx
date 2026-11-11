import type { ReactNode } from 'react';

interface Props {
  name: string;
  position?: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  /** Emissive colour for lamps and signs. */
  glow?: string;
  glowIntensity?: number;
  /** Unlit. Use for silhouettes. */
  unlit?: boolean;
  rough?: number;
  /** Opt in to the clear-halo check (props near or in front of the screen plane). */
  halo?: boolean;
  /** Extra swept metres for animated props. */
  sweep?: number;
  screenOwned?: boolean;
  children?: ReactNode;
}

/** A box prop. Cheap, one draw call. PLACEHOLDER shape language until the technical-artist's props land. */
export function Block({
  name,
  position,
  size,
  rotation,
  color,
  glow,
  glowIntensity = 1,
  unlit,
  rough = 0.9,
  halo = true,
  sweep,
  screenOwned,
  children,
}: Props) {
  return (
    <mesh
      name={name}
      position={position}
      rotation={rotation}
      userData={{ halo, sweep, screenOwned }}
    >
      <boxGeometry args={size} />
      {unlit ? (
        <meshBasicMaterial color={color} toneMapped={false} />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={rough}
          emissive={glow ?? '#000000'}
          emissiveIntensity={glow ? glowIntensity : 0}
        />
      )}
      {children}
    </mesh>
  );
}
