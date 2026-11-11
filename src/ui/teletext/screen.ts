import { facts, intro } from '@/facts';
import { useHauntStore } from '@/state/hauntStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';
import { useDisplayStore } from '@/state/displayStore';
import { COLLAPSE_MS, SCREEN_FADE_MS } from '@/state/timing';
import { drawFrame } from './draw';
import { toFxInput, fxTick } from './fxFromStore';
import { resetFontMetrics } from './font';
import { buildFrame, type FrameInput } from './frame';
import { computeGrid } from './grid';
import { FONT_LOAD_SPECS, readPalette } from './palette';

/**
 * The teletext screen as one canvas (ADR 0005). API for the scene:
 *
 *   const canvas = useDisplayStore((s) => s.screenCanvas);   // wrap in a CanvasTexture
 *   useDisplayStore.subscribe(...) on `screenVersion`         // set texture.needsUpdate = true
 *
 * The canvas element is REPLACED (new element, new store value) whenever its
 * pixel size changes, so build the texture in an effect keyed on the canvas.
 * It is only drawn in the 3D modes. Greyscale only.
 */
export interface ScreenSize {
  /** On-screen size in CSS px; the grid maths use it (glyphs stay at least 16 px). */
  cssW: number;
  cssH: number;
  /** Canvas pixel size (960 x 720 in 3d-set, device-scaled elsewhere). */
  pixelW: number;
  pixelH: number;
}

let size: ScreenSize | null = null;
let canvas: HTMLCanvasElement | null = null;
let raf = 0;
let lastKey = '';
let held: { input: FrameInput; until: number } | null = null;
let lastPowered: FrameInput | null = null;
let fontsReady = false;

/** A cut between screens (page, sub-page, diary view) cross-fades over this long (design-spec 7.1: no 10 per cent tile step). */
const FADE_MS = SCREEN_FADE_MS;
let lastFrameId: string | null = null;
let snapshot: HTMLCanvasElement | null = null;
let fade: { start: number } | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;
let holdTimer: ReturnType<typeof setTimeout> | undefined;

/** Snapshot of the store state the frame model needs (also used for tap hit-testing). */
export function currentFrameInput(): FrameInput {
  const i = useIntroStore.getState();
  const d = useDisplayStore.getState();
  return {
    status: i.status,
    blank: i.blank,
    paused: i.paused,
    pageIndex: i.pageIndex,
    lineIndex: i.lineIndex,
    revealedChars: i.revealedChars,
    diary: i.diary,
    diaryCursor: i.diaryCursor,
    pageEntry: i.pageEntry,
    noSuchPage: i.noSuchPageAt !== null,
    loadProgress: d.loadProgress,
    assetFailed: d.assetFailed,
    reducedMotion: d.reducedMotion,
    fx: d.reducedMotion ? null : toFxInput(useHauntStore.getState().textEffects),
  };
}

function inputKey(i: FrameInput, cols: number, rows: number): string {
  return [
    i.status,
    i.blank,
    i.paused,
    i.pageIndex,
    i.lineIndex,
    i.revealedChars,
    i.diary.kind === 'index' ? `i${i.diary.sub}` : `c${i.diary.index}`,
    i.diaryCursor,
    i.pageEntry,
    i.noSuchPage,
    i.status === 'loading' ? Math.round(i.loadProgress * 100) : '',
    i.assetFailed,
    i.reducedMotion,
    cols,
    rows,
    i.fx ? `${i.fx.lineId}:${i.fx.kind}:${fxTick(i.fx)}` : '',
  ].join('|');
}

