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

---

## Round 2: ghost story (the Occupant)

`npm run lint`, `typecheck`, `test` (25 tests) and `build` pass. Checked in headless Chrome with `?mode=2d` (full story, Calm mid-story, Skip, Replay, Power-off) and 3d-set (start screen, focus ring).

### Measured duration (FR-8: 45 to 90 s)
Full motion, 2D, 17 commits and 7 agents: **89.3 s** from the first line to the diary index (warm-up of 2.5 s excluded; includes the 3 s end hold). That is inside the limit but only just. Page starts: 0, 4.8, 13.5, 22.0, 31.8, 44.3, 52.8, 70.3, 81.0 s. It grows with the facts (each new agent role, stack entry or commit-count digit adds characters) and with effect-hold extensions (up to 6 s per page). The diary page alone is 17.5 s. If the copy or the role list grows, FR-8 will be exceeded; the cheapest fix is to raise `REVEAL_CPS` or shorten `PAGE_HOLD_*` (ux-ui-designer and tech lead to decide). `estimateIntroDurationMs` in `src/state/timing.ts` gives the baseline without holds.

### What changed
- `src/state/timing.ts`: REVEAL_CPS 60, LINE_GAP_MS 450, PAGE_HOLD_BASE_MS 1200, PAGE_HOLD_PER_CHAR_MS 10, END_HOLD_MS 3000, plus haunt constants.
- `src/state/cues.ts`: parser for `src/content/intro.cues`. Unknown anchors, cues or keys, missing keys, event cues without a line `@end` anchor, `roll` away from a page end, `rewrite` over a fact segment or with digits or too many letters, and more than two `roll` cues are errors. Out-of-range values are clamped with a warning. Pure, imports with relative paths so unit tests can load it under Node.
- `src/state/hauntStore.ts`: written only by the scheduler. Field names as in design-spec 16.3.
- `src/state/hauntScheduler.ts`: fires cues as `(pageIndex, lineIndex, revealedChars)` crosses anchors (`@end` is line end plus 300 ms), once per epoch, frozen by Pause. State ramps are smoothstep, at least 2 s, and rate limited (ghost 0.08/s, creep 0.04/s, dim 0.15/s). One text effect at a time. Natural end eases to zero over 3 s, Skip over 1.2 s (event cues cancelled), Replay zeroes at once with creep over 700 ms, power-off at once. Calm (`reducedMotion`) zeroes everything and clears effects within one frame; turning Calm off does not resume until the next line anchor. Started from `App.tsx`.
- `useIntroClock`: a page hold is extended (at most 6 s) while `hauntStore.busy` is true (a queued or running text effect or a roll; a pending knob turn does not extend it).
- `introStore.endReason` (`'natural' | 'skip' | null`) tells the scheduler which ease-out to use.
- `src/ui/teletext/effects.ts`, `frame.ts`, `draw.ts`: `tremble`, `rewrite` and `bleed`. `rewrite` is applied to the displayed characters and never to a fact segment; `tremble` and `bleed` are drawn as offsets and rectangles. Effects only run after the line is fully revealed, redraw at 30 Hz while running, and an expired or absent effect gives exactly the resolved text. The DOM transcript and `data-fact` spans are untouched.
- `src/ui/components/Screen2D.tsx`, `Ghost2D.tsx`: 2D screen uses `crt2d.css`, the same effect layer (per-glyph tremble, bleed streaks, rewrite), the picture roll (translate by one wrap, sine in-out, with a 6 per cent sync band at 0.06 alpha), the edge dim (radial inset outside the safe area, `dim x 25 per cent`) and a ghost canvas. The ghost caps its luminance at 0.30 and, using the frame's text cells with one cell of dilation, reduces it to 0.07 over text.
- Start screen: content note with the exact spec wording, Calm switch (`aria-pressed`), and Power `aria-describedby` the note (`#start-note`). In 3d-set the block sits in the left column so the set and its screen stay clear.
- Dock: Calm key always present, directly after Power (`Calm: on/off`, disabled and "on (system)" when the OS asks for reduced motion). On compact layouts Power and Calm are always inline.
- Fonts: palette and `FONT_LOAD_SPECS` now wait for VT323 and Barlow Condensed before the first canvas draw (3 s timeout). Mosaics, fastext blocks, header bars, the cursor and bleed streaks are rectangles. Glyph size comes from `src/ui/teletext/font.ts`.
- Audio: the `hum` cue raises hum gain (0.04 to 0.12) and static (0.008 to 0.038) slowly along smoothstep 0.15 to 0.8 with a 0.8 s time constant; nothing sudden. Zero under Calm because the haunt store is zero.
- Round-1 requests: `crt2d.css` imported in `main.tsx`; the idle, loading and 2D card use `drawTestCard` from `@/scene/materials/testcard/drawTestCard` (dimmed with a 60 per cent black veil while loading; my own test card and noise-tile code are deleted). Stage focus ring is now its own layer (`.stage__ring`) so the canvas cannot cover it; it sits 8 px in from the viewport edge in the focus token colour with a black halo, and was checked on 3d-set.
- Tests: `tests/unit/cues.test.ts` (shipped file parses with no errors, every anchor resolves to a real page or line id of the generated intro, bad anchors, cues, keys, fact rewrites, digits and misplaced rolls all fail) and `tests/unit/textEffects.test.ts` (for every effect cue in the shipped file, at every 30 ms step and at three grid sizes: facts never change, settled frame equals the plain frame, rewrite changes exactly one row, nothing under reduced motion).

