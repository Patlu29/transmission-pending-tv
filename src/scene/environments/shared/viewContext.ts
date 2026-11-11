import { createContext, useContext } from 'react';
import type { WatchFrame } from '../watchFrame.ts';

export const ViewCtx = createContext<WatchFrame | null>(null);

/** Metres across the stage's width at `depth` (for sizing props to a share of the screen). */
export function useViewWidth(depth: number): number {
  const frame = useContext(ViewCtx);
  if (!frame) return 1;
  return 2 * depth * Math.tan((frame.fovDeg * Math.PI) / 360) * frame.aspect;
}
