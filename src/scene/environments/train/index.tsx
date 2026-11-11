/**
 * Train window seat facade (light; the scene is ./Scene.tsx). Owner: scene-developer (scene) and technical-artist
 * (materials, assets). A coach window seat at dusk: scenery sliding by, a screen on the partition in front of you.
 * Anchor values from design-spec-v2 section 5. Contract: ../contract.ts.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'train',
  Scene: lazyScene('train'),
  screen: { aspect: 16 / 9, widthM: 0.45, fill: 0.6, align: 'centre' },
};

export default environment;
