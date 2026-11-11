import { create } from 'zustand';
import { computeGrid, type GridSpec } from '@/ui/teletext/grid';
import { chooseMode, forcedModeFromUrl } from './modeDetect';

export type RenderMode = '3d-set' | '3d-screen' | '2d';
export type Motion = 'full' | 'reduced';
/** Why `renderMode` is '2d' when it was not chosen: drives the notice bar. */
export type FallbackReason =
  null | 'no-webgl' | 'context-lost' | 'asset-failed' | 'scene-missing' | 'user';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DisplayState {
  renderMode: RenderMode;
  /** Set when `?mode=` forced the mode. A forced mode always wins on resize. */
  forcedMode: RenderMode | null;
  fallbackReason: FallbackReason;

  /** prefers-reduced-motion, live. */
  osReducedMotion: boolean;
  /** The manual Calm switch on the start screen. */
  calmSwitch: boolean;
  /**
   * THE flag the scene and shader read: osReducedMotion OR calmSwitch.
   * Never set directly. In useFrame use `useDisplayStore.getState().reducedMotion`.
   */
  reducedMotion: boolean;
  /** Mirror of `reducedMotion` for the architecture contract ('reduced' when it is true). */
  motion: Motion;

  audio: 'off' | 'on';
  /** 0..1, real values only. Written by the scene. */
  loadProgress: number;
  webglLost: boolean;
  /** Scene reports true when its assets are loaded and it can draw. */
  sceneReady: boolean;
  assetFailed: boolean;
  loadError: string | null;
  /** Bumped by Retry; the scene host remounts on change. */
  sceneAttempt: number;

  /** Grid of the active presenter (canvas or 2D screen). The clock paginates with it. */
  grid: GridSpec;
  /** The teletext canvas (ADR 0005). Replaced (new element) whenever its pixel size changes. */
  screenCanvas: HTMLCanvasElement | null;
  /** Incremented after every redraw of `screenCanvas`. */
  screenVersion: number;
  /** 3d-screen only: where the screen sits in the viewport (CSS px). */
  screenRect: Rect | null;

  /** Incremented by the Reset view key and Home. */
  cameraResetNonce: number;
  /** Written by the scene: camera is off the Watch pose. Shows the Reset view key. */
  cameraOffWatch: boolean;

  setOsReducedMotion(value: boolean): void;
  setCalm(value: boolean): void;
  toggleCalm(): void;
  toggleAudio(): void;
  setLoadProgress(value: number): void;
  setSceneReady(value?: boolean): void;
  setAssetFailed(message: string | null): void;
  retryScene(): void;
  /** WebGL context lost or unusable: switch to 2D, playback state is kept. */
  markWebglLost(): void;
  /** Visitor chose the plain version. */
  choosePlainVersion(): void;
  /** Switch to 2D for a reason that is not a lost context (no scene chunk, creation failure). */
  fallbackTo2d(reason: Exclude<FallbackReason, null>): void;
  setRenderMode(mode: RenderMode): void;
  setGrid(grid: GridSpec): void;
  setScreenCanvas(canvas: HTMLCanvasElement | null): void;
  bumpScreenVersion(): void;
  setScreenRect(rect: Rect | null): void;
  requestResetView(): void;
  setCameraOffWatch(value: boolean): void;
}

const initialGrid = computeGrid(960, 720);

function initialMode(): Pick<DisplayState, 'renderMode' | 'forcedMode' | 'fallbackReason'> {
  const forcedMode = typeof window === 'undefined' ? null : forcedModeFromUrl();
  if (typeof window === 'undefined') {
    return { renderMode: '2d', forcedMode, fallbackReason: null };
  }
  const choice = chooseMode();
  if (forcedMode) {
    return {
      renderMode: forcedMode,
      forcedMode,
      fallbackReason: forcedMode === '2d' ? null : choice.reason,
    };
  }
  return { renderMode: choice.mode, forcedMode, fallbackReason: choice.reason };
}

