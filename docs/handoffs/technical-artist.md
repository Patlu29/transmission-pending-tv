# Handoff: technical-artist

## Summary
Fonts are downloaded, subset and licensed (round 1 used Bedstead; round 2 replaced it with VT323, see Round 2). The CRT screen shader is done, with a drop-in React component, a plain material factory and a 2D CSS equivalent. The original test card exists as live drawing code and as a baked greyscale PNG. The TV body is built in code (9,736 triangles, 0 bytes to download, nodes `screen`, `knob-power`, `knob-channel`, `knob-volume`). `npm run build` passes. Everything was checked in headless Google Chrome (ANGLE and SwiftShader); Safari and Firefox were not tested.

## Assets (size, triangles, textures)

| Asset | Path | Size | Triangles | Notes |
|---|---|---|---|---|
| ~~Bedstead~~ | removed in round 2 | n/a | n/a | replaced by `vt323-regular.woff2` (16.0 kB, advance 0.4 em) |
| Barlow Condensed 400 | `public/fonts/barlow-condensed-400.woff2` | 21.6 kB | n/a | Latin-1, punctuation, arrows |
| Barlow Condensed 600 | `public/fonts/barlow-condensed-600.woff2` | 22.9 kB | n/a | same |
| Font licences | `public/fonts/licences/` | 13 kB text | n/a | CC0 `COPYING`, the `bedstead.c` notice, OFL 1.1. Table in `public/fonts/LICENCES.md` |
| Test card, baked | `public/textures/test-card-960x720.png` | 33.1 kB | n/a | 8-bit greyscale, 960 x 720. Source: `drawTestCard` |
| Noise tile | `public/textures/noise-tile-64.png` | 4.2 kB | n/a | 64 x 64 grey, for the 2D static layer (shown at 128 px, so 2 px grain) |
| TV body | `src/scene/materials/tv/` | 0 bytes (code) | 9,736 total | cabinet 1,020, bezel 1,868, trim 2,144, plate 828, screen glass 2,400, three knobs 492 each |
| TV textures | built at run time | 0 bytes | n/a | walnut grain 512 x 512, control plate 377 x 957 (labels, ticks, grille) |
| Environment | `GreyEnvironment` (code) | 0 bytes | n/a | 64 px cube from four white Lightformers. `public/env/` holds only a LICENCES.md |

Fonts total 50.7 kB, against 150 kB. No GLB: nothing to compress, so there is no Draco, Meshopt or KTX2 step, and the 1.5 MB model budget is met with 0 bytes. TV materials: 5 (wood, bezel, trim, knob, plate), plus the screen material. Draw calls for the set: 8.

### Font licence verdict (read from the downloaded text)
- Bedstead (REMOVED in round 2, kept here for the record): the zip's `COPYING` is CC0 1.0, and the header of `bedstead.c` says the four authors dedicate the generator and "the embodied typeface" to the public domain. **Caveat the owner should accept or reject:** the same header says many glyph shapes come from the Mullard SAA5050 typeface, whose copyright "will still be owned by Mullard's corporate successors", and relies on section 55 of the UK Copyright, Designs and Patents Act 1988. The author's web page adds "I'm not a lawyer, though, so this may well be wrong." I used Bedstead because the licence text is permissive and the font is widely redistributed, and recorded the caveat in `public/fonts/LICENCES.md`. VT323 (OFL 1.1) is the documented swap.
- Barlow Condensed: SIL OFL 1.1, no Reserved Font Name, licence text shipped.

## Components, props, uniforms, paths

All exports are re-exported from `src/scene/materials/index.ts` (import from `@/scene/materials`).

### `CrtScreenMaterial` (React component, `src/scene/materials/CrtScreenMaterial.tsx`)
Drop-in child of the `screen` mesh. It owns the warm-up and collapse timers and the clock uniforms.

