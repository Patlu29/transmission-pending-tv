/**
 * STUB. Owner: scene-developer (scene) and technical-artist (materials, assets).
 * Observation deck; procedural sky and stars.
 * aspect, fill and align from design spec v2 §5 (keep in sync); widthM is a placeholder.
 * Contract: ../contract.ts. Render exactly one screen anchor; nothing between the watch-pose
 * camera and the screen; respect `calm`; never filter colour in a shader.
 */
import type { EnvironmentModule, EnvironmentSceneProps } from '../contract.ts';

function SpaceDeckScene(props: EnvironmentSceneProps) {
  void props;
  return null;
}

const environment: EnvironmentModule = {
  id: 'space-deck',
  Scene: SpaceDeckScene,
  screen: { aspect: 16 / 9, widthM: 1, fill: 0.64, align: 'centre' },
};

export default environment;
