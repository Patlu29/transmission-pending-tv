/**
 * Mountain sky facade (the hero room; the scene is ./Scene.tsx). Owner: scene-developer (scene) and
 * technical-artist (materials, assets). A summit above a sea of clouds with a giant flat 16:9 screen floating
 * in the sky, head-on. Clouds, peaks and birds stay below or beside the screen, never in front.
 * Final anchor values from design-spec-v2 5.9 (fill 0.72, centred, 'upper' = rect centre at 41 per cent).
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'mountain-sky',
  Scene: lazyScene('mountain-sky'),
  screen: { aspect: 16 / 9, widthM: 12, fill: 0.72, align: 'centre', vAlign: 'upper' },
};

export default environment;
