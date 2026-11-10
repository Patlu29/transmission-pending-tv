// PLACEHOLDER TV body (primitive boxes and cylinders), built to the proportions and
// node names in design-spec 10 so the real model drops in:
//   - pivot at the screen centre (camera target is the origin), front glass at z = 0
//   - nodes named `screen`, `knob-power`, `knob-channel`, `knob-volume`
//   - knobs face +z and turn about their local z axis
// TO SWAP: render the technical-artist's model instead, e.g.
//   const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/tv.glb`);
//   return <primitive object={scene} />   (keep <ScreenSurface> if the model has no screen mesh)
// and update TV_SCREEN_WIDTH / TV_SCREEN_HEIGHT below if the model's screen differs.
import { useEffect, useMemo } from 'react';
import { CylinderGeometry } from 'three';
import { ScreenSurface } from './ScreenSurface';

export const TV_SCREEN_WIDTH = 0.58;
export const TV_SCREEN_HEIGHT = 0.435;

const WOOD = '#4a4a4a';
const BEZEL = '#141414';
const TRIM = '#a8a8a8';
const KNOB = '#cfcfcf';
const GRILLE = '#0a0a0a';

function Knob({ name, x, y, r }: { name: string; x: number; y: number; r: number }) {
  const geo = useMemo(() => {
    const g = new CylinderGeometry(r, r * 1.05, 0.05, 24);
    g.rotateX(Math.PI / 2); // axis along +z
    return g;
  }, [r]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group name={name} position={[x, y, 0.005]}>
      <mesh geometry={geo} position={[0, 0, 0.025]}>
        <meshStandardMaterial color={KNOB} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, r * 0.55, 0.052]}>
        <boxGeometry args={[r * 0.12, r * 0.6, 0.004]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
    </group>
  );
}

export function TvSet() {
  return (
    <group name="tv-set">
      {/* cabinet: 1.0 x 0.78 x 0.72, front at z = 0, screen on the left */}
      <mesh position={[0.135, 0, -0.36 - 0.02]}>
        <boxGeometry args={[1.0, 0.78, 0.72]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      {/* dark bezel around the glass */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[TV_SCREEN_WIDTH + 0.09, TV_SCREEN_HEIGHT + 0.09, 0.03]} />
        <meshStandardMaterial color={BEZEL} roughness={0.4} />
      </mesh>
      <group position={[0, 0, 0.006]}>
        <ScreenSurface width={TV_SCREEN_WIDTH} height={TV_SCREEN_HEIGHT} bulge={0.035} />
      </group>
      {/* control plate and grille */}
      <mesh position={[0.5, 0, -0.005]}>
        <boxGeometry args={[0.24, 0.7, 0.01]} />
        <meshStandardMaterial color={TRIM} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0.5, -0.04, 0.002]}>
        <boxGeometry args={[0.2, 0.22, 0.006]} />
        <meshStandardMaterial color={GRILLE} roughness={0.9} />
      </mesh>
      <Knob name="knob-channel" x={0.44} y={0.22} r={0.05} />
      <Knob name="knob-volume" x={0.57} y={0.22} r={0.05} />
      <Knob name="knob-power" x={0.57} y={-0.28} r={0.03} />
      {/* feet */}
      {[-0.28, 0.5].flatMap((x) =>
        [-0.1, -0.55].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.435, z]}>
            <boxGeometry args={[0.06, 0.09, 0.06]} />
            <meshStandardMaterial color={BEZEL} />
          </mesh>
        )),
      )}
    </group>
  );
}
