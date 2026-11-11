/**
 * Holo room facade (id `tv-room` stays internal; the label is "Holo room"). Light; the scene is ./Scene.tsx.
 * Owner: scene-developer. Channel 0 is the Lumen pane (a 16:9 glass pane over a graphite puck with two light
 * rings: bloom-in picture, teletext-style card, the haunt). For YouTube channels the pane's glass goes dark behind
 * the player, the camera is the shared watch-pose solver (whole device centred, glass about 60 per cent of the
 * width), and the Occupant is off. See ./Scene.tsx and docs/design-spec-2050.md section 3.
 */
import type { EnvironmentModule } from '../contract.ts';
import { lazyScene } from '../lazyScene.ts';

const environment: EnvironmentModule = {
  id: 'tv-room',
  Scene: lazyScene('tv-room'),
  // 16:9. widthM is the player rect: the 1.2 m glass inset by 1.5 per cent on each side (1.2 x 0.97 = 1.164);
  // it equals HOLO_ANCHOR_WIDTH in objects/holoLayout.ts.
  screen: { aspect: 16 / 9, widthM: 1.164, fill: 0.6, align: 'centre' },
  hostsChannel0: true,
};

export default environment;
