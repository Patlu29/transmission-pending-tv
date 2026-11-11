/**
 * STUB. Owner: scene-developer (scene) and technical-artist (materials, assets).
 * Rainy-night bedroom; rain on the window, never between camera and screen.
 * aspect, fill and align from design spec v2 §5 (keep in sync); widthM is a placeholder.
 * Contract: ../contract.ts. Render exactly one screen anchor; nothing between the watch-pose
 * camera and the screen; respect `calm`; never filter colour in a shader.
 */
import type { EnvironmentModule, EnvironmentSceneProps } from '../contract.ts';

function BedroomScene(props: EnvironmentSceneProps) {
  void props;
  return null;
}

const environment: EnvironmentModule = {
  id: 'bedroom',
  Scene: BedroomScene,
  screen: { aspect: 16 / 9, widthM: 1, fill: 0.6, align: 'centre' },
};

export default environment;
