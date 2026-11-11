import { OrthographicCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { useDisplayStore } from './integration/stores';
import { ScreenSurface } from './objects/ScreenSurface';

function cssPx(name: string, fallback: number): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

/**
 * 3d-screen: a full-bleed screen quad in an 8 px bezel, orthographic, 1 unit = 1 CSS px,
 * and no camera motion of any kind (design-spec 3.3). The dock lives in the DOM:
 * 64 px at the bottom, or on the right when the viewport is under 500 px high.
 * If the UI publishes displayStore.screenRect it wins; otherwise the rect is
 * computed here from --bezel-thin and --dock-size. env(safe-area-inset-*) is not read.
 */
export function ScreenOnly() {
  const size = useThree((s) => s.size);
  const rect = useDisplayStore((s) => s.screenRect);
  const [landscapeShort, setLandscapeShort] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-height: 499px) and (orientation: landscape)');
    const update = () => setLandscapeShort(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const bezel = cssPx('--bezel-thin', 8);
  const dock = cssPx('--dock-size', 64);
  const right = landscapeShort ? dock : 0;
  const bottom = landscapeShort ? 0 : dock;
  let w = Math.max(16, size.width - 2 * bezel - right);
  let h = Math.max(16, size.height - 2 * bezel - bottom);
  let cx = (bezel - right - bezel) / 2;
  let cy = (bottom - bezel + bezel) / 2;
  if (rect) {
    w = Math.max(16, rect.w);
    h = Math.max(16, rect.h);
    cx = rect.x + rect.w / 2 - size.width / 2;
    cy = size.height / 2 - (rect.y + rect.h / 2);
  }

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 10]} near={0.1} far={50} zoom={1} />
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[size.width, size.height]} />
        <meshBasicMaterial color="#05080f" toneMapped={false} />
      </mesh>
      <group position={[cx, cy, 0]}>
        <ScreenSurface width={w} height={h} />
        {/* 2 px edge light round the pane (design-spec-2050 3.6), just outside the picture */}
        {(
          [
            [0, h / 2 + 1, w + 4, 2],
            [0, -h / 2 - 1, w + 4, 2],
            [-w / 2 - 1, 0, 2, h],
            [w / 2 + 1, 0, 2, h],
          ] as const
        ).map(([x, y, sx, sy], i) => (
          <mesh key={i} position={[x, y, 0.1]}>
            <planeGeometry args={[sx, sy]} />
            <meshBasicMaterial color="#8fe3ff" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}
