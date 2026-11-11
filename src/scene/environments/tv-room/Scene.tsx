/**
 * 1970s TV room. Owner: scene-developer. Channel 0 is v1 EXACTLY: the same rig, lights, room, knobs and
 * CRT/teletext/haunt set (and v1's 3d-screen full-bleed quad). For YouTube channels (channel > 0):
 *  - the CRT glass is off and the anchor is the flat 4:3 bezel opening at the glass plane;
 *  - the camera is the shared watch-pose solver (the whole set within 95 per cent of the width,
 *    centred, the glass left of centre), so the haunt and v1's creep and orbit are off;
 *  - light spill is the generic `spill`, the Occupant is off, the wall decal is 0.04 at most.
 */
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { SetCameraRig } from '../../cameras/SetCameraRig';
import { SET_BOX } from '../../cameras/poses';
import { useDisplayStore } from '../../integration/stores';
import { SetLights } from '../../lights/SetLights';
import { GreyEnvironment } from '../../materials';
import { KnobLayer } from '../../objects/KnobLayer';
import { Room } from '../../objects/Room';
import { TvSet, TvSetLive } from '../../objects/TvSet';
import { ScreenOnly } from '../../ScreenOnly';
import type { EnvironmentSceneProps } from '../contract.ts';
import { EnvironmentCamera } from '../EnvironmentCamera.tsx';
import screenModule from './index.tsx';
import { LiveSpill } from './LiveSpill.tsx';
import { TvLiveProps } from './TvLiveProps.tsx';

/** The set's lateral extent in anchor-local metres (cabinet incl. the knob panel). */
const SET_EXTENT = { minX: SET_BOX.cx - SET_BOX.width / 2, maxX: SET_BOX.cx + SET_BOX.width / 2 };

function TvRoomScene({ channel }: EnvironmentSceneProps) {
  const mode = useDisplayStore((s) => s.renderMode);
  const invalidate = useThree((s) => s.invalidate);
  const live = channel > 0;
  useEffect(() => invalidate(), [live, invalidate]);

  // v1's phone-class full-bleed screen stays for channel 0.
  if (mode === '3d-screen' && !live) return <ScreenOnly />;
  return (
    <>
      {live ? <EnvironmentCamera envId="tv-room" extent={SET_EXTENT} /> : <SetCameraRig />}
      <GreyEnvironment intensity={0.4} />
      <SetLights />
      <Room live={live} />
      <KnobLayer>{live ? <TvSetLive /> : <TvSet />}</KnobLayer>
      {live && <TvLiveProps spec={screenModule.screen} />}
      {live && <LiveSpill />}
    </>
  );
}

export default TvRoomScene;
