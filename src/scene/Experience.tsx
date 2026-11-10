import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { AdaptiveDpr } from './AdaptiveDpr';
import { SetCameraRig } from './cameras/SetCameraRig';
import { useDisplayStore, useIntroStore } from './integration/stores';
import { SetLights } from './lights/SetLights';
import { KnobLayer } from './objects/KnobLayer';
import { Room } from './objects/Room';
import { TvSet } from './objects/TvSet';
import { GreyEnvironment } from './materials';
import { ScreenDriver } from './ScreenDriver';
import { ScreenOnly } from './ScreenOnly';
import { ContextWatcher, ErrorBoundary, ProgressReporter, ReadyReporter } from './StatusReporter';

/**
 * The only <Canvas>. Default export so the app can `React.lazy(() => import('@/scene/Experience'))`.
 * Reads stores only; writes just webglLost, loadProgress, sceneReady, assetFailed and cameraOffWatch.
 * Mounted only for renderMode 3d-set or 3d-screen; renders nothing for 2d.
 */
export default function Experience() {
  const mode = useDisplayStore((s) => s.renderMode);
  const motion = useDisplayStore((s) => s.motion);
  const status = useIntroStore((s) => s.status);

  if (mode === '2d') return null;

  // "always" only while the picture animates (warm-up, or playing with full motion).
  // Camera tweens, the CRT collapse and the room-light low-pass request their own
  // frames while they move, so everything else stays on demand.
  const animating = status === 'warming' || (status === 'playing' && motion === 'full');

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-canvas, 0)', background: '#000' }}
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
          <AdaptiveDpr />
          <ProgressReporter />
          <ScreenDriver />
          <ErrorBoundary
            onError={(e) => useDisplayStore.getState().setAssetFailed(e.message || 'asset failed')}
          >
            <Suspense fallback={null}>
              {mode === '3d-set' ? (
                <>
                  <SetCameraRig />
                  <GreyEnvironment intensity={0.4} />
                  <SetLights />
                  <Room />
                  <KnobLayer>
                    <TvSet />
                  </KnobLayer>
                </>
              ) : (
                <ScreenOnly />
              )}
              <ReadyReporter />
            </Suspense>
          </ErrorBoundary>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
