/**
 * Cinema facade (light; the scene is ./Scene.tsx). Owner: scene-developer (scene) and technical-artist
 * (materials, assets). An empty auditorium seen from a few rows back: proscenium and curtains, seat backs in the foreground, a projector beam above the screen.
 * Anchor values from design-spec-v2 section 5. Contract: ../contract.ts.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'cinema',
  Scene: lazyScene('cinema'),
  screen: { aspect: 16 / 9, widthM: 6, fill: 0.72, align: 'centre' },
};

export default environment;