### Font measurement (VT323, 2D check in Chrome)
Measured advance of `M` is **0.400 em** (Courier New fallback: 0.600). At 960 x 720 in 2D (grid 40 x 16, cell 17.5 px, row 32.1 px) the derived size is 17.5 / 0.4 = 43.8 px, capped at row pitch / 0.9 = **35.7 px**, with 3.2 px of extra letter spacing in the DOM so columns line up with the cell grid. The canvas centres each glyph in its cell.

### hauntStore shape (for scene and technical-artist)
Units: values 0..1; `dur` and `over` in seconds; `startedAt` is `performance.now()` ms; `elapsed` is ms of unpaused time.

| Field | Type | Written by cue | Read by |
|---|---|---|---|
| `ghost`, `ghostNear` | number | `ghost`, `ghost-near` | CRT material (`uGhost`, `uGhostNear`), 2D layer |
| `creep` | number | `creep` | camera rig (3d-set only) |
| `dim` | number | `dim` | lights (3d-set), `uHauntVignette` (3d-screen, 2D) |
| `shadow` | number | `shadow` | wall decal |
| `hum` | number | `hum` | audio engine |
| `roll` | `{ active, startedAt, dur }` | `roll` | `uRoll` (phase = elapsed / dur), 2D screen |
| `knobCue` | `{ nonce, which: 'channel' \| 'volume', deg, dur } \| null` | `knob` | knob layer; new cue when `nonce` changes |
| `textEffects` | `Record<lineId, { kind, startedAt, dur, elapsed, params }>` | `tremble`, `rewrite`, `bleed` | rasteriser (canvas and 2D) |
| `busy` | boolean | derived | the clock (hold extension) |

All zero (and `textEffects` empty, `knobCue` null) whenever `displayStore.reducedMotion` is true. Read with `useHauntStore.getState()` in `useFrame`; never write.

### Decisions and assumptions
- The scheduler has its own rAF loop (idle when nothing is happening) rather than living inside the intro clock; it still keys off the clock's position and `epoch`. Decoupling lets the ease-out run after the clock has stopped.
- Parse errors are logged with `console.error` and the cue is skipped (production behaviour); the unit test is the hard check in development.
- Bleed streaks are 0.25 cell wide (spec: "1 cell wide"), centred under the glyph, so they read as streaks rather than blocks.
- The ghost layer in 2D is not rolled with the picture (only text and card are).
- 2D ghost needs `drawOccupant`; it is looked up with a lazy glob over `src/scene/materials/**/*ccupant*.ts` (export name `drawOccupant`). A figure did render in 2D during testing, so the technical-artist's file is already found. No sprite shimmer or tracking tear is added in 2D.

### Requests for other agents
- scene-developer: read `useHauntStore` as in the table; your seam to `introStore` is already working. `introStore.status` goes `ended` to `playing` on Replay (creep eases 700 ms in the store, so you need no extra smoothing beyond the 0.04/s limit).
- technical-artist: `drawOccupant` is consumed by `Ghost2D.tsx` (2D); tell me if it moves or is renamed. `crt2d.css` and `drawTestCard` are in use. The test card caption still names Bedstead in `TELETEXT_FONT`; point it at VT323 (it renders in the fallback until then).
- ux-ui-designer / tech lead: the story measures 89.3 s against a 90 s limit (see above); decide whether to retune constants or trim copy before the facts grow.
- qa-engineer: `window.__APP_TEST__` now also exposes `useHauntStore`. Frame-analyse with the ghost at maximum (diary and glass pages); the 2D ghost is capped at 0.30 and 0.07 over text by construction, the 3D one by the shader.
- architect: optional `scripts/facts/cues.ts` validator is not needed for correctness: `tests/unit/cues.test.ts` covers anchors, grammar and ranges.

