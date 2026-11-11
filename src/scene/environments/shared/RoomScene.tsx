import type { ComponentType } from 'react';
import type { RoomProps } from '../../materials/rooms/roomKit.ts';
import type { EnvironmentSceneProps, ScreenAnchorSpec } from '../contract.ts';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import { useRoomBindings } from './useRoomBindings.ts';

/**
 * Mounts one of the technical-artist's rooms next to the screen anchor (anchor space, same transform) with the
 * shared bindings. `dim` stays 1: the UI's CSS `brightness(0.6)` on the canvas already dims the focus
 * backdrop, and the room's own dim overlay would double it.
 */
export function RoomScene({
  Room,
  spec,
  calm,
  colour,
  pose,
}: Pick<EnvironmentSceneProps, 'calm' | 'colour' | 'pose'> & {
  Room: ComponentType<RoomProps & { dim?: number }>;
  spec: ScreenAnchorSpec;
}) {
  const bindings = useRoomBindings(spec.widthM * 1.6);
  return (
    <>
      <ScreenAnchor spec={spec} />
      <Room calm={calm} colour={colour} pose={pose} widthM={spec.widthM} dim={1} {...bindings} />
    </>
  );
}
