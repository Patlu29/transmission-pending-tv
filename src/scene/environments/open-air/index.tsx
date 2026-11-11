/**
 * Open-air screen facade (light; the scene is ./Scene.tsx). Owner: scene-developer (scene) and technical-artist
 * (materials, assets). A rigged screen on poles in a field at night, string lights, beanbags and a moon.
 * Anchor values from design-spec-v2 section 5. Contract: ../contract.ts.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'open-air',
  Scene: lazyScene('open-air'),
  screen: { aspect: 16 / 9, widthM: 8, fill: 0.7, align: 'centre' },
};

export default environment;
