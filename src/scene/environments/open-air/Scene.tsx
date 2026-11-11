import { OpenAirRoom } from '../../materials/rooms/openAir/OpenAirRoom.tsx';
import type { EnvironmentSceneProps } from '../contract.ts';
import { RoomScene } from '../shared/RoomScene.tsx';
import environment from './index.tsx';

/** The technical-artist's `OpenAirRoom` next to the screen anchor; see shared/RoomScene.tsx. */
export default function Scene({ calm, colour, pose }: EnvironmentSceneProps) {
  return (
    <RoomScene
      Room={OpenAirRoom}
      spec={environment.screen}
      calm={calm}
      colour={colour}
      pose={pose}
    />
  );
}
