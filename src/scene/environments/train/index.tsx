/**
 * STUB. Owner: scene-developer (scene) and technical-artist (materials, assets).
 * Train window seat; screen fixed to the carriage, only the scenery moves.
 * aspect, fill and align from design spec v2 §5 (keep in sync); widthM is a placeholder.
 * Contract: ../contract.ts. Render exactly one screen anchor; nothing between the watch-pose
 * camera and the screen; respect `calm`; never filter colour in a shader.
 */
import type { EnvironmentModule, EnvironmentSceneProps } from '../contract.ts';

function TrainScene(props: EnvironmentSceneProps) {
  void props;
  return null;
}

const environment: EnvironmentModule = {
  id: 'train',
  Scene: TrainScene,
  screen: { aspect: 16 / 9, widthM: 1, fill: 0.6, align: 'centre' },
};

export default environment;
