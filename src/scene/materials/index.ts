// Public surface of the technical artist's materials. Import from '@/scene/materials'.
export { CrtScreenMaterial } from './CrtScreenMaterial.tsx';
export type { CrtScreenMaterialProps, ScreenPhase } from './CrtScreenMaterial.tsx';
export { GreyEnvironment } from './GreyEnvironment.tsx';
export { TvBody } from './tv/TvBody.tsx';
export type { TvBodyProps, TvNodes, KnobHandlers } from './tv/TvBody.tsx';
export { TV_LAYOUT, TV_GREYS } from './tv/layout.ts';
export { drawTestCard, createTestCardCanvas, TT } from './testcard/drawTestCard.ts';
export type { TestCardOptions } from './testcard/drawTestCard.ts';
export {
  createCrtScreenMaterial,
  prepareScreenTexture,
  setCrtTexture,
  estimateCrtMeanLuminance,
  CRT_DEFAULTS,
  WARMUP_SECONDS,
  COLLAPSE_SECONDS,
} from '../shaders/crt/createCrtMaterial.ts';
export type { CrtUniformValues, CrtShaderMaterial } from '../shaders/crt/createCrtMaterial.ts';
export {
  drawOccupant,
  createOccupantCanvas,
  OCCUPANT_W,
  OCCUPANT_H,
  OCCUPANT_HEAD,
} from './ghost/drawOccupant.ts';
export type { OccupantOptions } from './ghost/drawOccupant.ts';
export {
  rollOffset,
  rollPhase,
  ROLL_MIN_SECONDS,
  getOccupantTexture,
} from '../shaders/crt/createCrtMaterial.ts';
export { drawGhost2D, GHOST_AREA_GAIN, GHOST_TEXT_CAP_SCALE } from './ghost/drawGhost2D.ts';
export type { Ghost2DOptions } from './ghost/drawGhost2D.ts';
export { WallPaper, Shelf, BlobShadow, OccupantDecal, RoomPieces } from './room/RoomPieces.tsx';
export { decalOpacity } from './room/roomTextures.ts';