/** Calm persists for the visit in sessionStorage (per tab, no cookie). Every access is guarded: storage may throw. */
const CALM_KEY = 'transmission-pending:calm';

function readStoredCalm(): boolean {
  try {
    return window.sessionStorage.getItem(CALM_KEY) === '1';
  } catch {
    return false;
  }
}

function storeCalm(value: boolean): void {
  try {
    if (value) window.sessionStorage.setItem(CALM_KEY, '1');
    else window.sessionStorage.removeItem(CALM_KEY);
  } catch {
    /* storage unavailable: Calm still works for this page load */
  }
}

/** The OS preference, read at creation so the first paint is already calm when it asks for it. */
function readOsReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const initialCalm = typeof window === 'undefined' ? false : readStoredCalm();
const initialOs = typeof window === 'undefined' ? false : readOsReducedMotion();

function reduced(os: boolean, calm: boolean) {
  const reducedMotion = os || calm;
  return { reducedMotion, motion: (reducedMotion ? 'reduced' : 'full') as Motion };
}

export const useDisplayStore = create<DisplayState>()((set, get) => ({
  ...initialMode(),

  osReducedMotion: initialOs,
  calmSwitch: initialCalm,
  ...reduced(initialOs, initialCalm),

  audio: 'off',
  loadProgress: 0,
  webglLost: false,
  sceneReady: false,
  assetFailed: false,
  loadError: null,
  sceneAttempt: 0,

  grid: initialGrid,
  screenCanvas: null,
  screenVersion: 0,
  screenRect: null,

  cameraResetNonce: 0,
  cameraOffWatch: false,

  setOsReducedMotion: (value) =>
    set((s) =>
      s.osReducedMotion === value ? s : { osReducedMotion: value, ...reduced(value, s.calmSwitch) },
    ),
  setCalm: (value) => {
    storeCalm(value);
    set((s) =>
      s.calmSwitch === value ? s : { calmSwitch: value, ...reduced(s.osReducedMotion, value) },
    );
  },
  toggleCalm: () => get().setCalm(!get().calmSwitch),
  toggleAudio: () => set((s) => ({ audio: s.audio === 'on' ? 'off' : 'on' })),
  setLoadProgress: (value) => set({ loadProgress: Math.min(1, Math.max(0, value)) }),
  setSceneReady: (value = true) => set({ sceneReady: value }),
  setAssetFailed: (message) => set({ assetFailed: message !== null, loadError: message }),
  retryScene: () =>
    set((s) => ({
      assetFailed: false,
      loadError: null,
      sceneReady: false,
      loadProgress: 0,
      sceneAttempt: s.sceneAttempt + 1,
    })),
  markWebglLost: () =>
    set((s) =>
      s.renderMode === '2d'
        ? { webglLost: true }
        : { webglLost: true, renderMode: '2d', fallbackReason: 'context-lost', screenRect: null },
    ),
  choosePlainVersion: () =>
    set({
      renderMode: '2d',
      fallbackReason: 'user',
      assetFailed: false,
      loadError: null,
      screenRect: null,
    }),
  fallbackTo2d: (reason) =>
    set((s) =>
      s.renderMode === '2d' && s.fallbackReason
        ? s
        : { renderMode: '2d', fallbackReason: reason, screenRect: null },
    ),
  setRenderMode: (mode) => set({ renderMode: mode }),
  setGrid: (grid) => set({ grid }),
  setScreenCanvas: (canvas) => set({ screenCanvas: canvas }),
  bumpScreenVersion: () => set((s) => ({ screenVersion: s.screenVersion + 1 })),
  setScreenRect: (rect) => set({ screenRect: rect }),
  requestResetView: () =>
    set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1, cameraOffWatch: false })),
  setCameraOffWatch: (value) => set({ cameraOffWatch: value }),
}));

/** Reactive reduced-motion flag (OS preference OR the Calm switch). */
export const useReducedMotion = () => useDisplayStore((s) => s.reducedMotion);
