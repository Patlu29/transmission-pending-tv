import { TV_LAYOUT } from '../../materials';
import { Block } from '../shared/Block.tsx';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import type { ScreenAnchorSpec } from '../contract.ts';

/**
 * Live-channel dressing for the TV room: the screen anchor on the flat bezel opening, a table lamp with a
 * doily on the shelf to the right of the set, and a rug edge at the bottom of frame.
 * PLACEHOLDER shapes (blocks and a cone); the technical-artist's colour-era tints are not applied.
 * Every prop opts in to the clear-halo check.
 */
export function TvLiveProps({ spec }: { spec: ScreenAnchorSpec }) {
  const shelfY = TV_LAYOUT.shelfY;
  const lampX = TV_LAYOUT.originOffsetX + 0.62;
  return (
    <>
      <ScreenAnchor spec={spec} position={[0, 0, 0.0008]} />
      <group name="lamp" position={[lampX, shelfY, -0.25]} userData={{ halo: true }}>
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.01, 16]} />
          <meshStandardMaterial color="#d8d2c4" roughness={1} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.012, 0.02, 0.16, 8]} />
          <meshStandardMaterial color="#2b2118" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 0.12, 16, 1, true]} />
          <meshStandardMaterial
            color="#e8a54b"
            emissive="#e8a54b"
            emissiveIntensity={0.35}
            side={2}
            roughness={1}
          />
        </mesh>
        <pointLight
          position={[0, 0.2, 0.05]}
          intensity={0.15}
          color="#ffcf80"
          distance={2}
          decay={2}
        />
      </group>
      <Block
        name="rug-edge"
        position={[TV_LAYOUT.originOffsetX, shelfY - 0.075, 0.9]}
        size={[3.2, 0.01, 0.8]}
        color="#2b2118"
      />
    </>
  );
}
