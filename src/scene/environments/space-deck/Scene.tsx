import { SpaceDeckRoom } from '../../materials/rooms/spaceDeck/SpaceDeckRoom.tsx';
import type { EnvironmentSceneProps } from '../contract.ts';
import { RoomScene } from '../shared/RoomScene.tsx';
import environment from './index.tsx';

/** The technical-artist's `SpaceDeckRoom` next to the screen anchor; see shared/RoomScene.tsx. */
export default function Scene({ calm, colour, pose }: EnvironmentSceneProps) {
  return (
    <RoomScene
      Room={SpaceDeckRoom}
      spec={environment.screen}
      calm={calm}
      colour={colour}
      pose={pose}
    />
  );
}
