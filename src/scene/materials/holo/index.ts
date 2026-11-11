// Public surface of the 2050 holo art. Owner: technical-artist. Import from '@/scene/materials/holo'.
// The scene swaps from the 1970s CRT and TV files to these (see docs/handoffs/technical-artist.md, "2050").
export { HoloDisplay } from './HoloDisplay.tsx';
export type { HoloDisplayProps, HoloNodes, TvNodes, KnobHandlers } from './HoloDisplay.tsx';
export { HOLO_LAYOUT, HOLO_COLOURS } from './layout.ts';
export { HoloEnvironment } from './HoloEnvironment.tsx';
export type { HoloEnvironmentProps } from './HoloEnvironment.tsx';
export { HoloRoom } from './HoloRoom.tsx';
export { createHoloRoomUniforms } from './holoRoomUniforms.ts';
export type { HoloRoomUniforms } from './holoRoomUniforms.ts';
export { drawStandby, createStandbyCanvas, TT } from '../standby/drawStandby.ts';
export type { StandbyOptions } from '../standby/drawStandby.ts';
export {
  drawOccupant,
  createOccupantCanvas,
  OCCUPANT_W,
  OCCUPANT_H,
  OCCUPANT_HEAD,
} from './occupant2050.ts';
export type { OccupantOptions } from './occupant2050.ts';
export { drawGhost2D, GHOST_AREA_GAIN, GHOST_TEXT_CAP_SCALE } from './drawGhost2D.ts';
export type { Ghost2DOptions } from './drawGhost2D.ts';
export {
  createHoloScreenMaterial,
  prepareScreenTexture,
  setHoloTexture,
  holoUniforms,
  estimateHoloMeanLuminance,
  getOccupantTexture,
  rollOffset,
  rollPhase,
  ROLL_MIN_SECONDS,
  HOLO_DEFAULTS,
  WARMUP_SECONDS,
  COLLAPSE_SECONDS,
} from '../../shaders/holo/createHoloMaterial.ts';
export type {
  HoloUniformValues,
  HoloShaderMaterial,
} from '../../shaders/holo/createHoloMaterial.ts';
export { decalOpacity } from '../room/roomTextures.ts';
