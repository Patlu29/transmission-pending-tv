# Handoff: frontend-developer

## Summary
Built the DOM interface, the three zustand stores, the intro clock, mode detection, the teletext rasteriser (canvas and 2D DOM outputs from one frame model), the diary, the dock with focus and live-region behaviour, the transcript, Calm mode, optional synthesised audio and the 2D presentation. `npm run lint`, `typecheck` and `build` pass. A headless Chrome run covered 2D (desktop, phone portrait, phone landscape), 3d-set and 3d-screen loading, Calm, shortcuts, the dialog and power-off.
Measured in 2D: warm-up 2.5 s, intro about 44.6 s after it (FR-8: 30 to 60 s). Grids match the spec worked examples (360 x 740 gives 26 cols at 20 px; 740 x 360 gives 40 x 12).

## Files changed
- `src/state/displayStore.ts`, `introStore.ts`, `uiStore.ts`, `timing.ts`, `modeDetect.ts`: stores, timing constants, mode detection
- `src/hooks/`: `useIntroClock.ts` (rAF clock, exports the reveal constants), `useMotionPreference.ts`, `useRenderMode.ts`, `useBootstrap.ts`, `useStageShortcuts.ts`, `useFrameInput.ts`, `useViewport.ts`, `useMediaQuery.ts`, `audioEngine.ts`
- `src/ui/teletext/`: `grid.ts`, `wrap.ts`, `playlist.ts`, `diary.ts`, `frame.ts`, `palette.ts`, `testCard.ts`, `draw.ts`, `screen.ts`, `hit.ts`, `index.ts`
- `src/ui/components/`: `Dock`, `DockKey`, `StartScreen`, `Hud`, `LiveRegion`, `IntroText`, `Transcript`, `TranscriptDialog`, `Screen2D`, `HitLayer`, `ScreenSizer`, `SceneHost`, `Notices`
- `src/ui/actions.ts`, `noiseTile.ts`, `ui.css`
- `src/App.tsx`, `src/main.tsx`: root, imports `tokens.css`, `fonts.css` (the WOFF2 files exist) and `ui.css`

I also edited `index.html` (the `<noscript>` message the ux-ui-designer asked the architect for). It is a root file, so the architect should note it.

## Store shape (for scene, QA and other agents)

`useDisplayStore` (`src/state/displayStore.ts`)

| Field | Type | Meaning | Read by |
|---|---|---|---|
| `renderMode` | `'3d-set' \| '3d-screen' \| '2d'` | Current presentation | scene, UI |
| `forcedMode` | `RenderMode \| null` | From `?mode=`; always wins | UI |
| `fallbackReason` | `null \| 'no-webgl' \| 'context-lost' \| 'asset-failed' \| 'scene-missing' \| 'user'` | Why 2D was reached | notice bar |
| `reducedMotion` | `boolean` | THE flag: OS reduced motion OR the Calm switch. Frozen noise, no warm-up, no camera motion, whole pages, manual advance. In `useFrame` read `getState().reducedMotion` | scene, shader, clock, UI |
| `motion` | `'full' \| 'reduced'` | Mirror of `reducedMotion` (architecture contract; the scene currently reads this) | scene |
| `osReducedMotion`, `calmSwitch` | `boolean` | The two inputs. Never set `reducedMotion` directly; use `setOsReducedMotion` and `setCalm` | UI |
| `audio` | `'off' \| 'on'` | Always starts `'off'` | scene (volume knob), UI |
| `loadProgress` | `number` 0..1 | Real value, written by the scene | UI |
| `sceneReady` | `boolean` | Scene sets true when it can draw; enables Power | UI |
| `assetFailed`, `loadError` | `boolean`, `string \| null` | Scene calls `setAssetFailed(message)`; shows the alert with Retry and "Use plain version" | UI |
| `sceneAttempt` | `number` | Bumped by Retry; remounts the lazy scene | UI |
| `webglLost` | `boolean` | Scene calls `markWebglLost()`: switches to 2D at the current page and line | UI |
| `grid` | `GridSpec` | cols, rows, fontPx, etc. of the active presenter | clock, rasteriser |
| `screenCanvas` | `HTMLCanvasElement \| null` | The teletext canvas (see API below) | scene |
| `screenVersion` | `number` | Incremented after every redraw of `screenCanvas` | scene |
| `screenRect` | `{x,y,w,h} \| null` | 3d-screen only: screen position in CSS px (safe-area aware) | scene, hit layer |
| `cameraResetNonce` | `number` | Bumped by Reset view and Home | scene |
| `cameraOffWatch` | `boolean` | Scene writes; shows the Reset view key | UI |

