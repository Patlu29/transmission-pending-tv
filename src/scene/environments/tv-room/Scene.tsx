import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { SetCameraRig } from '../../cameras/SetCameraRig';
import { SET_BOX } from '../../cameras/poses';
import { useDisplayStore } from '../../integration/stores';
import { SetLights } from '../../lights/SetLights';
import { GreyEnvironment } from '../../materials';
import { TvRoomExtras } from '../../materials/rooms/tvRoom/TvRoomExtras.tsx';
import { KnobLayer } from '../../objects/KnobLayer';
import { Room } from '../../objects/Room';
import { TvSet, TvSetLive } from '../../objects/TvSet';
import { ScreenOnly } from '../../ScreenOnly';
import type { EnvironmentSceneProps } from '../contract.ts';
import { EnvironmentCamera } from '../EnvironmentCamera.tsx';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import { useColourActive } from '../seam.ts';
import { useRoomBindings } from '../shared/useRoomBindings.ts';
import screenModule from './index.tsx';
import { useChannelBurst } from './useChannelBurst.ts';

/** The set's lateral extent in anchor-local metres (cabinet incl. the knob panel). */
const SET_EXTENT = {
  minX: SET_BOX.cx - SET_BOX.width / 2,
  maxX: SET_BOX.cx + SET_BOX.width / 2,
  minY: SET_BOX.cy - SET_BOX.height / 2,
  maxY: SET_BOX.cy + SET_BOX.height / 2,
};

/** Live-channel dressing: the anchor on the flat bezel opening plus the technical-artist's lamp, rug and bezel ring. */
function LiveExtras({ calm }: { calm: boolean }) {
  const colourActive = useColourActive();
  const burst = useChannelBurst();
  const bindings = useRoomBindings(screenModule.screen.widthM * 1.6);
  return (
    <>
      <ScreenAnchor spec={screenModule.screen} position={[0, 0, 0.0008]} />
      <TvRoomExtras
        calm={calm}
        colourActive={colourActive}
        burst={burst}
        uniforms={bindings.uniforms}
      />
    </>
  );
}

function TvRoomScene({ channel, calm }: EnvironmentSceneProps) {
  const mode = useDisplayStore((s) => s.renderMode);
  const invalidate = useThree((s) => s.invalidate);
  const colourActive = useColourActive();
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
      {/* Channel 0 never tints. On live channels: flat black backing in place of the dome, no CRT or haunt on the glass. */}
      <KnobLayer>{live ? <TvSetLive tint={colourActive ? 1 : 0} /> : <TvSet />}</KnobLayer>
      {live && <LiveExtras calm={calm} />}
    </>
  );
}

export default TvRoomScene;