---

## Integration (duration retune)

Tech lead decision: 89.3 s left no headroom, so the reveal constants are retuned. Copy and `intro.cues` are unchanged.

| Constant | Round 2 | Now |
|---|---|---|
| `REVEAL_CPS` | 60 | **100** |
| `LINE_GAP_MS` | 450 | **350** |
| `PAGE_HOLD_BASE_MS` | 1200 | **800** |
| `PAGE_HOLD_PER_CHAR_MS` | 10 | **6** |
| `END_HOLD_MS` | 3000 | 3000 |

- **Today's facts:** 70.2 s modelled, **69.05 s measured** in a real 60 fps browser run (2D, 40 x 16 grid, 22 commits, 7 agents). Before the retune the same run measured 77.3 s.
- **Projected worst case** (10 role labels, commit count 999, today's stack, a 95-character first-commit subject): **71.1 s**, against the 85 s ceiling.
- Why reveal speed and not the holds: most page holds are extended by the haunted-text effects (up to 6 s each, set by `intro.cues`), so trimming the holds saves little. 100 cps is the main lever; the holds are trimmed a little as well. The effect durations in `intro.cues` are the next lever if more headroom is needed (ux-ui-designer owns them).
- `src/state/duration.ts` (`estimateStoryDurationMs(intro, cues)`) simulates the clock: reveal, line gaps, per-screen holds (pages split into screens at 40 columns by 13 content rows), the hold extension while an event cue is queued, running or pending (capped at 6 s), and the end hold, plus a calibrated 0.5 s per screen (`MEASURED_SCREEN_OVERHEAD_MS`). It agrees with the browser run within about 1 s.
- `tests/unit/duration.test.ts`: the worst case must be 85 s or less; today's real generated facts must be at least 45 s (and at most 90 s).
- `src/ui/teletext/playlist.ts` now caches per resolved-intro object, so tests that build modified intros do not share cached screens.
- Open: reveal at 100 cps is quicker than the design-spec 6.3 table (60); ux-ui-designer should update the spec figures.

---

## QA round 1

- **BUG-2 (Calm persists):** `displayStore` reads and writes `calmSwitch` in `sessionStorage` (key `transmission-pending:calm`, every access in try/catch, so a throwing storage still leaves Calm working for the page load). The stored value and the OS preference are read when the store is created, and `main.tsx` sets `data-calm` on `<html>` before the first render, so a Calm reload never shows motion. The OS reduced-motion default still applies ("on (system setting)", cannot be turned off). Checked: on, reload, still on; off, reload, off; storage denied, no errors.
- **BUG-3 (screen cuts):** every frame has an `id` (intro screen, diary view, card, dark). When it changes, the canvas keeps a snapshot of the old screen and cross-fades it out over 250 ms (redraw at 30 Hz); the 2D screen keeps the old content on top and fades it out over 250 ms with CSS. This also applies under Calm (a gentle fade, never a cut). The clock is not affected.
- **BUG-4 (2D warm-up and collapse):** `crt-on` now opens over about 1.5 s with an opacity ramp (eased); `crt-off` dims linearly while it collapses. Total durations are unchanged (2.2 s and 450 ms). The start text now fades out over 300 ms at power-on (it was a hard cut on the 2D screen and the largest first step). Please re-run the frame analysis; the tile step should be at or under 0.05 per 100 ms.
- **BUG-5 (clock):** `useIntroClock` and the haunt scheduler use real elapsed time. Only a gap over 1 s (hidden tab or stall) counts as a pause. The duration test still passes (lint, typecheck, 51 tests, build all pass).

## QA round 2

- **BUG-7:** screen-change fades are now 500 ms (`SCREEN_FADE_MS` in `src/state/timing.ts`) and eased: smoothstep alpha on the canvas, CSS `ease-in-out` on the 2D screen, so a 0.10 to 0.12 cut puts about 0.04 in the worst 100 ms. Overlapping fades (Replay: diary, black frame, first page) each keep their own layer in 2D, and on the canvas the second fade starts from the partly faded picture. The clock timeline is untouched, so the duration test is unaffected.
- **BUG-4:** the 2D power-off collapse is 700 ms (`COLLAPSE_2D_MS`) with the same keyframes, which scales the worst step from 0.066 to about 0.042 per 100 ms and still reads as line, dot, gone. The 3D collapse and the canvas hold stay at `COLLAPSE_MS` (450 ms). Not frame-analysed here; please re-run QA's collapse and fade checks.

---

## v2 (Phase 4c): environments and the YouTube player

Built on branch `v2`. Not committed. My folders are clean for `eslint`, `tsc` and the unit tests (41 new tests, all pass). `npm run build`, whole-repo `typecheck` and `lint` currently fail only on the scene-developer's and technical-artist's in-progress files (`src/scene/environments/*`, `src/scene/materials/rooms/*`: missing `Scene.tsx` files, unused names, an undefined `OpenAirRoom`). Because the build cannot finish, the stale-`dist` facts tests fail too; they pass after a clean build. I checked the UI in dev with headless Chrome (2D phone, 2D desktop, Calm, 3D `?env=mountain-sky`), including live YouTube playback.

### Stores (for the scene-developer; all plain zustand, `src/state/`)

| Store | Fields and actions | Written by | Read by |
|---|---|---|---|
| `environmentStore` | `id: EnvironmentId` (from `?env=`, then session, else `tv-room`), `pose: 'browse' \| 'watch'`, `userFocus`, `loading: {id, progress} \| null`, `ready`; `setEnvironment(id)`, `setPose`, `togglePose`, `setFocus`, `toggleFocus`, `setLoading(p \| null)`, `setReady()` | UI (room, pose, focus); scene (`setLoading`, `setReady`) | scene, UI |
| `playerStore` | `phase`, `error`, `videoId`, `muted`, `corners`, `scenePlacement`; `reportCorners(corners, viewport?)`, `setPlacement(p)` | scene publishes the screen rectangle; `PlayerHost` and the controller write phase, error, muted | UI |
| `channelStore` | `current: LiveChannel \| null` (null = channel 0 / idle), `pending`, `started`, `digits`; `request`, `confirmNotice`, `cancelNotice`, `play`, `stop`, `step(±1)`, `typeDigit`, `commitDigits` | UI | scene (`current` null or not), UI |
| `guideStore` | `status`, `guide`, `sample`; `load()` (fetches `./guide.json`, `parseGuide`; in dev falls back to `.guide-cache/guide.local.json`, then a sample) | UI | UI |
| `settingsStore` | `colour: 'bw' \| 'colour'`, `roomSound`, `noticeAccepted` | UI | scene, audio |
| `uiStore` (extended) | `panel: 'guide' \| 'picker' \| 'credits' \| 'keys' \| 'notice' \| null`, `openPanel`, `closePanel`, `openPaste` | UI | UI |

- **What the scene must do:** call `usePlayerStore.getState().reportCorners(corners, viewport)` (projected anchor corners in CSS px, stage coordinates) whenever the projector updates. The UI runs `classifyPlacement`; focus mode, 2D and phones always win. `setPlacement` is accepted too. If the scene publishes nothing, the UI falls back to the focus layout, so the player is never lost.
- **Colour:** use `useColourActive()` / `getColourActive()` (`src/state/colourActive.ts`) or the pure `isColourActive(colour, env, hasLiveChannel)`. In the TV room it is true only with Colour on and a live channel (the warm tint); other rooms follow the option. The canvas filter is applied by the UI (`data-colour` on `.app`); never filter in a shader.
- **Room loading:** `setEnvironment` sets `loading`; the scene should keep the old room until the new one is built, then call `setReady()`. In 2D there is no scene, so the UI clears nothing itself: `loading` stays until `setReady()`; the HUD plate is aria-hidden. (A safety timeout is not added.)
- Test hook: `window.__APP_TEST__` also exposes the five new stores in dev and `--mode test` builds.

### What was built

- `PlayerHost` (`src/ui/player/`): one iframe for the visit, created by us (nocookie host, `referrerpolicy="strict-origin-when-cross-origin"`, `allow="autoplay; fullscreen; encrypted-media; picture-in-picture"`, `playsinline=1`, `mute=1`, `autoplay=1`, `origin`, `cc_load_policy=1` in Calm) and then handed to `YT.Player`. The IFrame API script is injected only on the first play, after the notice. Channel change uses `loadVideoById`; channel 0 and Stop destroy the player; the holder is positioned with plain left, top, width and height; no transform, filter, opacity, mask or blend on it or any ancestor (checked: computed styles of every ancestor are clean). 8 s `onReady` timeout gives the "blocked" card; codes 2, 5, 100, 101/150 and 153 map to in-character cards (`errors.ts`). Hidden tab, browse pose and any panel that would overlap pause and hide the player; it never plays while hidden.
- Network check (dev, real YouTube): no request to any YouTube or Google origin before Continue; afterwards `www.youtube.com`, `www.youtube-nocookie.com` and YouTube's own subresources. No `i.ytimg.com` request comes from the site's own code (YouTube's player requests its own).
- Guide (`src/ui/guide/`): teletext-style DOM panel grouped Public service, Parliament, News (Hindi, English), Regional, Business, International news, Science; LIVE, LIVE (check), OFF AIR with reasons; STATE MEDIA from the `stateMedia` field; VIA YOUTUBE EMBED for names starting "DD " or "Sansad" (the schema has no field for it, see requests); filters (Language, Genre, Country, Owner type as native selects, not chips), Find, last-refreshed time, Credits, Privacy, Third parties and Terms links, row 0 "The Occupant" in the TV room only, roving Up/Down, digits, Home/End, `/`, Escape. Disabled entries never appear (they are not in the guide). Guide unavailable shows "THE GUIDE IS NOT ON AIR" with paste still working.
- Paste-a-link (`parseLink.ts`): watch, youtu.be, /live/, /embed/ only; playlist, channel, handle and list links get the list message; `watch?v=ID&list=...` is accepted as the video (only the id is used). Nothing is stored; the field clears.
- Room picker: radiogroup, Mountain sky first and larger with "Featured", prefetch on hover and focus, schematics as inline SVG. `?env=` deep link. "Try the mountain sky" on the start screen's "Change the room" key.
- Notices: first-play notice (modal, once per visit, session-remembered after Continue, Calm line); Calm still card (site-drawn, no YouTube image, Play key, captions requested); Credits dialog; Keyboard help; footer links on the start screen, guide, More sheet and 2D page. `privacy.html` has the revised copy from design spec 6.3 with same-origin CSS (`src/ui/privacy.css`) and a same-origin script (`src/ui/privacy.ts`) that shows the DD/Sansad and NASA sentences only while those entries are enabled.
- Colour/B&W: `filter: grayscale(1)` on the `<canvas>` only, 600 ms ease (0 in Calm), focus layout adds `brightness(0.6)` on the canvas only.
- Room sound (`src/hooks/roomSound.ts`): per-room synthesised ambience, off by default, started by the viewer's action, audible only while the video is muted or nothing plays, silent in Calm, 0.8 s time constant, at most about 24 dB below full scale. The v1 channel 0 audio engine is untouched.
- Focus mode: automatic below 480 x 270 and always on phones and in 2D; toggle key and `F`; header with Exit focus; landscape-phone strip; minimum 240 px tall on phones (360 x 240 at 360 px wide). "Skip to controls" before the iframe, "Back to controls" and Stop in the info row after it.
- Keyboard map (design spec v2 section 3): digits are channel numbers except in the channel 0 diary; Up/Down change channel (or move the diary cursor); G V E C F L W A S M ?; Escape closes the topmost panel, else moves focus from a dock key to the stage; all inside the stage and dock only, never in a text field.
- Dock and HUD: Power only in the TV room; Calm always second; Guide, Room, Colour (disabled with visible reason on channel 0), video Sound, Previous and Next channel, Look around and Watch (desktop 3D), Focus, and a More sheet (Stop, Room sound, Keyboard help, footer links). On phones the bar holds Power, Calm, Guide and Room (Skip, Calm, Pause on channel 0 while the story runs).
- `src/ui/components/Room2D.tsx`: in 2D, v1's CRT screen on channel 0, otherwise a CSS skin per room (a sibling of the player, B&W unless Colour is on) with the idle card and a real footer.

### Decisions, simplifications and things I did not build
- **No `@types/youtube`:** minimal local types in `controller.ts`. No runtime dependency added.
- The iframe is created by us and attached to `YT.Player` (so the referrer policy and allow list are on the first request) rather than letting the API create it; the `host` option is therefore expressed in the embed URL.
- Stop returns to the room with the set off (start screen), not to "set on with the diary or test card" (that needs a new intro state).
- Picking a channel in the TV room powers the set off (the CRT collapses) if it was on; it does not play the 2.2 s warm-up first (design 1.2 item 4).
- Guide filters are native selects, not popup chips. The room picker closes on choosing and loading progress shows as a HUD plate, not in the row.
- `cc_load_policy=1` applies to the first video of a visit; later `loadVideoById` calls in Calm keep the player's own caption setting.
- Calm tab/key flow and the guide's "VIA YOUTUBE EMBED" use the channel name.
- Dev only: with no `guide.json`, `.guide-cache/guide.local.json` is used if the dev server can serve it, else a sample with a placeholder video id (never in the production bundle: `import.meta.env.DEV`).
- Dock changes will affect v1 e2e tests that look for Sound, Read full text or Prev/Next on phones (now in More) and the dock's extra keys; desktop v1 keys are all still present. Tests that count dock buttons will need updating.

### Requests for other agents
- **architect:** add a `viaEmbed` boolean (or `permission`) to `GuideChannel` so the VIA YOUTUBE EMBED tag does not depend on the name; `tests/unit/environment-contract.test.ts` pulls scene files into the node tsconfig and fails typecheck when scene files are mid-edit (it imports the registry).
- **scene-developer:** publish the projected corners with `reportCorners` on resize and after pose tweens; call `setLoading` and `setReady` for room loads; read `useColourActive()` for tints; the player layer is above the canvas at `--z-screen-dom` (5), so dock (15) and HUD (10) sit above it: keep props 24 px clear of the rect as specified. `.hud__idle` ("No channel. Open the guide.") is drawn by the UI at the bottom; the room should not draw its own.
- **technical-artist:** the idle test card in non-TV rooms and the paused card are scene-side; the still card, no-signal cards and 2D skins are DOM and CSS (`src/ui/ui.css`, `Room2D`), colours for the skins live there.
- **qa-engineer:** run the two-stage network test (before Continue nothing third-party; after, only `www.youtube.com` in the main frame and `www.youtube-nocookie.com` as the child frame); the overlap grid over `.player-holder`; ancestor computed styles; v1 phone dock tests.
- **tech-lead:** the build is blocked only by scene files; rebuild before `npm test` once they compile.

## v2 integration pass

- **`isLastDiaryPage()`** is exported from `src/state/introStore.ts` (non-reactive, for event handlers): true when the channel 0 diary shows its last commit page. The scene-developer replaces the placeholder in `src/scene/environments/seam.ts` with it.
- **2D skins:** `src/scene/materials/rooms/skins2d.css` is imported in `main.tsx`; `Room2D` uses `room2d room2d--<id>` on the skin element and applies the same `grayscale(1)` filter when Colour is off. The filter is on the skin only, a sibling of the player, never an ancestor of it. My own skin colours are removed.
- **Room sound** (`src/hooks/roomSound.ts`) covers all nine rooms (`AMBIENCE` table): tv-room hum at 50 Hz, mountain-sky wind (slow band-passed noise swelling at 0.07 Hz), cinema room tone, drive-in night air, open-air breeze, bedroom rain, chai-stall murmur, train rumble, space-deck drone. Off by default, only while the video is muted or nothing plays, silent in Calm, envelopes about 2.4 s.
- **Stop (design-spec v2 1.12):** in the TV room, Stop now puts the set back on what it was showing when the live channel replaced it: the diary index if the story had ended, else the idle test card (`introStore.holdCard`, so the clock does not start the story). If the set was off, it stays off. Other rooms show the idle card, and focus moves to the Guide key. The Power key and the guide's "The Occupant (the story)" row use the new `channelStore.playStory()` to leave a live channel and start the story.
- **E2E changes (v1 intent kept: every control stays reachable):**
  - `a11y.spec.ts`: the Tab-order test opens the More sheet first on compact layouts and walks 30 stops (the start screen and dock gained keys and footer links); the "Read full text" test finds the key with `dockKey` (More sheet on phones).
  - `calm.spec.ts`: the auto-advance key is found with `dockKey`.
  - The More sheet stays open for keys that open a dialog or toggle a setting, and Escape inside a dialog no longer closes the sheet, so focus returns to the opener.
  - `.dock__reason` is now only the "Tuning in" line (the colour note uses `.dock__note`), so the existing selector still matches one element.
  - Chromium a11y, mobile, power and calm all pass (59 tests). Screenshot baselines (visual spec) were not re-run: the dock gained keys, so QA should regenerate them.
- Build, typecheck and all 144 unit tests pass. `lint` reports only three errors in `src/scene/environments/EnvironmentCamera.tsx` (the scene-developer's, "cannot modify local variables after render").
