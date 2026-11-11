/**
 * One shared RoomUniforms set (the technical-artist's `createRoomUniforms`) for the whole scene:
 * `uKeepOut` is the projected player rect plus the 24 px halo (set by the projector), `uView` is
 * (stage width, stage height, device pixel ratio). Rooms built by the technical-artist take this set as
 * their `uniforms` prop, and this scene's own sprite shaders read the same objects.
 */
import { createRoomUniforms, setKeepOut } from '../../materials/rooms/roomKit.ts';

export const sharedRoomUniforms = createRoomUniforms();

export function applyKeepOut(rect: { x: number; y: number; width: number; height: number }): void {
  setKeepOut(sharedRoomUniforms, rect, 24);
}

export function clearKeepOut(): void {
  setKeepOut(sharedRoomUniforms, null);
}
