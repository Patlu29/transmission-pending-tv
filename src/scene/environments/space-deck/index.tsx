/**
 * Space deck facade (light; the scene is ./Scene.tsx). Owner: scene-developer (scene) and technical-artist
 * (materials, assets). An orbital observation deck: a bulkhead with a wide flat panel, windows onto Earth and stars.
 * Anchor values from design-spec-v2 section 5. Contract: ../contract.ts.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'space-deck',
  Scene: lazyScene('space-deck'),
  screen: { aspect: 16 / 9, widthM: 3, fill: 0.64, align: 'centre' },
};

export default environment;
