/**
 * The scene's room uniforms. Each room scene creates ONE `createRoomUniforms()` (see `useRoomBindings`) and
 * registers it here; the projector then writes the player rect plus the 24 px halo into its `uKeepOut`
 * through `setKeepOut` on every update (and null in browse and while tweening).
 */
import { setKeepOut, type RoomUniforms } from '../../materials/rooms/roomKit.ts';

let active: RoomUniforms | null = null;
let lastRect: { x: number; y: number; width: number; height: number } | null = null;

export function setActiveUniforms(u: RoomUniforms | null): void {
  active = u;
  if (u) setKeepOut(u, lastRect);
}

export const getActiveUniforms = () => active;

export function applyKeepOut(rect: { x: number; y: number; width: number; height: number }): void {
  lastRect = rect;
  if (active) setKeepOut(active, rect, 24);
}

export function clearKeepOut(): void {
  lastRect = null;
  if (active) setKeepOut(active, null);
}
