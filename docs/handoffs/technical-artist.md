# Handoff: technical-artist

## Summary
Fonts are downloaded, subset and licensed (50.7 kB of WOFF2, Bedstead plus Barlow Condensed 400 and 600). The CRT screen shader is done, with a drop-in React component, a plain material factory and a 2D CSS equivalent. The original test card exists as live drawing code and as a baked greyscale PNG. The TV body is built in code (9,736 triangles, 0 bytes to download, nodes `screen`, `knob-power`, `knob-channel`, `knob-volume`). `npm run build` passes. Everything was checked in headless Google Chrome (ANGLE and SwiftShader); Safari and Firefox were not tested.

## Assets (size, triangles, textures)

| Asset | Path | Size | Triangles | Notes |
|---|---|---|---|---|
| Bedstead 3.261 subset | `public/fonts/bedstead-regular.woff2` | 6.2 kB | n/a | 302 glyphs including U+1FB00-1FBFF sextants and U+2580-259F blocks. Advance 0.6 em |
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
- Bedstead: the zip's `COPYING` is CC0 1.0, and the header of `bedstead.c` says the four authors dedicate the generator and "the embodied typeface" to the public domain. **Caveat the owner should accept or reject:** the same header says many glyph shapes come from the Mullard SAA5050 typeface, whose copyright "will still be owned by Mullard's corporate successors", and relies on section 55 of the UK Copyright, Designs and Patents Act 1988. The author's web page adds "I'm not a lawyer, though, so this may well be wrong." I used Bedstead because the licence text is permissive and the font is widely redistributed, and recorded the caveat in `public/fonts/LICENCES.md`. VT323 (OFL 1.1) is the documented swap.
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
`drawTestCard(ctx, width, height, { loadingPercent?, subCaption? })` and `createTestCardCanvas(w, h, opts)`. Section 11 elements 1 to 13 are all implemented. 4:3 canvases show the exact 1000 x 750 composition; other landscape ratios keep it centred with the field and grid extended; portrait (aspect under 1.15) uses the section 11 portrait layout (circle at 0.7 of the short side, wedges in horizontal bands, strips full width, caption at least 16 px tall). `loadingPercent` set means the caption plate reads `TUNING... NN%`. Await `document.fonts.load('600 32px "Barlow Condensed"')` and `document.fonts.load('22px Bedstead')` first. `TT` exports the eight greys. Mean linear luminance 0.208.

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
- Accept Bedstead's residual SAA5050 copyright caveat, or swap to VT323? (tech lead or project owner)
- Section 10.2 asks for a room wall paper pattern and a dust texture. I did not make them (see Not done); is a flat dark room enough? (ux-ui-designer)

## Not done
- Room wall texture (faint paper pattern, under 8 per cent contrast) and the dust-fall texture. The scene-developer's `Room.tsx` keeps flat planes. I can add a procedural pair if wanted.
- Glass reflection beyond the shader's two panes, and contact shadows (scene-developer owns lights).
- Leva tuning panel for the shader (dev only, not required).
- Safari and Firefox shader checks, and a real-GPU pass. Tested in Chrome on SwiftShader only.
- Contrast measurement of the 2D CSS overlay.

## Requests for other agents
- scene-developer: replace the placeholder `objects/TvSet.tsx` with `TvBody` (`import { TvBody, GreyEnvironment } from '@/scene/materials'`). Pass your existing CRT material as the child (`<primitive object={material} attach="material" />`), so `ScreenSurface`'s own mesh is not needed in `3d-set`; keep it for `3d-screen`. Use `nodesRef` or the node names for `KnobLayer` picking. The set's screen mesh already has the dome, so keep `uCurvature` 0.04 and `uAspect` 4/3 there. Put the shelf top at `TV_LAYOUT.shelfY`. Mount `<GreyEnvironment />` (intensity 0.3 to 0.6) so metals and the clear coat read. Also drive `uNoiseHz` (24 with no text, 12 behind text), `uBar` (0 on the diary index), `uBrightness` (0.4 while `loading`), `uWarmup` 1 for the loading card and 0 for set-off, as you asked; the shader owns the faint reflection at `uWarmup` 0. You can use `estimateCrtMeanLuminance` for the room light (pass `pictureMean` 0.208 for the test card).
- frontend-developer: import `src/styles/fonts.css` (the files now exist) and `@/scene/materials/crt2d/crt2d.css`. Await `document.fonts.load('16px Bedstead')` and `document.fonts.load('600 16px "Barlow Condensed"')` before the first canvas draw. Use `drawTestCard` for the idle and loading picture (so the card is identical in 3D and any canvas use), or the baked `test-card-960x720.png` as the 2D mode image. In 2D mode use `class="crt2d crt2d--text"` (or `crt2d--idle` behind the card) with `data-calm` mirrored from `displayStore.motion`. Keep the rasteriser's text colours as in design-spec 5.3; the contrast numbers above assume them.
- ux-ui-designer: `src/styles/fonts.css` still says "DO NOT IMPORT until the WOFF2 files exist", and `docs/design-spec.md` section 14 still says the files could not be downloaded. Please update both. Keep `--screen-header-bg` at `--tt-2` or darker (the white header text measures 4.51:1 worst case after effects). The 3D scanline darkness is 0.18, not the 2D token 0.28.
- qa-engineer: shader checks that passed here and are worth repeating in the real app: R, G, B within 2 levels in all modes; warm-up mean luminance monotonic from 1.0 s; collapse never rises by more than 0.002; calm frames identical at different times; grain cell of at least 2 CSS px; text contrast on the three sample rows above. Test the collapse at a 4x CPU slowdown, as the 0.1 s frame-delta clamp in `CrtScreenMaterial` stretches it in time without changing its shape.
- tech-lead: commit `public/fonts/*.woff2`, `public/fonts/licences/`, `public/textures/*.png` as binary files; none are generated at build time.