Actions: `setOsReducedMotion`, `setCalm`, `toggleCalm`, `toggleAudio`, `setLoadProgress`, `setSceneReady`, `setAssetFailed`, `retryScene`, `markWebglLost`, `choosePlainVersion`, `fallbackTo2d`, `setRenderMode`, `setGrid`, `setScreenCanvas`, `bumpScreenVersion`, `setScreenRect`, `requestResetView`, `setCameraOffWatch`. Hook: `useReducedMotion()`.

`useIntroStore` (`src/state/introStore.ts`)

| Field | Type | Meaning |
|---|---|---|
| `status` | `'off' \| 'loading' \| 'ready' \| 'warming' \| 'playing' \| 'ended'` | Starts `loading`, becomes `ready` when the scene is ready (or at once in 2D). Power-off returns to `ready`. `off` is kept for the contract and treated like `ready`. Powered = `warming`, `playing` or `ended` (`isPoweredStatus`) |
| `pageIndex`, `lineIndex`, `revealedChars` | `number` | Intro position. `revealedChars` is `ALL_CHARS` (`Number.MAX_SAFE_INTEGER`) for a fully shown line (Calm). Screens can split a page into sub-pages, so the shown frame is derived |
| `paused`, `blank`, `autoAdvance` | `boolean` | Pause (WCAG 2.2.2); 200 ms black frame on Replay; Calm auto-advance (default off) |
| `epoch`, `statusSince` | `number` | Jump counter for the clock; `performance.now()` of the last status change |
| `diary`, `diaryCursor`, `pageEntry`, `noSuchPageAt` | see file | Diary view (P100 index or commit page), highlighted entry, typed digits, "NO SUCH PAGE" timer |

Actions: `power()` (toggles on and off), `skip()`, `replay()`, `nextPage()`, `prevPage()`, `togglePause()`, `toggleAutoAdvance()`, `goIndex()`, `openCommit(i)`, `typeDigit(d)`, `backspacePage()`, `moveCursor(n)`, `openCursor()`, `markReady()`. Clock-only: `startIntro`, `endIntro`, `setProgress`, `clearBlank`, `clearNoSuchPage`.

`useUiStore`: `transcriptOpen`, `liveMessage`, `focusRequest`, with `openTranscript`, `closeTranscript`, `announce`, `requestFocus`.

Test hook: in dev and `--mode test` builds, `window.__APP_TEST__ = { useIntroStore, useDisplayStore, useUiStore }`. A normal `npm run build` does not include it.

## Teletext canvas API (for the scene)
- `useDisplayStore((s) => s.screenCanvas)`: wrap in a `CanvasTexture`. The element is REPLACED (new element, new store value) when its pixel size changes, so build the texture in an effect keyed on the canvas. 3d-set is 960 x 720; 3d-screen is the screen rect times DPR (capped at 2048).
- After each redraw `screenVersion` increments: set `texture.needsUpdate = true` and invalidate. It only redraws when the frame content changes.
- On power-off the canvas keeps the last picture for `COLLAPSE_MS` (450 ms, `src/state/timing.ts`) so the shader can collapse it, unless reduced motion.
- The module is `src/ui/teletext/` (`startTeletextScreen`, `setScreenSize`, `currentFrameInput`); the app starts it. The scene must not call these.
- Constants for QA: `REVEAL_CPS`, `LINE_GAP_MS`, `PAGE_HOLD_BASE_MS`, `PAGE_HOLD_PER_CHAR_MS`, `END_HOLD_MS` from `@/hooks/useIntroClock` (also in `@/state/timing`, with `estimateIntroDurationMs`).

