import type { IUniform } from 'three';
import { createRoomUniforms, type RoomUniforms } from '../rooms/roomKit.ts';

export interface HoloRoomUniforms extends RoomUniforms {
  /** 1 = full room light; the scene sets `1 - dim x 0.65`. */
  uRoomLight: IUniform<number>;
}

/** Shared room uniforms plus `uRoomLight` (the scene sets it to `1 - dim x 0.65`). */
export function createHoloRoomUniforms(): HoloRoomUniforms {
  return { ...createRoomUniforms(), uRoomLight: { value: 1 } };
}
