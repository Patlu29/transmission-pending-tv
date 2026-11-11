import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useDisplayStore } from '@/state/displayStore';

type SceneModule = { default: ComponentType };

/**
 * The scene is optional at build time: import.meta.glob returns nothing when
 * src/scene/Experience.tsx does not exist, and the app falls back to 2D.
 */
const loaders = import.meta.glob<SceneModule>('/src/scene/Experience.tsx');
const loadScene = Object.values(loaders)[0] ?? null;

/** One lazy component per attempt: React.lazy caches a rejected import, so Retry needs a fresh one. */
const MAX_ATTEMPTS = 4;
const SCENES: ComponentType[] = loadScene
  ? Array.from({ length: MAX_ATTEMPTS }, () => lazy(loadScene))
  : [];

export const hasScene = loadScene !== null;

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    const display = useDisplayStore.getState();
    // Canvas throws when it cannot create a WebGL context: that is the 2D case.
    if (/webgl/i.test(error.message)) display.fallbackTo2d('no-webgl');
    else display.setAssetFailed("The display's picture did not arrive.");
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Hosts the lazily loaded 3D scene. The host fills the viewport in both 3D
 * modes; in 3d-screen the scene places its quad on displayStore.screenRect.
 * aria-hidden: the canvas is decorative.
 */
export function SceneHost({ onLoaded }: { onLoaded: () => void }) {
  const attempt = useDisplayStore((s) => s.sceneAttempt);
  const hostRef = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  const Scene = SCENES[Math.min(attempt, MAX_ATTEMPTS - 1)] ?? null;

  // Mount after first paint so the Power key is interactive before three.js arrives (NFR-2).
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!Scene) useDisplayStore.getState().fallbackTo2d('scene-missing');
  }, [Scene]);

  // webglcontextlost does not bubble; a capture listener on the host still sees it.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onLost = (e: Event) => {
      e.preventDefault();
      useDisplayStore.getState().markWebglLost();
    };
    host.addEventListener('webglcontextlost', onLost, true);
    return () => host.removeEventListener('webglcontextlost', onLost, true);
  }, []);

  return (
    <div ref={hostRef} className="scene-host" data-scene-host aria-hidden="true">
      {go && Scene && (
        <SceneBoundary key={attempt}>
          <Suspense fallback={null}>
            <Loaded onLoaded={onLoaded} />
            <Scene />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}

/** Rendered beside the scene inside Suspense: mounts only once the lazy chunk has resolved. */
function Loaded({ onLoaded }: { onLoaded: () => void }) {
  useEffect(onLoaded, [onLoaded]);
  return null;
}
