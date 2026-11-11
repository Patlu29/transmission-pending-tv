import type { Object3D } from 'three';
import type { ScreenAnchorSpec } from './contract.ts';

/** The one registered screen anchor (each room renders exactly one). */
export interface RegisteredAnchor {
  object: Object3D;
  spec: ScreenAnchorSpec;
}

let current: RegisteredAnchor | null = null;
const listeners = new Set<() => void>();

export function registerAnchor(a: RegisteredAnchor): () => void {
  current = a;
  listeners.forEach((l) => l());
  return () => {
    if (current === a) {
      current = null;
      listeners.forEach((l) => l());
    }
  };
}

export const getAnchor = () => current;

export function subscribeAnchor(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
