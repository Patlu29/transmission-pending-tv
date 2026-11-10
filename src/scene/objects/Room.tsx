// Dark room: the technical-artist's RoomPieces (wall pattern, dusty shelf, blob shadow,
// Occupant wall decal). The decal opacity follows hauntStore.shadow without React state.
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { MeshBasicMaterial } from 'three';
import { readHaunt } from '../integration/stores';
import { decalOpacity, RoomPieces } from '../materials';

export function Room() {
  const decalRef = useRef<MeshBasicMaterial>(null);
  useFrame(() => {
    if (decalRef.current) decalRef.current.opacity = decalOpacity(readHaunt().shadow);
  });
  return (
    <group name="room">
      <RoomPieces decalRef={decalRef} />
    </group>
  );
}
