import type { ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, type RefObject } from 'react';
import { DoubleSide, type MeshBasicMaterial } from 'three';
import { TV_LAYOUT } from '../tv/layout.ts';
import {
  decalOpacity,
  createBlobShadowTexture,
  createDecalTexture,
  createDustTexture,
  createWallTexture,
} from './roomTextures.ts';

type GroupProps = Omit<ThreeElements['group'], 'children' | 'ref'>;

/**
 * Wall with a faint paper pattern (under 8 per cent contrast). A lit plane facing +z, so the scene's room dim
 * darkens it. `color` multiplies the pattern: keep it a dark grey. `tile` is the wall size of one 256 px tile.
 */
export function WallPaper({
  width = 8,
  height = 5,
  color = '#3a3a3a',
  tile = 0.45,
  ...group
}: GroupProps & { width?: number; height?: number; color?: string; tile?: number }) {
  const map = useMemo(() => {
    const t = createWallTexture();
    t.repeat.set(width / tile, height / tile);
    return t;
  }, [width, height, tile]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <group name="wall-paper" {...group}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={map} color={color} roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * Shelf top (a lit dark plane) with a dust-fall overlay. The group origin is the centre of the shelf surface:
 * set `position={[x, TV_LAYOUT.shelfY, z]}`. Lit, so the room dim darkens it.
 */
export function Shelf({
  width = 4,
  depth = 2.4,
  color = '#1e1e1e',
  ...group
}: GroupProps & { width?: number; depth?: number; color?: string }) {
  const dust = useMemo(() => {
    const t = createDustTexture();
    t.repeat.set(width / 0.8, depth / 0.8);
    return t;
  }, [width, depth]);
  useEffect(() => () => dust.dispose(), [dust]);
  return (
    <group name="shelf" {...group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0008, 0]} renderOrder={1}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          map={dust}
          transparent
          depthWrite={false}
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Soft contact shadow under the set: a black radial-alpha ellipse lying 2 mm above the shelf. Unlit, so it is not
 * changed by the room dim. Place at the shelf surface under the cabinet, for example
 * `position={[0.135, TV_LAYOUT.shelfY + 0.002, -0.3]}` (the cabinet centre is 0.135 right of the origin).
 */
export function BlobShadow({
  width = 1.3,
  depth = 1.0,
  opacity = 0.7,
  ...group
}: GroupProps & { width?: number; depth?: number; opacity?: number }) {
  const map = useMemo(() => createBlobShadowTexture(), []);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <group name="blob-shadow" {...group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          map={map}
          color="#000000"
          transparent
          opacity={opacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * The Occupant's shadow on the wall: a soft silhouette, black, alpha `decalOpacity(shadow)` (at most 0.10).
 * Faces +z; put it on the wall to the left of the set. Update every frame without React state:
 * `decalRef.current.opacity = decalOpacity(hauntStore.shadow)`. Unlit and never moves.
 */
export function OccupantDecal({
  height = 1.7,
  shadow = 0,
  decalRef,
  ...group
}: GroupProps & {
  height?: number;
  shadow?: number;
  decalRef?: RefObject<MeshBasicMaterial | null>;
}) {
  const map = useMemo(() => createDecalTexture(), []);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <group name="occupant-decal" {...group}>
      <mesh renderOrder={3}>
        <planeGeometry args={[height * (2 / 3), height]} />
        <meshBasicMaterial
          ref={decalRef}
          color="#000000"
          alphaMap={map}
          transparent
          opacity={decalOpacity(shadow)}
          depthWrite={false}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * All four together, placed for the TvBody (origin at the screen centre): wall 0.95 behind the screen plane, shelf
 * top at `TV_LAYOUT.shelfY`, blob under the cabinet, decal on the wall 1.25 to the left. Wrap or ignore as needed.
 */
export function RoomPieces({
  decalRef,
  shadow = 0,
}: {
  decalRef?: RefObject<MeshBasicMaterial | null>;
  shadow?: number;
}) {
  const wallZ = -0.95;
  const shelfY = TV_LAYOUT.shelfY;
  return (
    <>
      <WallPaper position={[0, 0.9, wallZ]} width={9} height={5.5} />
      <Shelf position={[0.135, shelfY, wallZ / 2 + 0.2]} width={6} depth={2.4} />
      <BlobShadow position={[0.135, shelfY + 0.002, -0.3]} />
      <OccupantDecal position={[-1.25, 0.25, wallZ + 0.003]} shadow={shadow} decalRef={decalRef} />
    </>
  );
}