function draw(force = false) {
  raf = 0;
  const display = useDisplayStore.getState();
  if (!canvas || !size || !fontsReady || display.renderMode === '2d') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let input = currentFrameInput();
  if (isPoweredStatus(input.status)) lastPowered = input;
  if (held && performance.now() >= held.until) held = null;
  if (held) input = held.input;

  const grid = display.grid;
  const now = performance.now();
  const key = `${inputKey(input, grid.cols, grid.rows)}|${fade ? Math.floor((now - fade.start) / 33) : -1}`;
  if (!force && key === lastKey) return;
  lastKey = key;

  const frame = buildFrame(input, grid, { intro, facts });
  if (lastFrameId !== null && frame.id !== lastFrameId) {
    // The canvas still holds the previous screen: keep a copy to fade out over the new one.
    if (!snapshot || snapshot.width !== canvas.width || snapshot.height !== canvas.height) {
      snapshot = document.createElement('canvas');
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
    }
    snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
    fade = { start: now };
  }
  lastFrameId = frame.id;
  drawFrame(ctx, frame, grid, readPalette(), canvas.width / size.cssW);
  if (fade && snapshot) {
    const p = (now - fade.start) / FADE_MS;
    if (p >= 1) fade = null;
    else {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1 - p * p * (3 - 2 * p); // smoothstep: no single 100 ms window carries more than its share
      ctx.drawImage(snapshot, 0, 0);
      ctx.restore();
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => schedule(), 33);
    }
  }
  display.bumpScreenVersion();
}

function schedule(force = false) {
  if (force) lastKey = '';
  if (raf) return;
  raf = requestAnimationFrame(() => draw());
}

/** Starts redrawing on store changes. Call once from the app root; returns a stop function. */
export function startTeletextScreen(): () => void {
  let prevPowered = isPoweredStatus(useIntroStore.getState().status);
  const onIntro = () => {
    const powered = isPoweredStatus(useIntroStore.getState().status);
    if (prevPowered && !powered && lastPowered && !useDisplayStore.getState().reducedMotion) {
      // Keep the last picture on the canvas while the CRT collapse plays.
      held = { input: lastPowered, until: performance.now() + COLLAPSE_MS };
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => schedule(true), COLLAPSE_MS + 30);
    }
    if (powered && !prevPowered) held = null;
    prevPowered = powered;
    schedule();
  };
  const unsubs = [
    useIntroStore.subscribe(onIntro),
    useDisplayStore.subscribe(() => schedule()),
    useHauntStore.subscribe(() => schedule()),
  ];
  const onFonts = () => {
    resetFontMetrics();
    readPalette(true);
    schedule(true);
  };
  document.fonts?.addEventListener('loadingdone', onFonts);
  // Wait for the faces before the first draw (a timeout keeps the screen working if a font never arrives).
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  const loads = Promise.all(
    FONT_LOAD_SPECS.map((spec) => document.fonts?.load(spec).catch(() => undefined)),
  );
  void Promise.race([loads, timeout]).then(() => {
    fontsReady = true;
    onFonts();
  });
  schedule(true);
  return () => {
    unsubs.forEach((u) => u());
    document.fonts?.removeEventListener('loadingdone', onFonts);
    clearTimeout(holdTimer);
    clearTimeout(fadeTimer);
    fontsReady = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}

/**
 * Sets the on-screen and pixel size. Recomputes the grid, replaces the canvas
 * if the pixel size changed, and redraws. Called by the ScreenSizer component.
 */
export function setScreenSize(next: ScreenSize) {
  const pixelW = Math.max(1, Math.round(next.pixelW));
  const pixelH = Math.max(1, Math.round(next.pixelH));
  const display = useDisplayStore.getState();
  const grid = computeGrid(next.cssW, next.cssH);
  size = { ...next, pixelW, pixelH };
  if (!canvas || canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas = document.createElement('canvas');
    canvas.width = pixelW;
    canvas.height = pixelH;
    lastFrameId = null;
    fade = null;
    display.setScreenCanvas(canvas);
  }
  display.setGrid(grid);
  schedule(true);
}

/** Releases the canvas (when switching to 2D). */
export function clearScreenSize() {
  size = null;
  canvas = null;
  useDisplayStore.getState().setScreenCanvas(null);
}
