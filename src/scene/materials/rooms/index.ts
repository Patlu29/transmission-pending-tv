// Public surface of the v2 rooms. Owner: technical-artist. Import from '@/scene/materials/rooms'.
export * from './roomKit.ts';
export {
  DimOverlay,
  PointSprites,
  PuffLayer,
  SkyDome,
  Boxes,
  Glow,
  GradQuad,
  SpillLight,
} from './roomParts.tsx';
export { MountainSkyRoom } from './mountainSky/MountainSkyRoom.tsx';
import { MountainSkyRoom as MountainSkyRoomImpl } from './mountainSky/MountainSkyRoom.tsx';
export { CinemaRoom } from './cinema/CinemaRoom.tsx';
import { CinemaRoom as CinemaRoomImpl } from './cinema/CinemaRoom.tsx';
export { DriveInRoom } from './driveIn/DriveInRoom.tsx';
import { DriveInRoom as DriveInRoomImpl } from './driveIn/DriveInRoom.tsx';
export { OpenAirRoom } from './openAir/OpenAirRoom.tsx';
import { OpenAirRoom as OpenAirRoomImpl } from './openAir/OpenAirRoom.tsx';
export { BedroomRoom } from './bedroom/BedroomRoom.tsx';
import { BedroomRoom as BedroomRoomImpl } from './bedroom/BedroomRoom.tsx';
export { ChaiStallRoom } from './chaiStall/ChaiStallRoom.tsx';
import { ChaiStallRoom as ChaiStallRoomImpl } from './chaiStall/ChaiStallRoom.tsx';
export { TrainRoom } from './train/TrainRoom.tsx';
import { TrainRoom as TrainRoomImpl } from './train/TrainRoom.tsx';
export { SpaceDeckRoom } from './spaceDeck/SpaceDeckRoom.tsx';
import { SpaceDeckRoom as SpaceDeckRoomImpl } from './spaceDeck/SpaceDeckRoom.tsx';
export * from './specs.ts';
import {
  MOUNTAIN_SKY_SCREEN,
  CINEMA_SCREEN,
  DRIVE_IN_SCREEN,
  OPEN_AIR_SCREEN,
  BEDROOM_SCREEN,
  CHAI_STALL_SCREEN,
  TRAIN_SCREEN,
  SPACE_DECK_SCREEN,
} from './specs.ts';
export const ROOMS = {
  'mountain-sky': { Room: MountainSkyRoomImpl, screen: MOUNTAIN_SKY_SCREEN },
  cinema: { Room: CinemaRoomImpl, screen: CINEMA_SCREEN },
  'drive-in': { Room: DriveInRoomImpl, screen: DRIVE_IN_SCREEN },
  'open-air': { Room: OpenAirRoomImpl, screen: OPEN_AIR_SCREEN },
  bedroom: { Room: BedroomRoomImpl, screen: BEDROOM_SCREEN },
  'chai-stall': { Room: ChaiStallRoomImpl, screen: CHAI_STALL_SCREEN },
  train: { Room: TrainRoomImpl, screen: TRAIN_SCREEN },
  'space-deck': { Room: SpaceDeckRoomImpl, screen: SPACE_DECK_SCREEN },
} as const;
