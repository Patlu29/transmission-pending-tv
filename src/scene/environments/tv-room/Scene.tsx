import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { SetCameraRig } from '../../cameras/SetCameraRig';
import { SET_BOX } from '../../cameras/poses';
import { useDisplayStore } from '../../integration/stores';
import { SetLights } from '../../lights/SetLights';
import { ControlRings } from '../../objects/ControlRings';
import { HoloRoomHost } from '../../objects/HoloRoomHost';
import { TvSet, TvSetLive } from '../../objects/TvSet';
import { ScreenOnly } from '../../ScreenOnly';
import type { EnvironmentSceneProps } from '../contract.ts';
import { EnvironmentCamera } from '../EnvironmentCamera.tsx';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import screenModule from './index.tsx';
import { useChannelBurst } from './useChannelBurst.ts';

/** The whole device's extent in anchor-local metres (pane plus puck), centred by the watch pose. */
const SET_EXTENT = {
  minX: SET_BOX.cx - SET_BOX.width / 2,
  maxX: SET_BOX.cx + SET_BOX.width / 2,
  minY: SET_BOX.cy - SET_BOX.height / 2,
  maxY: SET_BOX.cy + SET_BOX.height / 2,
};

/** Live channel: the anchor on the pane's flat face (rect inset 1.5 per cent) and the dark glass with its edge pulse. */
function LiveDisplay() {
  const burst = useChannelBurst();
  return (
    <>
      <ScreenAnchor spec={screenModule.screen} position={[0, 0, 0.0012]} />
      <TvSetLive burst={burst} />
    </>
  );
}

function TvRoomScene({ channel }: EnvironmentSceneProps) {
  const mode = useDisplayStore((s) => s.renderMode);
  const invalidate = useThree((s) => s.invalidate);
  const live = channel > 0;
  useEffect(() => invalidate(), [live, invalidate]);

  // The 3d-screen mode on channel 0: the pane fills the view, no device (ScreenOnly).
  if (mode === '3d-screen' && !live) return <ScreenOnly />;
  return (
    <>
      {live ? <EnvironmentCamera envId="tv-room" extent={SET_EXTENT} /> : <SetCameraRig />}
      <SetLights />
      <HoloRoomHost live={live} />
      <ControlRings>{live ? <LiveDisplay /> : <TvSet />}</ControlRings>
    </>
  );
}

export default TvRoomScene;
