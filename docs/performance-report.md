# Performance report

Auditor: performance-optimiser. Date: 2026-11-10. Build: commit 270933d plus the changes below.

## Test setup

| Item | Value |
|---|---|
| Browser | Playwright headless Chrome (chrome-headless-shell 1248), macOS arm64 |
| GPU | **SwiftShader (software WebGL). Not a real GPU.** Absolute 3D frame rates are meaningless; only the before/after ratio and the CPU-side figures carry over |
| Server | `vite preview` of `dist/` (no compression, so "transfer" is raw bytes; gzip sizes come from the Vite report) |
| Viewports | 3d-set 1440 x 900 at DPR 1 and 2; 3d-screen 390 x 844 at DPR 2; 2d 1440 x 900 at DPR 1 |
| Throttling | None (no CPU or network throttling) |
| Method | Load, wait 6 s, count draws for 4 s (idle), press "Switch on", skip the 3.5 s warm-up, sample 12 s of the story. Draw calls and triangles counted by wrapping `drawElements` and `drawArrays`; rAF gaps for FPS; CDP `Performance.getMetrics` for main-thread time. The rasteriser and the CPU ghost were timed in a loop against the dev server. Scripts were kept in the scratchpad, not in the repo |
| Not verified | Hidden-tab behaviour (headless Chrome never reports `visibilityState = hidden`); checked by reading the code instead. Real-device FPS on a phone or laptop |

## Results

| Metric | Budget | Before | After |
|---|---|---|---|
| Initial JS (gzip) | under 350 kB JS in total (architecture 6) | 96.8 kB | 96.8 kB |
| Scene chunk (gzip) | as above | 283.7 kB | 283.9 kB (AdaptiveDpr added) |
| First-view JS total, 3d modes (gzip) | 350 kB (architecture), 500 kB (skill) | 380.5 kB | 380.8 kB |
| 2d first view JS (gzip) | | 96.8 kB | 96.8 kB (scene chunk not loaded) |
| Fonts | 150 kB | 60.5 kB | 60.5 kB |
| First-view transfer, 3d-set (raw) | under 5 MB, stretch 2 MB | 1,383 kB | 1,384 kB |
| First-view transfer, 2d (raw) | same | 375 kB | 376 kB |
| Draw calls per frame, 3d-set (median, steady) | under 100 desktop | 17 | 17 |
| Draw calls per frame, 3d-screen | under 50 mobile | 2 | 2 |
| Triangles per frame, 3d-set | under 500,000 | 11,224 | 11,224 |
| Triangles per frame, 3d-screen | under 150,000 | 4 | 4 |
| Texture memory (estimate) | under 256 / 128 MB | about 15 MB (3d-set) and 9 MB (3d-screen, 780 x 1688 canvas plus mips) | unchanged |
| Idle redraws, 4 s after load | 0 | 0 to 1 (a single frame near start-up, then none) | same |
| 2d mode FPS during the story | 60 | 7.7 (median frame 133 ms) | **31.7 to 36.6** (median frame 16.7 ms) |
| 3d-screen FPS, DPR 2, SwiftShader | 30 on a phone | 6.5 | 18.6 |
| 3d-set FPS, DPR 2, SwiftShader | 60 desktop | 1.3 | 2.2 |
| 3d-set FPS, DPR 1, SwiftShader | 60 desktop | 4.2 to 6.0 | 4.0 to 5.1 (within run-to-run noise) |
| Main-thread time in the rasteriser | | `drawFrame` 0.27 ms for a 113-cell page at 960 x 720; `buildFrame` 0.005 ms | unchanged |
| `drawGhost2D` (CPU ghost) | | 2.1 ms without mask, 7.4 to 8.2 ms with text mask | unchanged; not used by the app (see below) |

Software rendering at 2880 x 1800 explains the low 3d-set figures. The run-to-run spread on the SwiftShader numbers is about 25 per cent.

## Findings on the known items

