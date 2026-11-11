// The E2E specs pass functions to page.evaluate(), which run in the browser. tsconfig.node.json has no DOM
// library, so this brings the DOM types into the program for tests only, and types the app's test hooks.
/// <reference lib="dom" />
/* eslint-disable @typescript-eslint/no-explicit-any */
interface TestStore {
  getState(): any;
  setState(patch: Record<string, unknown>): void;
  subscribe(listener: () => void): () => void;
}

interface Window {
  __APP_TEST__: {
    useIntroStore: TestStore;
    useDisplayStore: TestStore;
    useUiStore: TestStore;
    useHauntStore: TestStore;
  };
  __SCENE_TEST__: {
    crtUniforms: Record<
      'uTime' | 'uCalm' | 'uCollapse' | 'uGhost' | 'uGhostNear' | 'uHauntVignette' | 'uRoll',
      { value: number }
    >;
  };
  __unpin?: () => void;
  __clickAt: number;
  __marker?: string;
  __audioContexts: number;
}
