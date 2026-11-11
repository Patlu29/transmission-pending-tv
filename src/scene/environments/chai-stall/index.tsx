/**
 * STUB. Owner: scene-developer (scene) and technical-artist (materials, assets).
 * Chai stall TV; crowd sprites below and beside the screen, never in front of it.
 * aspect, fill and align from design spec v2 §5 (keep in sync); widthM is a placeholder.
 * Contract: ../contract.ts. Render exactly one screen anchor; nothing between the watch-pose
 * camera and the screen; respect `calm`; never filter colour in a shader.
 */
import type { EnvironmentModule, EnvironmentSceneProps } from '../contract.ts';

function ChaiStallScene(props: EnvironmentSceneProps) {
  void props;
  return null;
}

const environment: EnvironmentModule = {
  id: 'chai-stall',
  Scene: ChaiStallScene,
  screen: { aspect: 16 / 9, widthM: 1, fill: 0.58, align: 'centre' },
};

export default environment;
