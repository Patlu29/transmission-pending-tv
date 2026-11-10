// Dark room: a wall and a shelf, flat dark planes (design-spec 1 and 10.2).
// PLACEHOLDER surfaces: plain standard materials, no paper-pattern texture yet.
// Far corners fall to black through light falloff, so no post vignette is needed.
import { TV_LAYOUT } from '../materials';

export function Room() {
  return (
    <group name="room">
      <mesh position={[0.1, 0.3, -1.1]}>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#1c1c1c" roughness={1} />
      </mesh>
      {/* HAUNT SEAM (round 2): mount the technical-artist's room pieces here once they
          exist: wall paper pattern (replaces the flat wall above), dust, blob shadow
          under the feet, and the Occupant wall decal. The decal's opacity is
          readHaunt().shadow * 0.10 (3d-set only, never moves). */}
      {/* shelf top at y = -0.48, under the feet */}
      <mesh position={[0.1, TV_LAYOUT.shelfY - 0.03, -0.5]}>
        <boxGeometry args={[4, 0.06, 1.4]} />
        <meshStandardMaterial color="#141414" roughness={0.8} />
      </mesh>
    </group>
  );
}