```tsx
<mesh name="screen" geometry={...}>
  <CrtScreenMaterial texture={canvasTexture} power={isOn} calm={reduced} />
</mesh>
```

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `texture` | `Texture \| null` | required | The teletext `CanvasTexture`. It is prepared on mount (sRGB, mipmaps, clamp) |
| `power` | `boolean` | required | false to true plays the 2.2 s warm-up, true to false plays the 0.55 s collapse |
| `calm` | `boolean` | false | Calm or reduced motion: no warm-up, instant cut on power-off, frozen noise, no bar, no jitter, no glow flicker |
| `warmupSeconds` | number | 2.2 | Leave at 2.2 (the shader's key times assume it) |
| `collapseSeconds` | number | 0.55 | Collapse length |
| `warmupProgress`, `collapseProgress` | number 0..1 | unset | Controlled progress; replaces the internal timer |
| `brightness` | 0..1 | 1 | Picture gain. 0.4 for the dim loading card |
| `bar` | 0..1 | 1 | Rolling bar strength. Set 0 when the diary index shows |
| `burst` | 0..1 | 0 | Channel-change burst (mean rise at most 0.10 at 1) |
| `noiseHz` | number | 12 | 24 for idle and warm-up, 12 behind text. Clamped to 24 |
| `curvature` | number | 0.06 | 0.04 on the domed set glass, 0.08 on a flat quad |
| `aspect` | number | 4/3 | Glass width over height |
| `uniforms` | partial uniforms | none | Any other uniform, set at creation |
| `onWarmupEnd`, `onCollapseEnd` | callback | none | Fired once per transition |
| `controlRef` | ref | none | `{ phase: 'off' \| 'warming' \| 'on' \| 'collapsing', material }` for tests and debug |

The scene must render frames while it animates (frameloop `always`, or `invalidate()`).

### Plain material route (what the scene-developer already uses)
`createCrtScreenMaterial(texture | null, overrides?)` in `src/scene/shaders/crt/createCrtMaterial.ts` returns a typed `ShaderMaterial` (`CrtShaderMaterial`). Also exported: `prepareScreenTexture(tex)`, `setCrtTexture(material, tex)`, `crtUniforms(material)`, `CRT_DEFAULTS`, `WARMUP_SECONDS` (2.2), `COLLAPSE_SECONDS` (0.55), `estimateCrtMeanLuminance({ warmup, collapse, pictureMean, brightness?, staticLevel? })` (model of the screen's mean luminance for the room light; within about 6 per cent above 0.03 against rendered frames; the shipped card's `pictureMean` is 0.208). Mutate `material.uniforms.X.value` each frame.

### Uniforms (GLSL: `src/scene/shaders/crt/crt.frag.glsl`, `crt.vert.glsl`)

| Uniform | Default | Range and meaning |
|---|---|---|
| `uMap` | null | Teletext canvas texture, sRGB, mipmapped |
| `uTime` | 0 | Seconds. Noise frame, bar position and jitter derive from it |
| `uWarmup` | 0 | 0..1 across 2.2 s. 0 = set off (black with faint reflection), 1 = settled |
| `uCollapse` | 0 | 0..1 across the collapse. Squash to a line (0 to 0.55), line to dot (0.55 to 0.8), dot fades (0.8 to 1). Keep `uWarmup` at 1 while it runs, then set `uWarmup` 0 and `uCollapse` 0 |
| `uCalm` | 0 | 1 = frozen noise, no bar, no jitter, no glow flicker |
| `uPixelRatio` | 1 | Renderer pixel ratio. Used for CSS-px sizes (grain, line, dot, jitter) |
| `uAspect` | 4/3 | Glass aspect, for corner radius |
| `uBrightness` | 1 | 0..1 picture gain |
| `uBar` | 1 | 0..1 rolling bar |
| `uBurst` | 0 | 0..1 channel-change burst |
| `uNoiseHz` | 12 | Noise frames per second, clamped to 24 in the shader |
| `uNoiseAmp` | 0.01 | Peak of the zero-mean grain, linear luminance |
| `uGrainPx` | 2.5 | Grain cell in CSS px, floored at 2 in the shader |
| `uCurvature` | 0.06 | Barrel strength (0 = flat) |
| `uScanlines` | 240 | Scanline count over the glass height; fades out when pitch is under about 2 device px |
| `uScanStrength` | 0.18 | Darkest scanline reduction |
| `uVignette` | 0.45 | Corner darkening |
| `uGlow` | 0.12 | Phosphor glow gain (capped at +0.025 luminance on the dark ground) |
| `uGlowLod` | 2.5 | Mip level used as the blur |
| `uCorner` | 0.06 | Corner radius as a fraction of glass width |
| `uStaticLevel` | 0.5 | Warm-up static luminance gain (mean static = level x 0.5 x opacity) |
| `uReflection` | 0.025 | Faint window shapes on the dark glass while off (at most 0.05) |
| `uJitter` | 1 | 1 enables the 0.5 CSS px jitter in full motion |

### Behaviour measured on rendered frames (960 x 720, DPR 1)
- Greyscale: R, G and B identical in every frame tested (maximum channel difference 0, over settled card, text page, 12 warm-up frames, 9 collapse frames, off and calm). The shader outputs `vec3(l)` and reads the texture as luminance, so a coloured canvas still comes out grey. Use `NoToneMapping` (the scene already does) or `NeutralToneMapping`.
- Warm-up mean luminance, seconds to mean: 1.1 s 0.001, 1.25 s 0.036, 1.5 s 0.142, 1.7 s 0.155, 1.9 s 0.181, 2.05 s 0.199, 2.2 s 0.208 (the card's own mean). Rises monotonically from 1.0 s to the end with no overshoot. Line and dot area stay under 0.6 per cent of the screen (limit 1 per cent). Note the design spec's "about 0.30" for the card is 0.208 in linear luminance; the static ramps to 0.14 to match.
- Collapse: mean falls monotonically 0.208, 0.204, 0.180, 0.124, then about 0.003 for the line and under 0.0005 for the dot. The only rise is the line widening into a dot (0.0027 to 0.0041, under 0.5 per cent of the screen). Nothing brighter than 0.9 and no region over 0.6 per cent of the screen is that bright, so it is flash-safe. Noise, static and bar fade out in the first 0.275 s.
- Noise: new frame at most 24 Hz (12 by default), cell 2.5 CSS px (2 or 3 device px at DPR 1, 5 at DPR 2), spatially zero-mean amplitude of plus or minus 0.01 linear. Calm: two renders at different `uTime` are pixel-identical (0 differing pixels).
- Rolling bar: 18 per cent of the height, +0.025 luminance (limit 0.04), one pass in 6 s, starts at the end of warm-up, off in calm.
- Contrast after all effects (test page with the rasteriser's colours, worst of 8 time points, bar crossing the text; "strict" = 5th percentile of text luminance against the 95th percentile of the background, "mean" = averages; measured with curvature 0 so pixels map one to one): body text `#cfcfcf` on black 7.15:1 strict, 10.5:1 mean; corner text 5.7:1 strict, 10.9:1 mean; **header bar white on `--tt-2` 4.51:1 strict, 5.3:1 mean**. All at or above 4.5:1. The header is the tightest, so the header background should not get lighter than `--tt-2`.
- The 3D scanline strength (0.18) is lower than the 2D token `--crt-scanline-opacity` (0.28) on purpose, to hold the header contrast. The 2D overlay uses the token; text contrast there is unmeasured.
- Safe area: curvature maps the middle of each edge to the edge, and the corners lose about 7 per cent. The grid's `--tt-safe-area` of 0.92 is enough for 0.06 curvature or less.

### `TvBody` (React component, `src/scene/materials/tv/TvBody.tsx`)
Procedural wood-cabinet portable. Units: cabinet width = 1.0 (so scale the group to taste). Origin is the screen centre, +z faces the viewer, glass edge at z = 0, dome peak at z = +0.035, cabinet back at z = -0.72, shelf surface at y = -0.48 (`TV_LAYOUT.shelfY`).

```tsx
<GreyEnvironment />
<TvBody powerAngle={a} nodesRef={nodes} powerHandlers={{ onClick, onPointerOver, onPointerOut }}>
  <primitive object={crtMaterial} attach="material" />   {/* or <CrtScreenMaterial .../> */}
</TvBody>
```

| Prop | Type | Meaning |
|---|---|---|
| `children` | ReactNode | The screen material. Attached to the `screen` mesh. Default is black basic material |
| `powerAngle`, `channelAngle`, `volumeAngle` | radians | Knob rotation about the local z axis. Scene animates them |
| `powerHandlers`, `channelHandlers`, `volumeHandlers` | `{ onClick, onPointerOver, onPointerOut, onPointerDown }` | Picking; the knob mesh itself is the event target |
| `nodesRef` | `RefObject<TvNodes \| null>` | Filled after mount with `screen`, `knob-power`, `knob-channel`, `knob-volume` |
| other props | `ThreeElements['group']` | position, rotation, scale and so on, on the root group (named `tv-body`) |

Nodes (all meshes, direct children of `tv-body`): `cabinet`, `bezel`, `trim`, `control-plate`, `screen`, `knob-channel`, `knob-volume`, `knob-power`. `screen` UVs run 0..1 over the 4:3 glass (u right, v up, so a default `CanvasTexture` is the right way up). Each knob's origin is on its axis, pointer line up at angle 0. Greyscale materials only; metals need an environment, so mount `GreyEnvironment`. `TV_LAYOUT` and `TV_GREYS` export every dimension and the greys.

Look: the wood reads under a directional key of intensity about 3 plus `GreyEnvironment` at 0.6 in my test scene; at design-spec "12 per cent" it is nearly black, which matches the mood but check the grain under the real lights.

### `GreyEnvironment` (`src/scene/materials/GreyEnvironment.tsx`)
Props: `intensity` (0.35), `resolution` (64). No file, no background.

### Test card (`src/scene/materials/testcard/drawTestCard.ts`)
`drawTestCard(ctx, width, height, { loadingPercent?, subCaption? })` and `createTestCardCanvas(w, h, opts)`. Section 11 elements 1 to 13 are all implemented. 4:3 canvases show the exact 1000 x 750 composition; other landscape ratios keep it centred with the field and grid extended; portrait (aspect under 1.15) uses the section 11 portrait layout (circle at 0.7 of the short side, wedges in horizontal bands, strips full width, caption at least 16 px tall). `loadingPercent` set means the caption plate reads `TUNING... NN%`. Await `document.fonts.load('600 32px "Barlow Condensed"')` and `document.fonts.load('24px VT323')` first. `TT` exports the eight greys. Mean linear luminance 0.208.

### 2D overlay (`src/scene/materials/crt2d/crt2d.css`)
`.crt2d` on the screen element: scanlines (`::before`, token pitch and opacity), vignette (the token's inset shadow), static (`::after`, `public/textures/noise-tile-64.png` at 128 px, 12 Hz stepped, 24 Hz with `.crt2d--idle`, frozen with `data-calm="true"` or `prefers-reduced-motion`). `.crt2d__glow` on the text adds the glow. No curvature warp. Split decided: the shader owns 3D, this CSS owns 2D mode, frontend imports it.

## Files changed
- `public/fonts/bedstead-regular.woff2`, `barlow-condensed-400.woff2`, `barlow-condensed-600.woff2`, `licences/*`, `LICENCES.md`: new fonts and licences, table updated
- `public/textures/test-card-960x720.png`, `noise-tile-64.png`, `LICENCES.md`: new
- `public/models/LICENCES.md`, `public/env/LICENCES.md`: new (no files by design)
- `src/scene/shaders/crt/crt.vert.glsl`, `crt.frag.glsl`, `createCrtMaterial.ts`, `index.ts`: shader and typed factory
- `src/scene/materials/CrtScreenMaterial.tsx`, `GreyEnvironment.tsx`, `index.ts`: components
- `src/scene/materials/testcard/drawTestCard.ts`: test card
- `src/scene/materials/crt2d/crt2d.css`: 2D overlay
- `src/scene/materials/tv/{layout,tvGeometry,tvTextures,tvMaterials}.ts`, `TvBody.tsx`: TV body
- `docs/handoffs/technical-artist.md`: this note

I did not touch `assets/source/` (it holds only `.gitkeep`) or any file outside my folders. The scene-developer's files already import `createCrtScreenMaterial` and `prepareScreenTexture` and work unchanged.

## Decisions
- No GLB: procedural geometry is smaller (0 bytes), exact on node names and pivot, and avoids a modelling tool I do not have. Cost: the `TvBody` code lives in the scene chunk, and the set is a stylised build rather than sculpted.
- The TV body and its textures live under `src/scene/materials/tv/` because that is the only `src/scene` folder I own besides shaders.
- Grain is in screen space (`gl_FragCoord`), so it stays at least 2 CSS px at any viewing angle and any DPR, and does not stick to the 3D surface.
- Noise is additive and zero-mean; on black it is clamped, which lifts the ground by about 0.0025 in a constant way. Frame-to-frame area means are stable, which is the flash criterion.
- Collapse is a cut under calm mode (no animation, as for warm-up). A single step to black is not a flash.
- Dark-glass reflection (two soft window panes, luminance 0.025) is drawn by the shader, not a second glass mesh, and fades out as soon as the picture starts, so it never costs text contrast.
- Jitter is one band of rows, 0.5 CSS px, 80 ms, every 2.5 s; "text lines only" is approximated by a thin band because the shader cannot see where text is.
- Anisotropy is 1 on the procedural textures; raise it to 4 if the grain looks soft at grazing angles on a real GPU.

## Assumptions
- The teletext canvas is 960 x 720 on the set and any size in `3d-screen`; the shader needs no particular size.
- The scene drives `uWarmup`, `uCollapse` and `uTime` (as `ScreenDriver` already does) or uses `CrtScreenMaterial`, not both on one material.
- Flash rules are met by the shader on its own. The page content (what the rasteriser draws and when it changes) must also respect section 7.

## Open questions
- (Resolved in round 2: VT323 chosen.)
- Section 10.2 asks for a room wall paper pattern and a dust texture. I did not make them (see Not done); is a flat dark room enough? (ux-ui-designer)

## Not done
- Room wall texture (faint paper pattern, under 8 per cent contrast) and the dust-fall texture. The scene-developer's `Room.tsx` keeps flat planes. I can add a procedural pair if wanted.
- Glass reflection beyond the shader's two panes, and contact shadows (scene-developer owns lights).
- Leva tuning panel for the shader (dev only, not required).
- Safari and Firefox shader checks, and a real-GPU pass. Tested in Chrome on SwiftShader only.
- Contrast measurement of the 2D CSS overlay.

## Requests for other agents
- scene-developer: replace the placeholder `objects/TvSet.tsx` with `TvBody` (`import { TvBody, GreyEnvironment } from '@/scene/materials'`). Pass your existing CRT material as the child (`<primitive object={material} attach="material" />`), so `ScreenSurface`'s own mesh is not needed in `3d-set`; keep it for `3d-screen`. Use `nodesRef` or the node names for `KnobLayer` picking. The set's screen mesh already has the dome, so keep `uCurvature` 0.04 and `uAspect` 4/3 there. Put the shelf top at `TV_LAYOUT.shelfY`. Mount `<GreyEnvironment />` (intensity 0.3 to 0.6) so metals and the clear coat read. Also drive `uNoiseHz` (24 with no text, 12 behind text), `uBar` (0 on the diary index), `uBrightness` (0.4 while `loading`), `uWarmup` 1 for the loading card and 0 for set-off, as you asked; the shader owns the faint reflection at `uWarmup` 0. You can use `estimateCrtMeanLuminance` for the room light (pass `pictureMean` 0.208 for the test card).
- frontend-developer: import `src/styles/fonts.css` (the files now exist) and `@/scene/materials/crt2d/crt2d.css`. Await `document.fonts.load('16px VT323')` and `document.fonts.load('600 16px "Barlow Condensed"')` before the first canvas draw. Use `drawTestCard` for the idle and loading picture (so the card is identical in 3D and any canvas use), or the baked `test-card-960x720.png` as the 2D mode image. In 2D mode use `class="crt2d crt2d--text"` (or `crt2d--idle` behind the card) with `data-calm` mirrored from `displayStore.motion`. Keep the rasteriser's text colours as in design-spec 5.3; the contrast numbers above assume them.
- ux-ui-designer: `src/styles/fonts.css` still says "DO NOT IMPORT until the WOFF2 files exist", and `docs/design-spec.md` section 14 still says the files could not be downloaded. Please update both. Keep `--screen-header-bg` at `--tt-2` or darker (the white header text measures 4.51:1 worst case after effects). The 3D scanline darkness is 0.18, not the 2D token 0.28.
- qa-engineer: shader checks that passed here and are worth repeating in the real app: R, G, B within 2 levels in all modes; warm-up mean luminance monotonic from 1.0 s; collapse never rises by more than 0.002; calm frames identical at different times; grain cell of at least 2 CSS px; text contrast on the three sample rows above. Test the collapse at a 4x CPU slowdown, as the 0.1 s frame-delta clamp in `CrtScreenMaterial` stretches it in time without changing its shape.
- tech-lead: commit `public/fonts/*.woff2`, `public/fonts/licences/`, `public/textures/*.png` as binary files; none are generated at build time.


---

# Round 2: ghost story (the Occupant)

Build passes (`npm run build`) and `npm run lint` passes. Measurements: headless Google Chrome (ANGLE and SwiftShader), 960 x 720, DPR 1. Safari, Firefox and a real GPU were not tested.

## 1. Font: VT323 replaces Bedstead
- Added `public/fonts/vt323-regular.woff2` (16.0 kB, 200 glyphs: Basic Latin, Latin-1, punctuation, arrows, `kern` only) from https://github.com/phoikoi/VT323, licence `public/fonts/licences/OFL-VT323.txt` (SIL OFL 1.1, "Copyright 2011, The VT323 Project Authors", no Reserved Font Name).
- Removed `bedstead-regular.woff2` and `licences/Bedstead-*`. `public/fonts/LICENCES.md` rewritten. Fonts total 60.5 kB of 150 kB.
- **Measured metrics for the frontend:** units per em 1000, advance of every glyph tested (A, M, i, space, 0) is **400, so 0.4 em per cell**; hhea ascent 800, descent 200 (line box 1.0 em). `--tt-cell-aspect` 0.6 no longer matches; use `measureText`. VT323 has no sextant block glyphs and no U+2580-259F in the subset, so draw all mosaics, rules, fastext blocks and bleed streaks as rectangles.
- The test card caption and the baked `public/textures/test-card-960x720.png` now use VT323 (sub-caption drawn at 30 units because VT323 is small for its em). `public/textures/LICENCES.md` updated.

## 2. Shader: new uniforms (all in `CrtUniformValues`, defaults in `CRT_DEFAULTS`)

| Uniform | Default | Meaning |
|---|---|---|
| `uGhost` | 0 | 0..1 how much of the Occupant has emerged from the static (`hauntStore.ghost`) |
| `uGhostNear` | 0 | 0..1 closeness (`hauntStore.ghostNear`): size, position, mouth slit and glass fog from 0.8 |
| `uGhostSeed` | 0 | Any number; changes the strip tracking pattern |
| `uGhostMap` | shared sprite | Occupant sprite texture. **Set automatically** by `createCrtScreenMaterial` (`getOccupantTexture()`), so existing code needs no change except copying the other uniforms |
| `uGhostTextCap` | 0.07 | Ghost luminance ceiling over glyph cells and a one-cell dilation |
| `uGhostPeak` | 0.30 | Ghost luminance ceiling on blank screen |
| `uRoll` | 0 | 0 = no roll; else phase 0..1 through one roll. Use `rollPhase(hauntStore.roll, nowSeconds)` |
| `uHauntVignette` | 0 | 0..0.25 extra edge dim, only outside the 0.92 safe area (box metric), so it cannot touch text. In 3d-screen pass `hauntStore.dim * 0.25` |

Calm: the shader multiplies the ghost, roll and haunt vignette by "not calm" (`uCalm`), so setting `uCalm` 1 zeroes all of it even if the host forgets to; the `CrtScreenMaterial` component also zeroes the props.

### Behaviour and measurements
- **Emergence:** `vis = smoothstep(n - 0.12, n + 0.12, ghost x 1.2 x tone weight)`, with `n` a mix of 0.05 Hz drifting noise and the live grain, so the figure truly forms out of the static (at 0.12 only a few face pixels appear; at 0.45 a dotted head and collar; at 0.8 filled).
- **Sprite and placement:** as design-spec 16.5: egg head 1.4 times taller than wide tilted 5 degrees, hollow eyes (left larger and lower), long neck, sloping shoulders, wide pointed lapels, body dissolving below the chest, mis-tracked strips of 3 CSS px with slow correlated noise (plus or minus 1.2 per cent of the width) and a 3 per cent tear at the throat, head 0.26 to 0.70 of the glass height, x drift plus or minus 6 per cent with a 40 s period, y 0.62 to 0.45, mouth slit from near 0.8, fog under 0.01. Original design.
- **Ceilings (ghost at 1, near 1, text page, Chrome):** mean contribution to the screen +0.018 (limit 0.05); +0.015 at (0.8, 0.55); +0.005 at (0.45, 0.2). Per-frame luminance changes only come from the 0.2 Hz strip noise and the schedule's envelopes, so the change per 100 ms is far under 0.02.
- **Contrast with the ghost at maximum** (same method as round 1, but background pixels are limited to within 12 px of a glyph, the one-cell dilation the cap protects; worst of 8 time points; the bar crosses the text): body text 5.05:1 strict and 7.96:1 mean (before the ghost: 6.5:1 and 9.7:1); corner text 6.99:1 strict; header bar 4.55:1 strict (unchanged, header stays on `--tt-2` or darker). All at or above 4.5:1. To get there the effective text cap is `uGhostTextCap x 0.5` (`TEXT_CAP_SCALE` in the GLSL and `GHOST_TEXT_CAP_SCALE` in TS), because glow, grain and scanlines add on top of the cap; the text mask is a blurred mip (lod 3.5) of the teletext canvas, so it follows whatever the rasteriser draws.
- **Roll:** `rollOffset(p)` (TS and GLSL identical): cosine sweep over the first 5/6 (one full wrap), then a damped settle (overshoot under 2 per cent). Peak speed is 0.785 screen heights per second at `dur` 2.4 s, so **the roll must last at least 2.4 s** (`ROLL_MIN_SECONDS`; `rollPhase` clamps `dur` up to it, so the 1.5 s lower bound in the spec cannot be honoured without breaking the 0.8 limit; the shipped cue uses 2.4). A dark hold bar of 6 per cent height and at most 0.04 luminance rides the seam. Only the picture and ghost move; the glass outline and scanlines stay. Measured on 12 blocks of about 87,000 px, steps of 100 ms: largest block change 0.041 on a text page with the ghost at maximum, 0.070 on the test card (under the 0.10 hard limit, over the 0.05 design margin). So: **do not roll the test card**, roll text pages only (the shipped cues do). Whole-screen mean moves by at most 0.007 during a roll.
- Greyscale: R, G and B identical in every frame tested (max channel difference 0) including ghost at maximum and mid-roll.

## 3. Occupant sprite and 2D equivalents
- `drawOccupant(ctx, w = 256, h = 384, { mode: 'sprite' | 'silhouette', mouth? })` and `createOccupantCanvas()` (`src/scene/materials/ghost/drawOccupant.ts`). Sprite: R = G = B = tone (face about 0.85, body 0.6, hollows 0), alpha = coverage. Silhouette: soft white shape for the decal.
- `drawGhost2D(ctx, w, h, { ghost, near, time, aspect, seed?, peak?, textCap?, noiseHz?, scale?, textMask?, uniformCap? })` (`ghost/drawGhost2D.ts`): CPU port of the same emergence, strips, placement and ceilings. It paints white with alpha equal to the sRGB-encoded luminance, so over black it shows the same grey. Draw it into a low-resolution canvas (for example 240 x 180, `image-rendering: pixelated`) stacked above the 2D screen background and **below the text**, at most 30 Hz, never under Calm. Pass the rasteriser canvas as `textMask` to cap the figure over text (measured 6.8 ms per call at 240 x 180 including the mask), or `uniformCap: true` for a cheaper but fainter layer. Same `GHOST_AREA_GAIN` and `GHOST_TEXT_CAP_SCALE` as the shader.
- 2D roll: `rollOffset(p)` and `rollPhase(roll, now)`. Translate the screen contents by `(rollOffset(p) % 1)` of the screen height and draw a second copy one screen height above to wrap. Keep the glass outline fixed. No CSS exists for the roll because it needs the wrap; the 2D hold bar is optional.
- 2D edge dim: unchanged advice, an inset shadow only outside the safe area.

## 4. Room pieces (`src/scene/materials/room/`, exported from `@/scene/materials`)
All procedural, greyscale, about 0 kB, all textures disposed on unmount.

| Component | Mount | Notes |
|---|---|---|
| `<WallPaper position width height color tile />` | `position={[0, 0.9, -0.95]}` faces +z | Faint diamond lattice, pixel values 120 to 136 (under 8 per cent contrast), 256 px tile. Lit `MeshStandardMaterial`, so the scene's key/ambient dim darkens it. `color` (default `#3a3a3a`) multiplies the pattern |
| `<Shelf position width depth color />` | `position={[x, TV_LAYOUT.shelfY, z]}` | Dark lit plane plus a dust-fall overlay (alpha up to 0.35). Group origin is the centre of the shelf surface |
| `<BlobShadow position width depth opacity />` | under the cabinet, `y = shelfY + 0.002`, cabinet centre is x = 0.135 | Black radial-alpha ellipse, unlit |
| `<OccupantDecal position height shadow decalRef />` | on the wall to the left of the set, for example `[-1.25, 0.25, -0.947]` | Soft Occupant silhouette, black, opacity `decalOpacity(shadow)` which is at most 0.10. Never moves. Unlit |
| `<RoomPieces decalRef shadow />` | one mount, placed for `TvBody` | All four at those positions |

- Update the decal without React state: `decalRef.current.opacity = decalOpacity(hauntStore.shadow)` inside `useFrame` (pass `decalRef`).
- **Room dim must not touch the screen:** the screen is a `ShaderMaterial` that ignores lights, so multiplying key, ambient and environment by `1 - dim x 0.65` leaves the picture alone by construction. The room dim only shows on lit materials: wall, shelf, cabinet, bezel, knobs. The decal and the blob shadow are unlit black overlays, so the dim does not change them. The only thing the screen shows of the dim is `uHauntVignette` in 3d-screen.
- The pattern is invisible by design at the usual brightness (alpha and contrast are low): check it at the lit brightness you choose; the dust is the part that reads.

## 5. CrtScreenMaterial component: new props
`ghost`, `ghostNear`, `ghostSeed`, `roll` (phase for `uRoll`), `hauntVignette`. All are forced to 0 when `calm` is true. Plain-material users (the scene-developer) copy them into `material.uniforms` as in round 1.

## Files changed in round 2
- `public/fonts/vt323-regular.woff2`, `licences/OFL-VT323.txt`, `LICENCES.md` (rewritten); deleted `bedstead-regular.woff2`, `licences/Bedstead-*`
- `public/textures/test-card-960x720.png` (re-baked with VT323), `public/textures/LICENCES.md`
- `src/scene/shaders/crt/crt.frag.glsl`, `createCrtMaterial.ts`
- `src/scene/materials/CrtScreenMaterial.tsx`, `index.ts`, `testcard/drawTestCard.ts`
- New: `src/scene/materials/ghost/drawOccupant.ts`, `ghost/drawGhost2D.ts`, `room/roomTextures.ts`, `room/RoomPieces.tsx`

## Decisions
- Text cap scaled by 0.5 and a wide mip-based mask: the spec's 0.07 ceiling alone gave 3.5:1 to 4.2:1 once glow, grain and scanlines were on top. The uniform keeps its documented value and meaning ("ceiling"); the shader is stricter.
- Roll minimum 2.4 s (see above), because the 0.8 screen heights per second peak speed fixes the shortest sweep. The roll is a full wrap, so the picture ends where it began.
- Head height, not sprite height, follows the spec's "head about 70 per cent of the glass height at near 1": the bust is about 2.2 glass heights tall at that point and clips at the glass, so only the face, neck and top of the lapels show.
- Ghost gain 0.6 (`GHOST_AREA_GAIN`) keeps the mean contribution at 0.018 at maximum, well under 0.05, so the figure is visible but pale; raise it up to about 1.5 if more presence is wanted (the mean would reach about 0.045).

## Requests for other agents (round 2)
- scene-developer: in `ScreenSurface`, copy `hauntStore.ghost` to `uGhost`, `ghostNear` to `uGhostNear`, `rollPhase(hauntStore.roll, nowSeconds)` to `uRoll`, `dim * 0.25` to `uHauntVignette` (3d-screen only; zero in 3d-set, where `SetLights` does the dim), and a fixed `uGhostSeed`. The ghost sprite is attached by the factory; do nothing for `uGhostMap`. Replace `Room.tsx` with `RoomPieces` (or the four parts) and drive `decalRef.current.opacity = decalOpacity(shadow)`. Keep `uNoiseHz` 12 behind text. Do not roll the test card. Use `drawTestCard` for the card; VT323 must be loaded first.
- frontend-developer: `await document.fonts.load('16px VT323')`; VT323 advance is 0.4 em (use `measureText`), no mosaic glyphs (draw rectangles). 2D mode: stack a low-res canvas with `drawGhost2D` above the screen background and below the text, at most 30 Hz, none under Calm, `textMask` = your rasteriser canvas; implement the roll with `rollOffset`/`rollPhase` and clamp the roll duration to at least `ROLL_MIN_SECONDS` (2.4 s) in the cue scheduler (the spec's 1.5 s lower bound cannot meet the speed limit).
- ux-ui-designer: update design-spec 16.6.1 (roll duration 2.4 to 3 s) and 14 (VT323 advance 0.4 em, `--tt-cell-aspect` is now the measured value). Keep the header on `--tt-2` or darker (4.55:1).
- architect: add the same minimum of 2.4 s to the cue validator's `roll` range if you build it.
- qa-engineer: with the ghost at maximum expect body text at 5:1 strict, ghost mean +0.018, no region change over 0.05 per 100 ms during a roll on a text page; do not test a roll over the test card (0.07).
- performance-optimiser: the ghost adds one extra mip fetch, one sprite fetch and a few noise evaluations per fragment only while `uGhost` is above 0 (a uniform branch); the roll adds one derivative-based fetch. Please check a DPR 2 full-screen frame on a real GPU.

Integration pass: confirmed `TELETEXT_FONT` in `drawTestCard.ts` is VT323 (done in round 2; caption layout is centred and independent of cell width, so the baked PNG is unchanged); no code or CSS in my folders names Bedstead.

---

# v2 (Phase 4a): the nine rooms

`npm run build`, `npm run lint`, `npx tsc -b` and `npm test` (12 files, 144 tests) all pass. Nothing is committed. Verified in headless Chrome (ANGLE and SwiftShader) with a stand-in projector (fill, vAlign, height rule, camera translated parallel to the anchor) at 1440 x 900, 1024 x 640 and a 390 x 844 phone; Safari, Firefox and real GPUs are untested.

## How to mount a room (scene-developer)
Everything is procedural: **0 bytes of assets** in `public/`, no decoder to self-host, no per-room `public/models/<id>/` or `public/textures/<id>/` folder (the three existing `LICENCES.md` files state this). Import from `@/scene/materials/rooms` (`src/scene/materials/rooms/index.ts`).

```tsx
// src/scene/environments/mountain-sky/index.tsx
import { MountainSkyRoom, MOUNTAIN_SKY_SCREEN, setKeepOut, type RoomUniforms } from '@/scene/materials/rooms';
function Scene({ calm, colour, pose }: EnvironmentSceneProps) {
  const uniforms = useMemo(createRoomUniforms, []);          // shared by every material in the room
  // whenever the projector updates (and null in browse pose): setKeepOut(uniforms, placementRect | null)  // adds the 24 px halo
  return (<>
    <ScreenAnchor ... />
    <MountainSkyRoom calm={calm} colour={colour} pose={pose} uniforms={uniforms} watchDistance={solverDistance} quality={phone ? 'low' : 'high'} dim={focusBackdrop ? 0.6 : 1} />
  </>);
}
export default { id: 'mountain-sky', Scene, screen: MOUNTAIN_SKY_SCREEN } satisfies EnvironmentModule;
```

- **Anchor space:** a room is authored in the same space as `<ScreenAnchor/>`: origin at the screen centre, +Z towards the viewer, +Y up, units of `widthM`. Mount the room as a sibling of the anchor (same transform). Do not move the anchor to suit the room.
- **`RoomProps`** (all rooms): `calm` (required), `colour?` (information only), `pose?`, `uniforms?` (`RoomUniforms`, else a private set), `widthM?` (default = the room's `*_SCREEN.widthM`), `watchDistance?` (**camera to anchor-plane distance in the watch pose, metres; pass the solver's value**, default 1.6 x widthM; the scenery is placed by angle from that camera, so a wrong value shifts it), `quality?: 'high' | 'low'`, and on every room except tv-room `dim?` (0..1 brightness of the whole canvas, 0.6 for the focus backdrop; draws a last full-screen black quad).
- **`uKeepOut`:** `createRoomUniforms()` returns `{ uTime, uCalm, uSpill, uKeepOut, uView }`. `setKeepOut(u, rect, halo = 24)` takes the player rect in CSS px relative to the canvas top-left (the same rect as `playerStore.placement.rect`) and stores rect plus halo. Pass `null` when the player is hidden (browse pose). Moving and ambient sprites (clouds, birds, aurora, steam, dust, motes, fireflies, sparkles, spindrift, beam) multiply their alpha by `smoothstep(0, 40 px, distance outside the keep-out)` in their fragment shader (`keepFade()` in `src/scene/shaders/room/common.ts`). `uView` (CSS size and pixel ratio) is kept up to date by the room itself.
- **Clock and Calm:** each room calls `useRoomClock(uniforms, calm)`: time advances normally, and in Calm it is held at a per-room fixed frame, `uSpill` is 1, and birds, spindrift, sparkles, steam, dust, motes, fireflies, moths and crowd sway are not rendered or are still. Light spill is the shared `spill(t)` (1 + 0.08 sin(2 pi 0.6 t) + 0.05 sin(2 pi 1.3 t + 1.7)), never driven by the video, applied to surround lights and glows only.
- **Camera requirements:** `far` must be at least **60 x widthM** (the mountain sky dome has radius 50 x widthM); set `near` to about 0.01 x widthM. No camera motion in the watch pose.
- **Colour:** rooms are authored in colour; the greyscale is the CSS filter. Palettes are exported (`*_PALETTE` in `rooms/specs.ts`). Greyscale check (luma on sRGB, difference over the lighter): every prop pair that must read apart is at least 25 per cent apart (mountain sky zenith/horizon, cloud top/shadow, ridge steps, seats/curtains, beanbags, crowd clothes, window/wall roles). I changed three palette hexes to get there: beanbag blue `#3f6f8a` to `#2a4a63`, bedroom wood `#4a3526` to `#33241a`, chai indigo `#2e3f7a` to `#4a5fa8`. The one pair still under 25 per cent is space deck sunrise limb against the hull (9 per cent); they are never adjacent (limb is inside a window).

## Contract values to use (`rooms/specs.ts`, exported as `*_SCREEN`)

| Room | `aspect` | `widthM` | `fill` | `align` | `vAlign` | Notes |
|---|---|---|---|---|---|---|
| mountain-sky | 16/9 | **12** (spec says 120) | 0.72 | centre | upper | Scale is arbitrary: 12 keeps every distance inside the default camera far plane. Anchor stays 16:9 flat |
| tv-room | 4/3 | 0.58 (`TV_LAYOUT`) | 0.55 | left | centre | |
| cinema | 16/9 | 6 | 0.72 | centre | centre | |
| drive-in | 16/9 | 14 | 0.66 | centre | **upper** | The spec says the screen is high in the frame and the camera low; `upper` does that. Needs the designer's nod |
| open-air | 16/9 | 8 | 0.70 | centre | centre | |
| bedroom | 16/9 | 1.2 | 0.60 | centre | centre | |
| chai-stall | 16/9 | 0.7 | 0.58 | centre | centre | |
| train | 16/9 | 0.45 | 0.60 | centre | centre | |
| space-deck | 16/9 | 3 | 0.64 | centre | centre | |

## Components per room

| Room | Component and path | Extra props | Budget measured |
|---|---|---|---|
| mountain-sky (hero, built first) | `MountainSkyRoom`, `rooms/mountainSky/MountainSkyRoom.tsx` | | JS 5.0 kB gzip own plus 7.1 kB shared kit, 0 kB assets, 24 draw calls (limit 28), 2.9k triangles (18k), mobile 14 calls |
| tv-room | `TvRoomExtras`, `rooms/tvRoom/TvRoomExtras.tsx`; plus `TvBody tint` | `colourActive?: boolean` (pass `useColourActive()`), `burst?: number` | JS 1.6 kB, 0 assets, lamp, doily, rug and bezel ring in 2 draw calls |
| cinema | `CinemaRoom` | | JS 2.0 kB, 8 calls, 0.9k tris |
| drive-in | `DriveInRoom` | | JS 1.9 kB, 13 calls, 2.9k tris |
| open-air | `OpenAirRoom` | | JS 1.9 kB, 10 calls, 2.4k tris |
| bedroom | `BedroomRoom` | | JS 3.1 kB, 10 calls, 0.5k tris |
| chai-stall | `ChaiStallRoom` | | JS 2.8 kB, 19 calls, 1.2k tris |
| train | `TrainRoom` | | JS 2.4 kB, 8 calls, 0.3k tris |
| space-deck | `SpaceDeckRoom` | | JS 2.7 kB, 7 calls, 0.5k tris |

Draw calls and triangles are `renderer.info` after one frame (including the harness's one-quad stand-in anchor). JS is gzip of a lib build with three, react, R3F and drei external, so it is the chunk cost on top of the shared core. Every room is at most about 12 kB with the shared kit (limit 60 kB). All assets: 0 kB (limits 1.5 and 2 MB). `ROOMS` in `index.ts` maps id to `{ Room, screen }` for the registry.

### Mountain sky (placement, as built)
- Sky: one gradient sphere around the camera (`SkyDome`, never any video), horizon band 9 degrees below eye level, glow, two aurora ribbons in the upper side columns only (15 per cent alpha cap, fade by `uKeepOut`), stars (120 high, 60 low) twinkling 0.3 to 1.2 Hz at 10 per cent.
- Three ridge layers with peaks only in the outer columns; inner tops stay under the cloud line. Cloud sea: six rows of soft puff quads generated in the fragment shader (two rows on `low`), drifting at 3 and 7 px/s equivalent, tinted from lit top to shadow, fading to horizon colour with distance; plus mid clouds in the side columns. Ledge, cairn and trekking pole below the horizon (high quality only). Birds (8, 1.5 Hz wing-beat), spindrift and sparkles hidden in Calm and on `low`.
- Portal (children of the anchor space, behind the rect plane by 0.0008 x widthM): dark frame (about 1 per cent), 2 px hairline, four L-shaped corner brackets, light pillar, glow pool on the sea, halo. Pool, pillar and halo follow `spill`.
- Measured, keep-out: with the anchor hidden and the clock at two different times, **0 changed pixels inside the player rect and 0 in its 24 px halo ring** in all eight rooms tested (while 15,000 to 212,000 other pixels changed), so nothing moves into the zone.
- Spill-driven glows are at most base 0.30 x 13 per cent, so about 0.012 relative luminance per 100 ms, under the 0.05 limit.

### tv-room additions
- `TvBody` now takes `tint` (0 default, 1 = warm walnut). Pass `tint={colourActive ? 1 : 0}`, never 1 on channel 0. The wall paper tint is `WallPaper color` (use `TV_ROOM_PALETTE.wallpaper`, accent line `#b0561e`); I did not change v1's room.
- `TvRoomExtras`: table lamp with doily to the right of the set (shade top under the glass top), rug edge at the bottom of frame, bezel-ring shader (scanline texture at low alpha and an inner glow at the opening edge only, none over the glass) with the 300 ms channel-change static burst (`burst` 0..1; ignored in Calm), a generic spill point light, warm or grey lamp by `colourActive`. At the "set fits 95 per cent of the width" watch pose the lamp is outside the frame; it shows in browse and idle framing.
- Not done here: the swap of the dome for a flat black backing, and zeroing the Occupant near the screen; those are scene wiring (set `uGhost` and `uRoll` to 0 on live channels).

## 2D skins
`src/scene/materials/rooms/skins2d.css`: `.room2d` plus `.room2d--<id>` backdrops (mountain sky dusk gradient with soft cloud blobs, cinema maroon edges, drive-in amber line, open-air string-light dots, bedroom lamp-glow corner, chai brick and blue band, train sunset strip, space black with a blue arc, tv-room walnut frame). Colour only: the frontend applies the same `grayscale(1)` filter as on the canvas. Static, so nothing to freeze.

## Not done in this pass
- **Room sound** (synthesised ambient audio, spec 5.0 to 5.9): not written. It belongs in the frontend's Web Audio engine (`src/hooks/`, not my folder); recipes are in the spec. I can supply a pure `createRoomSound(ctx, id)` module if wanted.
- **Site-made cards** (idle test card on non-tv rooms, paused card, still card, no-signal card): not made; `drawTestCard` already exists for the idle card.
- The tv-room dome swap and flat backing; the portrait idle framing (screen at 92 per cent width, centred at 34 per cent height) and the mountain-sky arrival tween (scene-developer).
- Visual polish still open: drive-in dashboard and steering wheel read as dark wedges, not detail (the camera sits low and they are mostly below the frame); the wall paper pattern on the tv-room and the open-air grass sway are subtle by design. Cinema beam is faint (0.16 alpha).
- Real-device checks (phone GPU, Safari, Firefox) and the 100 ms luminance-change frame analysis; the numbers above are from Chrome on SwiftShader.

## Requests for other agents (v2)
- scene-developer: mount each room as above (one `createRoomUniforms()` per scene; `setKeepOut` on every projector update and `null` in browse); pass `watchDistance` from the solver and `quality="low"` on phones; set camera `far >= 60 x widthM`; use the `*_SCREEN` values (mountain-sky `widthM` 12, drive-in `vAlign: 'upper'`). Pass `dim={0.6}` for the focus backdrop. The anchor must be flat and at z = 0; rooms put dressing at about z = -0.001 x widthM behind it. Keep the arrival tween and portrait idle framing in your code. The registry's per-room `Scene` should call `useColourActive()` and pass `colourActive` and `tint` for tv-room.
- frontend-developer: import `rooms/skins2d.css` for 2D mode and apply the same CSS grayscale filter to it; the Room sound engine (recipes in spec 5.0 to 5.9) is yours, I can supply a module on request. Colour prop: rooms ignore `colour` (the CSS filter does the work), so nothing needs passing.
- ux-ui-designer: confirm drive-in `vAlign: 'upper'`, mountain-sky `widthM` 12 (scale only), and the three palette hex changes above.
- qa-engineer: overlap grid on all nine rooms with the rect and halo (the harness test above is a starting point: hide the anchor, render at two times, diff inside the rect and halo); frozen-Calm frame check (birds, spindrift, sparkles, steam, moths, dust absent); greyscale reads with the CSS filter; draw calls and triangle counts in the table.
- performance-optimiser: the cloud sea is six alpha-blended rows of large noise quads (fill-rate heavy at DPR 2); `quality="low"` halves them. Please measure on a real phone.

## v2 follow-ups (2026-11-11)
- **Mountain-sky dark block:** cause was on my side. The cloud rows fade to zero inside `uKeepOut`, and under them sat a dark `SeaFloor`, so a keep-out rect that extends down to the bottom of the view (an included info row or dock, or a wrong height) blanked the sea in a block as wide as the rect. Fixes: (1) the cloud rows now fade to at most 55 per cent (`keepMin` on `PuffLayer`), so they can never vanish; (2) the sea floor is now cloud-coloured, not dark; (3) `setKeepOut` clamps the rect height to its width (no room's player rect is taller than wide). Checked with a deliberately mis-set rect (bottom forced to the viewport edge): the sea stays whole. Scene-developer: pass only the player rect to `setKeepOut`, not the info row or dock.
- **Drive-in:** the dashboard now has a rim-lit top edge, an instrument hood with two amber gauge pods (12 ticks, a needle, glow), slim A-pillars with a rim light, and a readable steering-wheel arc (thick dark rim with a lighter top edge, two spokes) rising above the dash line, all well under the rect. Room sound is the frontend's `src/hooks/roomSound.ts`; nothing to do on my side.

---

# 2050 (Phase 4a): holographic glass

`npm run build` and `npm run lint` pass, and `npx tsc -b` is clean for my folders. `npm test`: 173 of 175 pass. The two failures are not code faults of mine: `tests/unit/repo.test.ts` "the teletext typeface is VT323, with its licence file listed" (expected, the font was replaced; the qa-engineer replaces it) and `tests/unit/v2-layout-channels.test.ts` "switches to focus at 1280 x 720" (the frontend's layout work in progress). Nothing is committed. Measured in headless Chrome (ANGLE and SwiftShader) with a 1280 x 720 harness and a 3D harness; Safari, Firefox and real GPUs are untested.

New code is additive: the 1970s CRT, TV and room files are untouched until the scene swaps (removal list below). Import the 2050 art from `@/scene/materials/holo` (`src/scene/materials/holo/index.ts`).

## 1. Fonts (`public/fonts/`)
Space Grotesk (variable, weight axis 300 to 700, `space-grotesk-latin.woff2` 18.4 kB), Atkinson Hyperlegible (`-400` 14.6 kB, `-700` 14.9 kB), Space Mono (`space-mono-regular.woff2` 13.9 kB, `space-mono-bold.woff2` 14.1 kB). **Total 75.9 kB** (budget 150 kB). Subset to Basic Latin, Latin-1, dashes, quotes, bullet, ellipsis and arrows. Full OFL 1.1 texts are in `public/fonts/licences/` (`OFL-Space-Grotesk.txt`, `OFL-Atkinson-Hyperlegible.txt`, `OFL-Space-Mono.txt`; none declares a Reserved Font Name). `LICENCES.md` is rewritten. VT323, Barlow Condensed and their licence texts are removed (they stay on `main`). File names match `src/styles/fonts-2050.css`.
- **Space Mono advance: 612 of 1000 units, so 0.612 em per cell**, in both weights and for every glyph tested. Ascent 1120, descent 361 (a 1.481 em line box, taller than the 1.1 row pitch), so derive the draw size from `measureText` and place by baseline.
- Look-alikes at 16 px, checked at 3x zoom: `1`, `l`, `I` clearly differ (flag, tail, serifs). Space Mono's zero is a dotted zero, narrower than `O`; distinct but the dot is faint under about 18 px (use weight 700 for numerals). Atkinson has a slashed zero. Space Mono has `ss01` and `ss02` alternates (change 1 and I) and no `zero` feature.

## 2. Holo shader (`src/scene/shaders/holo/`)
`holo.vert.glsl`, `holo.frag.glsl`, `createHoloMaterial.ts`. Same factory shape as the CRT one:

| 1970s | 2050 |
|---|---|
| `createCrtScreenMaterial(tex, overrides)` | `createHoloScreenMaterial(tex, overrides)` |
| `CRT_DEFAULTS`, `CrtUniformValues`, `CrtShaderMaterial` | `HOLO_DEFAULTS`, `HoloUniformValues`, `HoloShaderMaterial` |
| `setCrtTexture`, `crtUniforms` | `setHoloTexture`, `holoUniforms` |
| `estimateCrtMeanLuminance({ warmup, collapse, pictureMean, brightness?, staticLevel? })` | `estimateHoloMeanLuminance({ warmup, collapse, pictureMean, brightness? })` (table from measured frames) |
| `prepareScreenTexture`, `rollOffset`, `rollPhase`, `ROLL_MIN_SECONDS`, `WARMUP_SECONDS` 2.2, `COLLAPSE_SECONDS` 0.55, `getOccupantTexture` | same names |

Everything is exported from `@/scene/materials/holo`. `useCrtMaterial` becomes a copy with these names (the seam: same uniforms driven the same way, including `uRoll = rollPhase(...)`; no changes to `screenState`).

### Uniforms
Unchanged contract (all still driven the same way): `uMap`, `uTime`, `uWarmup`, `uCollapse`, `uCalm`, `uPixelRatio`, `uAspect` (default 16/9), `uBrightness` (0.4 for the loading pattern), `uBar`, `uBurst`, `uNoiseHz`, `uNoiseAmp` (0.012), `uGrainPx` (2.5), `uGlow` (0.1), `uGlowLod` (2.5), `uVignette` (0.2), `uCorner` (0.016), `uReflection` (0.03), `uGhost`, `uGhostNear`, `uGhostSeed`, `uGhostMap`, `uGhostTextCap` (0.07), `uGhostPeak` (0.30), `uRoll`, `uHauntVignette`.
New: `uEdge` (default 1: draw the 2 px edge light inside the glass; set **0 on the 3d-set pane** because `HoloDisplay` has its own edge light, keep 1 in 3d-screen and 2d) and `uMono` (default 0: set 1 in Monochrome to grey the output and drop the colour fringe; the canvas CSS filter does the rest).
Retired, still declared and ignored so the seam compiles (remove next release): `uCurvature`, `uScanlines`, `uScanStrength`, `uStaticLevel`, `uJitter`.

### Behaviour and measurements (1280 x 720 harness)
- **Materialise (2.2 s, `uWarmup`):** seed of light (6 px) 0 to 0.4 s; horizontal and vertical hairlines grow to the glass bounds 0.4 to 0.8 s; the edge light traces round from the line ends 0.8 to 1.1 s; the field fills outward from the centre 1.1 to 1.8 s (blurred card, mip 4 to 1, with interference-fringe grain); it sharpens 1.8 to 2.2 s (mip 1 to 0) and the edge lights up. Mean luminance, seconds to mean: 0.1 s 0.000, 0.5 s 0.0004, 0.9 s 0.0017, 1.1 s 0.0036, 1.5 s 0.018, 1.7 s 0.043, 1.9 s 0.046, 2.05 s 0.057, 2.2 s 0.065 (the calibration field's own mean is 0.066, **not** the spec's estimate of 0.14, so the ramp ends there). Rises monotonically, no overshoot. Largest change on any 341 x 256 tile per 100 ms: 0.046.
- **Fold (0.55 s, `uCollapse`):** softens 0 to 200 ms, contracts to the outline and hairlines 200 to 400 ms, hairlines shrink to the seed and fade 400 to 550 ms. Mean falls monotonically 0.066, 0.060, 0.052, 0.046, 0.007, 0.005, 0.002, 0 (it only falls). The contraction step is 0.08 on one tile per 50 ms; it is one decrease to dark, not an alternation, so it is not a flash, but it is above the 0.05 design margin: if the designer wants it under, the fold needs to be longer than 0.55 s.
- **Calm (`uCalm` 1):** two renders at different `uTime`, and a render with ghost, slip, band, burst and edge dim all at maximum compared with a clean one, are **pixel-identical (0 differing pixels)**: both materialise and fold cut, grain is frozen, and the haunt uniforms are ignored.
- **Phase slip (`uRoll`):** same `rollOffset(p)` (cosine sweep over the first 5/6, one wrap, damped settle under 2 per cent, minimum duration `ROLL_MIN_SECONDS` 2.4 s, peak speed 0.785 screen heights per second). The picture layer wraps; the background glow layer lags 12 per cent behind and picks up a tiny view offset, so a soft parallax opens and closes. No sync band. Largest tile change per 100 ms on a text page: 0.049. Do not slip the standby pattern or a live player (slip is a channel 0 text-page cue, as before).
- **The Occupant (2050 figure):** 48 horizontal light slices, each with a brighter top line, shifted by slow correlated noise (plus or minus 1.2 per cent of the width, 0.2 Hz) with a wider tear at the throat; a head 1.45 times taller than wide, tilted 6 degrees clockwise, darker crown cap, no parting, ears, nose or mouth; two hollow voids (the right larger and lower); a thin seam of light brow to chin (brightest tone) that parts into a slit up to 8 units wide from `uGhostNear` 0.8; a neck ring; narrow shoulders and a high collar line; dissolving below the chest. It condenses out of two-octave speckle (grain 2 to 4 px, re-seeded at 4 Hz at most). Colour: `#cfeaff` with a `--haze` fringe on the left edge and `--lumen` on the right (about 1 px, 35 per cent); `uMono` removes the fringe. Same placement, size and drift as before. Original, no recognisable character.
- **Ceilings (ghost at maximum, blank card):** mean contribution +0.013 (limit 0.05); largest change per 100 ms while ramping 0 to 1 over 8 s: 0.0005 (limit 0.02). Text contrast with the ghost at maximum (strict 5th percentile of text against 95th percentile of the background within 12 px of a glyph, worst of 8 time points, bar crossing): body text 6.2:1, corner text 8.0:1, header chip 7.8:1, fact chip 9.7:1. All at least 4.5:1. The text cap is `uGhostTextCap` x 0.9 over glyph cells and a one-cell dilation.
- **Red-flash:** 0 pixels with red fraction above 0.8 (and brightness above 0.2) in any frame of the materialise, fold and slip sequences. The palette has no saturated red; the fringe is violet and cyan.
- **Light field:** the glow layer is one extra mip sample of the same `uMap` (no render targets); 2 further layers are not needed to read as depth (the lag and parallax are the effect). Output is colour, NeutralToneMapping works (do not include `tonemapping_pars_fragment`: three adds it when tone mapping is on).

## 3. Models and art (`src/scene/materials/holo/`, `standby/`, `holo2d/`)

### `HoloDisplay` (replaces `TvBody`)
`import { HoloDisplay, HOLO_LAYOUT } from '@/scene/materials/holo'`. Procedural, 0 bytes, **10,198 triangles**, 11 draw calls. Metres, origin at the centre of the player rect, +z towards the viewer, glass front at z = 0.
- Props: `children` (the screen material, attached to the `screen` mesh), `powerAngle`, `channelAngle`, `volumeAngle` (radians, rotation about each ring's own axis; the ring and dimple nodes have local z pointing up, so `node.rotation.z` turns them as `KnobLayer` already does), `powerHandlers` / `channelHandlers` / `volumeHandlers` (`onClick`, `onPointerOver`, `onPointerOut`, `onPointerDown`; the ring mesh is the event target), `edgeBoost` (edge light strength, 1 steady, up to 1.4 for the 300 ms channel-change pulse; set it per frame while animating), `nodesRef` (`HoloNodes`, alias `TvNodes`), plus any `group` prop. No `tint` (there is no tint rule any more).
- Nodes (direct children of group `holo-display`): `screen`, `knob-power` (dimple), `knob-channel` (outer ring), `knob-volume` (inner ring), `cabinet` (puck body with speaker slits), `bezel` (6 mm pearl ceramic border), `trim` (satin edge), `control-plate` (puck top face), `glass-body`, `edge-light` (2 px steady lumen frame flush outside the rect), `edge-halo` (additive glow of at most 8 px, alpha 0.3).
- `HOLO_LAYOUT` (same field names as `TV_LAYOUT` where the camera code uses them): `cabinet {width 1.2, height 0.675}`, `shelfY` -0.4775, `originOffsetX` 0, `screen {width 1.152, height 0.648, aspect 16/9}` (**use `HOLO_LAYOUT.screen.width` as `widthM`**; the player rect is the glass inset by 1.5 per cent), `pane`, `glass`, `puck {width 0.45, depth 0.3, height 0.1, cz -0.06, topY}`, `rings`. Pane 1.2 m wide, 9 mm thick, hovering 4 cm over the puck. The `screen` mesh is flat with UVs 0..1 (u right, v up).
- Materials: pearl ceramic `#e8eaf0`, satin `#c9d3e4`, graphite `#1a2030`, smoked glass `#070b16`, lumen ring and edge light (unlit, steady). Needs `HoloEnvironment` (or any environment) for the ceramic and bevel to read.

### `HoloEnvironment` (replaces `GreyEnvironment`)
Props `intensity` (0.5), `resolution` (64). A coloured studio built with `PMREMGenerator` directly (lumen key panel, violet haze strip, overhead ring, faint ember fill): the dispose-safe approach of the performance pass, everything disposed on unmount. No file, no background.

### `HoloRoom` (replaces `RoomPieces`; `createHoloRoomUniforms()`)
Mount: `<HoloRoom calm={calm} uniforms={roomUniforms} decalRef={decalRef} quality={'high' | 'low'} />`. Frosted back-lit wall panel (shader, static frost grain, bright rim), floor with a soft reflection of the pane's light, light cushion under the puck, an overhead ring light with an additive cone shell (keep-out faded), 30 dust sprites (14 on `low`; drift under 4 px/s; none in Calm), and the Occupant's shadow behind the wall (`decalRef.current.opacity = decalOpacity(shadow)`, at most 0.10). Draw calls about 8. Additive meshes only: no post-processing, no ray-marching.
- **Room dim:** `createHoloRoomUniforms()` returns the shared room uniforms plus `uRoomLight`. The scene sets `uRoomLight.value = 1 - dim x 0.65` each frame; it dims the wall back-light, the ring light and the cone. The pane's own light is not on it. (The wall is unlit, so `SetLights` does not dim it.) Call `setKeepOut(uniforms, rect)` as for the other rooms (cone and dust fade inside the rect plus halo).

### Calibration field: `drawStandby` (replaces `drawTestCard`)
`drawStandby(ctx, width, height, { loadingPercent?, subCaption? })` and `createStandbyCanvas(w, h, opts)` in `standby/drawStandby.ts`; `TT` exports the eight screen tones. Same call shape. All 9 elements of design-spec-2050 3.4: dot grid, two 24-ring interference rosettes (additive, so moire shows), conic iris with pupil, axes with ticks, corner L-brackets, 12-step ladder, spectrum rails (margins on 16:9, two bands on portrait), caption "TRANSMISSION PENDING" (Space Grotesk 600) and "STAND BY" or "TUNING... NN%" (Space Mono). 16:9 shows the whole 1600 x 900 composition; a 4:3 canvas shows its centre; portrait is fitted to the shorter side. Await `document.fonts.load('600 56px "Space Grotesk"')` and `document.fonts.load('28px "Space Mono"')` first. Mean linear luminance 0.066 on 16:9. No PNG baked (2D mode can draw it live).

### Occupant sprite and 2D equivalents
- `drawOccupant(ctx, w = 256, h = 384, { mode: 'sprite' | 'silhouette' })`, `createOccupantCanvas()`, `OCCUPANT_*` in `holo/occupant2050.ts` (same API as the 1970s file; R = tone, A = coverage). **`Ghost2D.tsx` finds `drawOccupant` by globbing `/src/scene/materials/**/*ccupant*.ts` and takes the first, in path order, so `ghost/drawOccupant.ts` (1970s) wins until it is deleted.** Delete it (see removal list) and the 2D layer uses the 2050 figure.
- `holo/drawGhost2D.ts`: `drawGhost2D(ctx, w, h, { ghost, near, time, aspect, seed?, textMask?, uniformCap?, mono?, scale? })`, the CPU port with the 48 slices, the same ceilings (`GHOST_AREA_GAIN` 1.4, `GHOST_TEXT_CAP_SCALE` 0.9), colour `#cfeaff`, `mono` greys it. Same usage notes as before (30 Hz at most, below the text, never in Calm).
- `holo2d/holo2d.css`: `.holo2d-field` (slow conic field, frozen in Calm), `.holo2d` (glass sheet: 2 px edge light, soft inner glow, grain), `.holo2d--bloom` (2.2 s mask reveal), `.holo2d--fold` (0.55 s), `.holo2d--off`, `.holo2d__glow`, `data-calm="true"` cuts every animation. Animates only `transform`, `opacity` and the mask (the grain loop moves with `transform`, as `crt2d.css` does). Replaces `crt2d.css`.

## 4. Swap checklist for the scene-developer
1. `useCrtMaterial` to a holo copy: `createHoloScreenMaterial(null, { uAspect: 16 / 9, uEdge: 0 })` in 3d-set (`uEdge: 1` for `ScreenSurface`), copy `uMono` from the Colour setting, everything else as now.
2. `TvSet.tsx`: `<HoloDisplay nodesRef edgeBoost>` with the holo material as child; live channels keep the flat black `meshBasicMaterial` child (the `screen` mesh is already flat and 16:9, so no dome to hide). `screen.widthM = HOLO_LAYOUT.screen.width` (1.152), 16:9, `fill` 0.60.
3. `poses.ts` and `SetCameraRig`: import `HOLO_LAYOUT` instead of `TV_LAYOUT` (same `cabinet.width`, `cabinet.height`, `shelfY`, `originOffsetX`, `screen.height` fields). The device is 1.2 m wide and 0.815 m tall from the floor to the pane top.
4. `Room.tsx`: `HoloRoom` and `HoloEnvironment`; set `uRoomLight` for the dim cue; `SetLights` can keep the key and ambient for the pane and puck.
5. `KnobLayer`: no change in node names; the rings turn about their own z axis; use `edgeBoost` for the channel-change pulse (300 ms, 1.4 x, once per 1000 ms, none in Calm). Tone mapping: `NeutralToneMapping` is recommended; `flat` (none) also works.

## 5. Old files to remove after the swap (mark for removal)
- `src/scene/shaders/crt/` (all four files), `src/scene/materials/CrtScreenMaterial.tsx`
- `src/scene/materials/tv/` (`TvBody.tsx`, `layout.ts`, `tvGeometry.ts`, `tvMaterials.ts`, `tvTextures.ts`), `GreyEnvironment.tsx`
- `src/scene/materials/testcard/`, `src/scene/materials/ghost/` (both `drawOccupant.ts` and `drawGhost2D.ts`), `src/scene/materials/crt2d/`
- `src/scene/materials/room/` (1970s wall paper, shelf, blob shadow, decal), `src/scene/materials/rooms/tvRoom/TvRoomExtras.tsx` (lamp, rug, bezel ring, tint)
- the exports of those in `src/scene/materials/index.ts` and `rooms/index.ts`/`specs.ts` (`TV_ROOM_*`); the shared `rooms/roomKit.ts`, `roomParts.tsx` stay (the other eight rooms and `HoloRoom` use them)
- `public/textures/test-card-960x720.png` (1970s). Keep `public/textures/noise-tile-64.png` (used by `holo2d.css`).
- Favicon: the design spec does not ask for one (ADR 0012 assigns `public/favicon.svg` to the ux-ui-designer), so I did not make one.

## 6. Not done
- `HoloScreenMaterial` React component (the CRT one is unused by the scene, which drives uniforms itself); say if you want it.
- Selective bloom (needs an ADR) and any post-processing: not used, per ADR 0012.
- Real-device and other-browser checks; the 2D mask reveal in a real browser was not run.
- The `glitch` cue (chrome flicker) is DOM-side; nothing needed from the shader.

## 7. Requests (2050)
- scene-developer: the swap checklist in section 4; set `uEdge` 0 on the set pane, `uMono` from the Colour setting, `uRoomLight` for the dim cue, and `edgeBoost` for the channel-change pulse. Keep `setKeepOut` calls as they are. Camera far plane must stay at least 60 x the room's `widthM`.
- frontend-developer: import `holo2d.css` instead of `crt2d.css`; swap `drawTestCard` for `drawStandby` in `draw.ts` and `Screen2D.tsx` (same call shape); await the new fonts before the first canvas draw; Space Mono advance is 0.612 em (use `measureText`; the line box is 1.481 em, position by baseline). `Ghost2D` will pick up the 2050 figure when the old `ghost/drawOccupant.ts` is deleted, or point it at `holo/occupant2050.ts` and `holo/drawGhost2D.ts` directly.
- ux-ui-designer: the calibration field's mean is 0.066, not 0.14, so the materialise ends at 0.066 (monotonic, no overshoot); the fold's contraction step is 0.08 per 50 ms on one tile (monotonic fall, so not a flash) and would need more than 0.55 s to get under 0.05 per 100 ms; confirm that is accepted. Zero vs O in Space Mono is a faint dot at 16 px: confirm weight 700 for numerals, or ask for the `ss` alternates.
- qa-engineer: replace the VT323 assertions in `tests/unit/repo.test.ts` (fonts and licence files are now the three OFL families); redo flash and contrast checks on the holo sequence (my numbers above are the starting point); add the red-flash check (0 pixels in my sequences).
- architect: `index.html` font preload should point at `space-mono-regular.woff2`.
- performance-optimiser: the holo shader adds a second texture fetch for the background layer and a `textureGrad` for the picture (the same cost as the CRT roll fetch) and `HoloRoom` adds additive cone overdraw; please measure on a real phone at the adapted DPR (the budget is 2 ms for haze, beams and glow).


## 2050 follow-up: the fold is now 1.0 s
Per the tech lead, the fold was lengthened and re-eased so the worst 341 x 256 tile step is under 0.05 per 100 ms. **`COLLAPSE_SECONDS` is now 1.0** (was 0.55); it is exported from `@/scene/shaders/holo/createHoloMaterial` and `@/scene/materials/holo` (the scene's `screenState` and the frontend's 2D `.holo2d--fold` duration read it; `holo2d.css` still says 0.55 s, and I changed `holo2d--fold` to 1 s). The shader maps `uCollapse` 0..1 across it: soften and fade 0 to 0.3, the field contracts with a wide soft edge 0.02 to 0.97 (starting whole, with no step at the first frame), hairlines fade in as it contracts and shrink to the seed 0.75 to 0.95. Measured (calibration field, 100 ms steps): per-step worst tile change 0.007, 0.011, 0.010, 0.022, 0.042, 0.027, 0.028, 0.007, 0.005, 0.001, so **0.042 per 100 ms** (text page 0.04). Mean luminance only falls (0.066, 0.065, 0.057, 0.047, 0.025, 0.009, 0.006, 0.003, 0, 0). No saturated red pixels. `estimateHoloMeanLuminance` uses the new table.
