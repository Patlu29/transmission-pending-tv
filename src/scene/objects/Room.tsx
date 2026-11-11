// Dark room: the technical-artist's RoomPieces (wall pattern, dusty shelf, blob shadow,
// Occupant wall decal). On channel 0 the decal opacity follows hauntStore.shadow; on live channels
// it is a static 0.04 at most (none under Calm), and the Occupant never appears (design-spec-v2 5.1).
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { MeshBasicMaterial } from 'three';
import { readHaunt, useDisplayStore } from '../integration/stores';
import { decalOpacity, RoomPieces } from '../materials';

export function Room({ live = false }: { live?: boolean }) {
  const decalRef = useRef<MeshBasicMaterial>(null);
  useFrame(() => {
    if (!decalRef.current) return;
    decalRef.current.opacity = live
      ? useDisplayStore.getState().reducedMotion
        ? 0
        : 0.04
      : decalOpacity(readHaunt().shadow);
  });
  return (
    <group name="room">
      <RoomPieces decalRef={decalRef} />
    </group>
  );
}
