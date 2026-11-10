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
