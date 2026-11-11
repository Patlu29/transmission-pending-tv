import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { EnvironmentId } from './contract.ts';
import { EnvironmentRoot } from './EnvironmentRoot.tsx';
import { loadScene, setSceneLoader } from './lazyScene.ts';
import { ENVIRONMENTS } from './registry.ts';

// One dynamic import per room, so Vite emits one chunk each (ADR 0011 section 2). tv-room is v1's
// scene and ships in the main scene chunk (Experience imports it directly).
setSceneLoader('tv-room', () => import('./tv-room/Scene.tsx'));
setSceneLoader('cinema', () => import('./cinema/Scene.tsx'));
setSceneLoader('drive-in', () => import('./drive-in/Scene.tsx'));
setSceneLoader('open-air', () => import('./open-air/Scene.tsx'));
setSceneLoader('bedroom', () => import('./bedroom/Scene.tsx'));
setSceneLoader('chai-stall', () => import('./chai-stall/Scene.tsx'));
setSceneLoader('train', () => import('./train/Scene.tsx'));
setSceneLoader('space-deck', () => import('./space-deck/Scene.tsx'));
setSceneLoader('mountain-sky', () => import('./mountain-sky/Scene.tsx'));

function makeRoom(id: EnvironmentId): LazyExoticComponent<ComponentType> {
  return lazy(async () => {
    const [module] = await Promise.all([ENVIRONMENTS[id].load(), loadScene(id)]);
    const m = module.default;
    return { default: () => createElement(EnvironmentRoot, { module: m }) };
  });
}

/** Every room as a React.lazy component, created once (one chunk each), so a revisit does not reload. */
export const ROOM_COMPONENTS: Readonly<Record<EnvironmentId, LazyExoticComponent<ComponentType>>> =
  {
    'tv-room': makeRoom('tv-room'),
    cinema: makeRoom('cinema'),
    'drive-in': makeRoom('drive-in'),
    'open-air': makeRoom('open-air'),
    bedroom: makeRoom('bedroom'),
    'chai-stall': makeRoom('chai-stall'),
    train: makeRoom('train'),
    'space-deck': makeRoom('space-deck'),
    'mountain-sky': makeRoom('mountain-sky'),
  };

/** Prefetch a room's chunk (call on picker hover or focus). The browser caches the import. */
export function prefetchEnvironment(id: EnvironmentId): void {
  void loadScene(id).catch(() => undefined);
}
