import { Canvas } from '@react-three/fiber';
import { Suspense, useDeferredValue } from 'react';
import { AdaptiveDpr } from './AdaptiveDpr';
import { AmbientTicker } from './AmbientTicker';
import { useDisplayStore, useIntroStore } from './integration/stores';
import TvRoomScene from './environments/tv-room/Scene.tsx';
import { EnvironmentHost } from './environments/EnvironmentHost.tsx';
import {
  useChannelNumber,
  useColourActive,
  useEnvironmentStore,
  useIsLive,
} from './environments/seam.ts';
import { ScreenDriver } from './ScreenDriver';
import {
  ContextWatcher,
  ErrorBoundary,
  ProgressReporter,
  ReadyReporter,
  RoomReadyReporter,
} from './StatusReporter';

/**
 * The only <Canvas>. Default export so the app can `React.lazy(() => import('@/scene/Experience'))`.
 * Reads stores only; writes just webglLost, loadProgress, sceneReady, assetFailed and cameraOffWatch.
 * Mounted only for renderMode 3d-set or 3d-screen; renders nothing for 2d.
 */
export default function Experience() {
  const mode = useDisplayStore((s) => s.renderMode);
  const motion = useDisplayStore((s) => s.motion);
  const status = useIntroStore((s) => s.status);
  const env = useEnvironmentStore((s) => s.id);
  const colour = useColourActive() ? 'colour' : 'bw';
  const channel = useChannelNumber();
  const isLive = useIsLive();
  // Keep showing the previous room until the new one is built (environmentStore.ready).
  const shownEnv = useDeferredValue(env);
  const pose = useEnvironmentStore((s) => s.pose);

  if (mode === '2d') return null;
  const isTvRoom = shownEnv === 'tv-room';
  const live = !isTvRoom || isLive;

  // "always" only while the picture animates (warm-up, or playing with full motion).
  // Camera tweens, the CRT collapse and the room-light low-pass request their own
  // frames while they move, so everything else stays on demand.
  // v2 rooms animate their surroundings continuously (frozen and on demand under Calm). That motion is
  // slow, so it runs on a 30 Hz demand ticker rather than the 60 Hz "always" loop.
  const animating = status === 'warming' || (status === 'playing' && motion === 'full');
  const ambient = !animating && live && motion === 'full';

  return (
    <div
      aria-hidden="true"
      data-env={shownEnv}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-canvas, 0)',
        background: '#000',
      }}
    >
      <ErrorBoundary onError={() => useDisplayStore.getState().markWebglLost()}>
        <Canvas
          key={mode} // antialias is fixed at context creation, so a mode change makes a new context
          flat // NoToneMapping: keeps greys neutral (architecture 4.5)
          dpr={[1, 2]}
          frameloop={animating ? 'always' : 'demand'}
          // MSAA only for the 3D set; the 3d-screen is one flat quad (pixel-identical without it, measured)
          gl={{ antialias: mode === '3d-set', powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#000000']} />
          <ContextWatcher />
          <AdaptiveDpr ambient={ambient} />
          <AmbientTicker active={ambient} />
          <ProgressReporter />
          <ScreenDriver />
          <ErrorBoundary
            onError={(e) => {
              useDisplayStore.getState().setAssetFailed(e.message || 'asset failed');
              // `loading` has no safety timeout, so setReady must fire even when a room fails.
              useEnvironmentStore.getState().setReady();
            }}
          >
            <Suspense fallback={null}>
              {isTvRoom ? (
                <TvRoomScene
                  calm={motion === 'reduced'}
                  pose={pose}
                  colour={colour}
                  channel={channel}
                />
              ) : (
                <>
                  <EnvironmentHost id={shownEnv} />
                </>
              )}
              <ReadyReporter />
              <RoomReadyReporter shown={shownEnv} />
            </Suspense>
          </ErrorBoundary>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
