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
  // 16:9. The anchor is the player rect itself: widthM equals HOLO_LAYOUT.screen.width (1.152: the 1.2 m pane less
  // its border and the 1.5 per cent inset, already baked into the model), so no `inset` here. fill 0.58 of the rect
  // makes the glass about 60 per cent of the viewport width.
  screen: { aspect: 16 / 9, widthM: 1.152, fill: 0.58, align: 'centre', vAlign: 'upper' },
  hostsChannel0: true,
};

export default environment;
