// Test hook (dev and test builds only): QA reads live scene state through
// window.__SCENE_TEST__ without reading pixels. Parts register themselves here.
export function publishSceneTest(part: Record<string, unknown>): void {
  if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) return;
  const w = window as unknown as { __SCENE_TEST__?: Record<string, unknown> };
  w.__SCENE_TEST__ = { ...w.__SCENE_TEST__, ...part };
}
