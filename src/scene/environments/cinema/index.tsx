/**
 * STUB. Owner: scene-developer (scene) and technical-artist (materials, assets).
 * Auditorium, seats below the sight line of the watch pose.
 * aspect, fill and align from design spec v2 §5 (keep in sync); widthM is a placeholder.
 * Contract: ../contract.ts. Render exactly one screen anchor; nothing between the watch-pose
 * camera and the screen; respect `calm`; never filter colour in a shader.
 */
import type { EnvironmentModule, EnvironmentSceneProps } from '../contract.ts';

function CinemaScene(props: EnvironmentSceneProps) {
  void props;
  return null;
}

const environment: EnvironmentModule = {
  id: 'cinema',
  Scene: CinemaScene,
  screen: { aspect: 16 / 9, widthM: 1, fill: 0.72, align: 'centre' },
};

export default environment;
