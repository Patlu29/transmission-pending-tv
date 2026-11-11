import { useContext, useMemo, type ReactNode } from 'react';
import { Matrix4, Quaternion } from 'three';
import { useWatchFrame } from '../watchFrame.ts';
import { ViewCtx } from './viewContext.ts';

/**
 * A group at the solved watch camera pose, so props can be placed in VIEW space (x right, y up, -z ahead)
 * and land at the same place on screen at every viewport. Renders nothing until the projector has solved.
 */
export function ViewFrame({ children }: { children: ReactNode }) {
  const frame = useWatchFrame();
  const quaternion = useMemo(() => {
    if (!frame) return null;
    return new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(frame.right, frame.up, frame.normal),
    );
  }, [frame]);
  if (!frame || !quaternion) return null;
  return (
    <ViewCtx.Provider value={frame}>
      <group position={frame.position} quaternion={quaternion}>
        {children}
      </group>
    </ViewCtx.Provider>
  );
}

interface PlacedProps {
  /** Position as a fraction of the stage: x from the left, y from the top. */
  x: number;
  y: number;
  /** Metres ahead of the camera. */
  depth: number;
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  children?: ReactNode;
}

/** Places children so their origin projects to the stage fraction (x, y) at `depth` metres ahead. */
export function ViewPlaced({ x, y, depth, rotation, scale, children }: PlacedProps) {
  const frame = useContext(ViewCtx);
  if (!frame) return null;
  const tanH = Math.tan((frame.fovDeg * Math.PI) / 360);
  const px = (x - 0.5) * 2 * depth * tanH * frame.aspect;
  const py = (0.5 - y) * 2 * depth * tanH;
  return (
    <group position={[px, py, -depth]} rotation={rotation} scale={scale}>
      {children}
    </group>
  );
}
