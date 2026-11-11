/**
 * 1970s TV room facade (light; the scene is ./Scene.tsx). Owner: scene-developer.
 * Channel 0 is v1 EXACTLY (rig, lights, room, knobs, CRT/teletext/haunt set, 3d-screen quad). For YouTube
 * channels: the CRT glass is off, the anchor is the flat 4:3 bezel opening at the glass plane, the camera
 * is the shared watch-pose solver (whole set within 95 per cent of the width, glass left of centre),
 * light spill is generic, the Occupant is off. See ./Scene.tsx.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'tv-room',
  Scene: lazyScene('tv-room'),
  // 4:3; widthM equals TV_LAYOUT.screen.width (0.58, checked in Scene.tsx); fill is the glass width share.
  screen: { aspect: 4 / 3, widthM: 0.58, fill: 0.55, align: 'left' },
  hostsChannel0: true,
};

export default environment;
