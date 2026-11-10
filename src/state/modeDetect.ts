import type { RenderMode } from './displayStore';

/** Design-spec 3.1: 3d-set needs ALL of these, otherwise 3d-screen (WebGL2 permitting). */
export const SET_MEDIA_QUERY =
  '(min-width: 1024px) and (min-height: 600px) and (min-aspect-ratio: 5/4) and (hover: hover) and (pointer: fine)';

const MODES: readonly RenderMode[] = ['3d-set', '3d-screen', '2d'];

/** `?mode=2d|3d-screen|3d-set` forces a mode (QA, debugging). */
export function forcedModeFromUrl(): RenderMode | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get('mode');
  return MODES.find((m) => m === q) ?? null;
}

let webgl2: boolean | null = null;

/** True when a WebGL2 context can be created. Cached; the probe context is released at once. */
export function hasWebGL2(): boolean {
  if (webgl2 !== null) return webgl2;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    webgl2 = gl !== null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

export interface ModeChoice {
  mode: RenderMode;
  reason: 'no-webgl' | null;
}

/** The mode implied by the environment (ignores the URL override and any runtime fallback). */
export function chooseMode(): ModeChoice {
  if (!hasWebGL2()) return { mode: '2d', reason: 'no-webgl' };
  const wide = window.matchMedia(SET_MEDIA_QUERY).matches;
  return { mode: wide ? '3d-set' : '3d-screen', reason: null };
}
