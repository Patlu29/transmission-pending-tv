/**
 * STUB. Owner: scene-developer (scene) and technical-artist (materials, assets).
 * Wraps v1 for channel 0 (teletext/CRT, haunting, 3d-screen and 2d unchanged). For YouTube channels: CRT glass off, anchor on the flat bezel opening, haunting kept off the screen.
 * aspect, fill and align from design spec v2 §5 (keep in sync); widthM is a placeholder.
 * Contract: ../contract.ts. Render exactly one screen anchor; nothing between the watch-pose
 * camera and the screen; respect `calm`; never filter colour in a shader.
 */
import type { EnvironmentModule, EnvironmentSceneProps } from '../contract.ts';

function TvRoomScene(props: EnvironmentSceneProps) {
  void props;
  return null;
}

const environment: EnvironmentModule = {
  id: 'tv-room',
  Scene: TvRoomScene,
  screen: { aspect: 4 / 3, widthM: 1, fill: 0.55, align: 'left' },
  hostsChannel0: true,
};

export default environment;
