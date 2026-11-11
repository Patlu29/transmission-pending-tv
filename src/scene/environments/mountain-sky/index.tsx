/**
 * STUB. Owner: scene-developer (scene) and technical-artist (materials, assets).
 * Headline room: a summit above a sea of clouds; a giant flat 16:9 screen floating in the sky,
 * head-on to the viewer. Clouds, peaks and birds stay below or beside the screen, never in front.
 * PROVISIONAL anchor values (large fill, centred, high in the view); the designer finalises them
 * in design spec v2 §5. widthM is a placeholder.
 * Contract: ../contract.ts. Render exactly one screen anchor; nothing between the watch-pose
 * camera and the screen; respect `calm`; never filter colour in a shader.
 */
import type { EnvironmentModule, EnvironmentSceneProps } from '../contract.ts';

function MountainSkyScene(props: EnvironmentSceneProps) {
  void props;
  return null;
}

const environment: EnvironmentModule = {
  id: 'mountain-sky',
  Scene: MountainSkyScene,
  screen: { aspect: 16 / 9, widthM: 1, fill: 0.72, align: 'centre', vAlign: 'upper' },
};

export default environment;
