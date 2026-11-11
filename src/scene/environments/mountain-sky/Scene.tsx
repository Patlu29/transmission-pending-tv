import type { EnvironmentSceneProps } from '../contract.ts';
import { MountainSkyRoom } from '../../materials/rooms/mountainSky/MountainSkyRoom.tsx';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import { useRoomBindings } from '../shared/useRoomBindings.ts';
import environment from './index.tsx';

const spec = environment.screen;

/**
 * Mountain sky. The scenery, props, ambient motion and light spill are the technical-artist's `MountainSkyRoom`
 * (anchor space, built around the watch camera); this scene adds the screen anchor at its origin and feeds it
 * the shared keep-out uniforms and the solved watch distance.
 */
export default function Scene({ calm, colour, pose }: EnvironmentSceneProps) {
  const bindings = useRoomBindings(spec.widthM * 1.6);
  return (
    <>
      <ScreenAnchor spec={spec} />
      <MountainSkyRoom calm={calm} colour={colour} pose={pose} widthM={spec.widthM} {...bindings} />
    </>
  );
}
