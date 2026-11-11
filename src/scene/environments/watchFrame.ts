import { useSyncExternalStore } from 'react';
import type { Vector3 } from 'three';

/**
 * The solved watch camera frame, shared with room props that are placed in view space
 * (dashboards, seat backs, the ledge). Written by EnvironmentCamera when it solves.
 */
export interface WatchFrame {
  /** Camera position at the watch pose. */
  position: Vector3;
  right: Vector3;
  up: Vector3;
  /** Anchor normal (points at the camera; the camera looks along -normal). */
  normal: Vector3;
  fovDeg: number;
  aspect: number;
  /** CSS px of the stage. */
  width: number;
  height: number;
  /** Where the screen rect lands in the watch pose. */
  rect: { x: number; y: number; width: number; height: number };
  phone: boolean;
  /** Camera distance from the anchor plane at the watch pose, metres. */
  distance: number;
  version: number;
}

let frame: WatchFrame | null = null;
const listeners = new Set<() => void>();

export function setWatchFrame(f: WatchFrame | null): void {
  frame = f;
  listeners.forEach((l) => l());
}

export const getWatchFrame = () => frame;

export function useWatchFrame(): WatchFrame | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => frame,
  );
}