| Item | Finding |
|---|---|
| Frame loop | Verified: `frameloop` is `always` only while warming or playing with full motion; with the picture still there were 0 draws in 4 s in all 3 modes. Calm and reduced motion stay on demand |
| Hidden tab | Everything that animates runs on `requestAnimationFrame` (R3F loop, intro clock, rasteriser, Ghost2D, haunt scheduler), and browsers stop rAF in hidden tabs. The intro clock clamps each step to 100 ms, so it pauses and does not jump on return. No code change needed. NFR-10 "cap to 30 FPS on low power" is not implemented (no reliable detection API) |
| Bundle | `leva` and `r3f-perf` are devDependencies and are not imported anywhere, so they are not in prod. drei is imported for 5 small parts only (`Environment`, `Lightformer`, `Html`, `PerspectiveCamera`, `OrthographicCamera`, `useProgress`) and tree-shakes to 15 kB raw, but `Environment` brings in three-stdlib (26 kB raw) and gainmap-js (17 kB raw), about 18 kB gzip in total. Of the scene chunk's 1,036 kB raw, three.js is 583 kB, R3F 169 kB, our code 33 kB |
| Rasteriser | One `fillText` per cell is cheap: 0.27 ms for a page with 113 cells (about 2.4 microseconds per call), so per-run drawing would save well under 1 ms. The real per-redraw cost is the GPU upload and mipmap rebuild of the 960 x 720 canvas (780 x 1688 on a phone), which per-run drawing does not change. Left as is, to keep the glyph placement identical |
| Ghost2D | `Haunt2D` (the component the app uses) is a single `drawImage` at 30 Hz: negligible. `drawGhost2D`, the 6.8 ms CPU port, is exported from `src/scene/materials/index.ts` but nothing in the app calls it, and it is tree-shaken out. No runtime cost today |
| Shader at DPR 2 | Cannot be judged on SwiftShader. Mitigated by `AdaptiveDpr` (below). The ghost and roll branches are uniform-gated, so they cost nothing when idle |

## Changes made

| # | Change | File | Effect |
|---|---|---|---|
| 1 | The 2D noise overlay now moves with `transform: translate` on an oversized pseudo-element, instead of animating `background-position`. Same tile, same steps, same 12 or 24 Hz; the element overhangs by the loop's travel and `.crt2d` already clips it. Calm and reduced motion still freeze it at the first frame | `src/scene/materials/crt2d/crt2d.css` | 2d FPS 7.7 to 31.7 to 36.6 in software raster. The animation was repainting the full screen at every step; it is now compositor-only |
| 2 | `AdaptiveDpr`: if the continuously running loop averages under 36 FPS for two 2 s windows, the render DPR steps down by 25 per cent, to a floor of 1. It never steps up, ignores gaps over 1.5 s and does nothing while on demand | `src/scene/AdaptiveDpr.tsx` (new), `src/scene/Experience.tsx` | Weak GPUs drop pixels instead of frames. 3d-set at DPR 2 on SwiftShader: 1.3 to 2.2 FPS. No effect on a device that holds 36 FPS |
| 3 | MSAA off in `3d-screen` (one flat quad). A screenshot of the 3d-screen test card at 390 x 844 DPR 2 was pixel-identical with and without it (0 of 1,316,640 pixels differ). The Canvas is keyed by mode so a switch to 3d-set gets a context with MSAA | `src/scene/Experience.tsx` | Saves the 4x multisample buffer (about 21 MB at 780 x 1688) and its resolve. With change 2, 3d-screen went from 6.5 to 18.6 FPS on SwiftShader; the two were not measured separately |
| 4 | Preload of `vt323-regular.woff2`. The first canvas draw waits for this font (up to 3 s), and it was otherwise found only after the CSS arrived | `index.html` | Removes one request round trip from the critical path. No change in bytes. Not measurable on localhost |

## Remaining issues

| Issue | Detail | Suggested fix | Owner |
|---|---|---|---|
| First-view JS is 380.8 kB gzip against the 350 kB in architecture 6 | Within the 500 kB budget in the webgl-performance skill and far inside NFR-3. The largest parts are three.js (about 150 kB gzip) and react-dom, neither of which can shrink | Replace drei in the scene with local code (about 18 kB gzip saved, so still about 362 kB). Raise the architecture budget to 400 kB, or accept it. Replacing `Environment` would change the lighting slightly, so it needs a visual check | architect, scene-developer |
| No real-device numbers | Everything above 3D is SwiftShader | Run a 2022 mid-range laptop and phone with Chrome remote debugging; check the 36 FPS threshold in `AdaptiveDpr` | qa-engineer |
| Texture upload per reveal frame | During reveal the canvas redraws at up to 60 Hz (100 cps) and the whole texture is uploaded and re-mipmapped each time. About 5 MB per upload on a phone | If a phone misses 30 FPS during the reveal, upload at most every second frame while only the reveal changes; this changes the typing cadence slightly, so it is a product call | frontend-developer, ux-ui-designer |
| `drawGhost2D` is dead code | 8 ms if it were ever used with the text mask. The dilation is O(radius) per pixel and a canvas is created per call | Delete it, or if adopted, cache the mask per `screenVersion` and use a running-sum dilation | technical-artist |
| `THREE.Clock` deprecation warning at start-up | Comes from R3F 9.8.2 inside the library, not our code | Wait for an R3F update | architect |
| CSS URL `/textures/noise-tile-64.png` | Vite rewrites it to a relative path in the build, so this works; mentioned only because the source reads as absolute | None | none |
| The Experience chunk has no `manualChunks` split | Three and R3F could be cached separately from our scene code across deploys | Optional; no size gain | devops-engineer |
