/**
 * Late-bound room scenes. Each room's `index.tsx` is a LIGHT facade (id, screen spec, and a `Scene`
 * that resolves lazily through this file) so that Node-side tests and the node tsconfig can load every
 * module without pulling in three.js, R3F, shaders or v1 scene code. The app side
 * (`lazyEnvironments.ts`) registers the real dynamic imports, one chunk per room.
 * This file imports only React and the contract, with explicit extensions.
 */
import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { EnvironmentId, EnvironmentSceneProps } from './contract.ts';

type SceneModule = { default: ComponentType<EnvironmentSceneProps> };
type Loader = () => Promise<SceneModule>;

const loaders = new Map<EnvironmentId, Loader>();
const lazies = new Map<EnvironmentId, LazyExoticComponent<ComponentType<EnvironmentSceneProps>>>();

export function setSceneLoader(id: EnvironmentId, loader: Loader): void {
  loaders.set(id, loader);
}

/** Start (or reuse) the room's chunk download. */
export function loadScene(id: EnvironmentId): Promise<SceneModule> {
  const loader = loaders.get(id);
  if (!loader) return Promise.reject(new Error(`No scene loader registered for "${id}"`));
  return loader();
}

export function lazyScene(id: EnvironmentId): ComponentType<EnvironmentSceneProps> {
  return function LazyScene(props: EnvironmentSceneProps) {
    let Scene = lazies.get(id);
    if (!Scene) {
      Scene = lazy(() => loadScene(id));
      lazies.set(id, Scene);
    }
    return createElement(Scene, props);
  };
}
