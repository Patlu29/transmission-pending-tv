/**
 * Rainy-night bedroom facade (light; the scene is ./Scene.tsx). Owner: scene-developer (scene) and technical-artist
 * (materials, assets). A wall-hung screen above a chest, a rainy window with city bokeh, lamp, mug and a sleeping cat.
 * Anchor values from design-spec-v2 section 5. Contract: ../contract.ts.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'bedroom',
  Scene: lazyScene('bedroom'),
  screen: { aspect: 16 / 9, widthM: 1.2, fill: 0.6, align: 'centre' },
};

export default environment;
