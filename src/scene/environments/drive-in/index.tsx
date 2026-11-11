/**
 * Car at the drive-in facade (light; the scene is ./Scene.tsx). Owner: scene-developer (scene) and technical-artist
 * (materials, assets). A parked car at a drive-in at night: dashboard, steering wheel and A-pillars in view space, the screen tower across the lot.
 * Anchor values from design-spec-v2 section 5. Contract: ../contract.ts.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'drive-in',
  Scene: lazyScene('drive-in'),
  screen: { aspect: 16 / 9, widthM: 14, fill: 0.66, align: 'centre' },
};

export default environment;
