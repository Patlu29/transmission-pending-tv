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

---

# v2 pass (2026-11-11): nine rooms, ambient loop, room switching

Branch `v2`, base HEAD 83fd9f6. Same caveat as above: **SwiftShader, not a real GPU.** Absolute frame rates mean little; counts, sizes, disposal figures and before/after ratios carry over. Measured on a `vite build --mode test` copy of the production code (it only adds `window.__APP_TEST__`), served by `vite preview`, with the local guide and no YouTube. "Rendered fps" counts frames that issued draw calls; "page fps" is the rAF rate.

## Results

| Metric | Budget | Before | After |
|---|---|---|---|
| Initial JS (gzip, `main-*.js`) | v1 + 10 kB (99.4 kB in) | 98.5 kB at the start of this pass | 99.2 kB (the difference is other agents' edits; none of mine touch it) |
| First-view JS, TV room (gzip, every JS file loaded) | 350 kB (architecture), 500 kB (skill) | 405.6 kB | **387.8 kB** (drei `Environment` and its loaders gone) |
| First-view transfer, TV room (JS gzip, fonts, JSON, textures) | under 5 MB, stretch 2 MB | 471 kB (1,492 kB raw) | **454 kB** (1,440 kB raw) |
| First view with Mountain sky selected (gzip) | | 476 kB | 458 kB |
| Each room chunk (gzip, `Scene-*.js`) | 60 kB | 1.7 to 4.3 kB (largest 4.3 kB), shared room parts sit in the common chunks | unchanged |
| Draw calls per frame, rooms (median) | under 100 desktop, 50 mobile | cinema 8, drive-in 14, open-air 10, bedroom 10, chai 19, train 8, space deck 7, mountain sky 24 (14 on phone) | unchanged |
| Triangles per frame | under 500k / 150k | 312 to 3,550 (mountain sky 2,894; 2,438 on phone) | unchanged |
| Idle draws, Calm, watch pose | 0 | not tested | **0** (mountain sky, cinema); TV room channel 0 also 0 |
| Idle draws, full motion in a room | rooms animate | continuous 60 Hz loop | 30 Hz ticker, about 118 frames in 4 s (cinema) |
| Rendered fps, 1440x900 DPR 1, ambient | 60 desktop | 17 (mountain sky) to 36 (cinema), GPU-bound in software | capped at 30 by design where the renderer can keep up (cinema 29.8); mountain sky 17 to 19.5 (software-bound) |
| Page fps (rAF) during the same runs | 60 | 17 to 36, because the software renderer starved the page | 56 to 60 for 6 rooms; mountain sky 34 to 39 |
| 390x844 DPR 2, `quality="low"`, software | 30 mobile | 53 to 60 (adaptive DPR stepped 780 to 585 px on 3 rooms) | not re-run; code path unchanged except the ticker |
| 1440x900 DPR 2 true (adaptive step suppressed by sampling early), software | 60 | 5 to 9.5 fps in every room (mountain sky 6, space deck 5, cinema 9.5) | `AdaptiveDpr` still steps down under the ticker: canvas 2880x1800 to 1440x900 within about 12 s |
| WebGL objects after 3 laps through all nine rooms, then TV room | flat | **leak:** +36 framebuffers, +1 texture, +1 program per TV room re-entry (fb 51 to 87 to 123 to 159) | **flat** (fb 39, tex 14, programs 11 on every re-entry; rooms constant at fb 3, tex 8 for cinema) |
| JS heap after 3 laps | flat | 9.4 to 12.2 MB (+0.3 to 0.5 MB per lap, partly the leak) | 9.1 to 11.8 MB (+0.2 to 0.6 per lap, settling) |
| Room switch time | | 300 ms first visit (chunk plus the deferred value), 2 to 14 ms on a revisit, TV room about 1.0 to 1.1 s | unchanged (the TV room time is shader compile, 3.2 s in the dev profile, JS texture building is under 30 ms) |
| CSS `filter: grayscale(1)` on the canvas | | cinema 41.7 fps without, 26.7 with (36 per cent); mountain sky 20 to 16.3 (19 per cent) | not changed (see remaining issues) |
| External requests | 0 | 0 | 0 |

## Findings on your checklist

- **Idle and Calm:** the TV room (channel 0) idles at 0 draws. Rooms animate by design, so they are never idle in full motion. Under Calm (or reduced motion) the frame loop goes to demand and nothing draws: 0 draws in 4 s. Rooms do need continuous frames in full motion (birds, stars, cloud drift, spill), but nothing there moves faster than 1.5 Hz or 7 px/s.
- **Hidden tab:** the ticker, the R3F loop, the intro clock and the rasteriser all run on `requestAnimationFrame`, which browsers stop in hidden tabs. Headless Chrome cannot report `hidden`, so this is by code reading only, as in v1.
- **Disposal:** rooms are clean (buffers, VAOs, programs, textures, framebuffers return to the same values on every revisit across three laps). The only leak was the TV room's environment map (below).
- **Cloud sea at DPR 2:** the rows cost about 3 ms each at 1440x900 in software (each draw is about 5 ms with the sync overhead of my probe); the sky dome is the single largest draw (about 20 ms net in software). Real GPU cost still needs a phone. `quality="low"` plus adaptive DPR keeps the phone path at 53 to 60 fps in software.
- **CSS grayscale filter:** costs 19 to 36 per cent of the rendered frame rate in software compositing. On a real GPU it is one full-screen pass, but it runs on every canvas frame in B&W (the default) and on channel 0.

## Changes made (v2)

| # | Change | Files | Effect |
|---|---|---|---|
| 1 | **Environment leak fixed, `Environment` dropped.** three never frees the PMREM target it builds from a render-target cube, so drei's `Environment` leaked 36 framebuffers and a texture on each TV room entry. `GreyEnvironment` now builds the same four panels into a scene and calls `PMREMGenerator.fromScene` itself, and disposes the target and the panels on unmount. The 1440x900 TV room screenshot differs from before by at most 2 levels of 255 (1.6 per cent of pixels) | `src/scene/materials/GreyEnvironment.tsx` | Leak gone. First-view JS 405.6 to 387.8 kB gzip (-17.8), transfer -17 kB. Throwaway: the TV room's materials are being replaced by the 2050 theme, but the leak lesson and the PMREM route carry over to any new environment |
| 2 | **30 Hz ambient ticker.** Rooms and live channels used `frameloop="always"` at 60 Hz. Now only warm-up and the full-motion intro are `always`; ambient motion runs on a demand loop that calls `invalidate()` every 30 ms on `requestAnimationFrame`. Camera tweens still request their own frames. Off under Calm | `src/scene/AmbientTicker.tsx` (new), `src/scene/Experience.tsx` | Halves GPU and battery cost of every room; 56 to 60 page fps instead of 17 to 36 in software. Calm idle stays 0 |
| 3 | `AdaptiveDpr` takes `ambient`, samples ambient frames against a 24 fps floor, and sets `<html data-dpr-stepped="true">` once it steps down | `src/scene/AdaptiveDpr.tsx` | The adaptive step still works under the ticker (verified: 2880x1800 to 1440x900). The attribute gives the UI the "low-end path" hook that ADR 0012 section 4.3 asks for |
| 4 | Puff shader: an exact early-out where the density is always 0 (beyond 1.405 in puff space) and the quad trimmed to the same limit | `src/scene/materials/rooms/roomParts.tsx` | Puff draws about 9 per cent cheaper in the sync probe. Screenshots of all nine rooms in Calm: 8 identical, mountain sky 3,110 of 1.3 million pixels off by 1 level. Real GPU gain unmeasured |

Tried and dropped: skipping the sky dome's aurora noise outside the side columns. Pixel-identical on paper, but no measurable change, so it was reverted to keep the shader as the artist wrote it.

## Over budget or open

| Issue | Detail | Suggested fix | Owner |
|---|---|---|---|
| First-view JS 387.8 kB gzip vs 350 kB (architecture) | Under the 500 kB skill budget. Three (about 150 kB) and react-dom do not shrink. Initial JS 99.2 kB is inside v1 + 10 kB | Accept, or raise architecture 6 to 400 kB | architect |
| Grayscale CSS filter on every B&W canvas frame | 19 to 36 per cent in software compositing | Measure on a real phone. If it costs too much, bake the greyscale into room palettes for B&W (design change) | ux-ui-designer, technical-artist |
| Mountain sky and space deck are the heaviest rooms | 17 and 23 fps in software at DPR 1, 6 and 5 at true DPR 2. Cloud rows (6 on desktop) and the sky dome | Measure on a real phone; `quality="low"` and adaptive DPR are the safety net | technical-artist |
| TV room re-entry takes about 1 s | Shader compile (14 programs), not JS | Retheme replaces it; use `renderer.compileAsync` for the holo material | scene-developer |
| Real-device numbers | none here | Real phone and laptop with Chrome remote debugging | qa-engineer |
| Texture upload per reveal frame (from v1) | unchanged | as in v1 | frontend-developer |

## Guidance for the 2050 retheme (ADR 0012 section 4, measured in the next pass)

Not measured yet; what I expect and will test:
- **Frosted glass cost.** `backdrop-filter` re-reads and blurs the area behind each element every time the canvas changes. Our canvas now changes at 30 Hz in rooms (ticker) and 60 Hz during the TV intro, so live blur will re-run at those rates. I will measure per panel area and blur radius, with and without the canvas animating, in Chromium here and on a phone, and check Firefox and Safari by hand.
- **Rules to keep:** live blur only on small chrome (dock, info row, HUD tags) at 12 px or less with no nesting; large panels tinted with no live blur, or blur only while the canvas is on demand (Calm, idle); `data-glass="solid"` as the low-end path. The canvas now sets `<html data-dprstepped>` (`dataset.dprStepped`), so CSS can switch to solid panels with `html[data-dpr-stepped='true']`.
- **Overlap:** nothing frosted, glowing or shadowed may overlap the player rect or its 24 px halo; the player's ancestors keep no `backdrop-filter`.
- **Volumetrics:** additive cone meshes with depth write off, no `EffectComposer`; I will check overdraw on mountain-sky-class scenes.