## Decisions
- Power-off goes straight to `ready`; the scene (it already does) and the 2D screen play the collapse. No `closing` status, to keep the scene's contract.
- Calm mode is a switch on the start screen. `reducedMotion` is OS OR Calm, live. It also sets `data-calm` on `<html>` so CSS durations collapse. When the OS preference is on, the switch shows "on (system setting)" and cannot be turned off.
- Playback paginates on a shared frame model with sub-pages (spec 5.3): one blank row between lines, 3 rows reserved (header, title, fastext). The clock, canvas and 2D screen all use it, so a lost WebGL context resumes at the same line.
- 2D visible screen is a separate aria-hidden rendering of the frame model; the visually hidden `Transcript` stays the one text of record with `data-fact`. This deviates from spec 3.4 ("the transcript component is the screen"). Reason: one `[data-fact]` set per page in every mode, which QA relies on. The "Read full text" dialog repeats the text without `data-fact` for the same reason.
- Diary entries are buttons only inside the dialog. In the hidden transcript they are plain list items, to avoid invisible focus stops.
- The scene host fills the viewport in both 3D modes; in 3d-screen the scene places its quad on `screenRect` (what the scene-developer built).
- Test card is drawn by the rasteriser (spec 11, simplified: portrait uses one uniform scale, not the re-flowed layout).
- Audio is built: Web Audio hum (50 and 100 Hz), filtered static and a power click. No files. The `AudioContext` is created only inside the unmute action. Cheap enough (about 100 lines).
- `?mode=` forces a mode. Resize re-evaluates 3d-set and 3d-screen (debounced 300 ms) but never mid-playback, and never after a fallback to 2D.
- Block cursor is solid, not blinking (flash safety).
- Scene readiness: Power stays disabled until `sceneReady` (or `loadProgress` reaches 1). Safety net: 10 s after the scene chunk loads, Power is enabled anyway unless `assetFailed`.

## Assumptions
- `sceneReady` and `loadProgress` (0..1) are written by the scene as it does today.
- Arrow keys: in 3d-set with full motion the stage leaves them to the scene while the show plays. They page the diary when `ended`, and page the intro under Calm.
- The dock shows keys in this order: Power, Skip, Pause, Replay, Sound, Read full text, Previous, Next, Index, Auto-advance, with a "More" sheet on compact layouts when more than four keys.
- Skip goes to the diary index (P100), as in the spec.

## Not done or simplified
- Page titles are single height (spec: double height when rows allow).
- Mosaic rules and the page-100 frame are not drawn (sextant glyphs or rects); fastext blocks are.
- Channel-change burst (FR-23, Could) not built.
- Knob and camera behaviour live in the scene; I only provide `cameraResetNonce` and `cameraOffWatch`.

## Open questions
- None blocking. Should Home reset the view or go to the diary index when both apply? Today: reset in 3d-set while the show plays, index when `ended`. (ux-ui-designer)

## Requests for other agents
- scene-developer or tech-lead: swap the seam. In `src/scene/integration/stores.ts` replace the stub with `export { useIntroStore } from '@/state/introStore';`. Until then the scene reads a stub status, so the 3D screen does not follow the real intro. Also use `screenCanvas` and `screenVersion` (now real) in `useScreenTexture.ts`; the texture will be built around the real canvas automatically once the stub is gone, since the placeholder branch only runs when `screenCanvas` is null.
- scene-developer: the real store has no `power` side effects in the scene; `introStore.status` never passes through a collapse state, so detect the collapse from powered going false (you already do). In 3d-set while `status === 'ended'`, ignore arrow keys on `window`: the stage uses them for diary paging (Left, Right, Up, Down).
- scene-developer: your wrapper stays `position: fixed; inset: 0`; fine as is. Someone is drawing a "Reset view" button at the top-left of 3d-set (clipped, seen in a screenshot); mine is `.hud__reset` at the top-right and only shows when `cameraOffWatch` is true. Please check it is not yours.
- technical-artist: the shader may treat `screenCanvas` content as final (the rasteriser draws header, inverse fact blocks and fastext row). Keep post-effect text contrast at 4.5:1.
- qa-engineer: use `?mode=2d|3d-screen|3d-set`; `[data-fact]` lives only in `#transcript` (hidden). Run the app with `vite build --mode test` or `npm run dev` to get `window.__APP_TEST__`. Time the intro with the exported constants; measured 2.5 s warm-up (2.2 s plus 0.3 s hold) and about 44.6 s of intro.
- performance-optimiser: the intro redraws the canvas on every revealed character (about 90 per second) with one `fillText` per cell; if frame time matters, draw per run or throttle to 30 Hz. The initial chunk is 276 kB (88 kB gzip), the scene chunk 955 kB (256 kB gzip).
- architect: `index.html` now has the `<noscript>` message; `src/styles/fonts.css` is imported in `main.tsx`.
