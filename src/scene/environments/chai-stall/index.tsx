/**
 * Chai stall facade (light; the scene is ./Scene.tsx). Owner: scene-developer (scene) and technical-artist
 * (materials, assets). A roadside tea stall at night: a small TV on a bracket, a counter, bulbs and a crowd of silhouettes.
 * Anchor values from design-spec-v2 section 5. Contract: ../contract.ts.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'chai-stall',
  Scene: lazyScene('chai-stall'),
  screen: { aspect: 16 / 9, widthM: 0.7, fill: 0.58, align: 'centre' },
};

export default environment;
