# Handoff: scene-developer

## Summary
Built the lazy R3F scene in `src/scene/`: one `<Canvas>` (greyscale, `flat` = NoToneMapping, dpr [1, 2]) with a `3d-set` mode (dark room, TV set, camera rig, knob picking, 2 Hz low-passed room light) and a `3d-screen` mode (full-bleed orthographic screen in an 8 px bezel, no camera motion). It uses the technical-artist's CRT material and the real `displayStore`. `npm run build` passes, and a headless Chrome smoke test (idle, power-on dolly, orbit, collapse, knob hover, `3d-screen`) ran without errors.

## Files changed
- `src/scene/Experience.tsx`: `React.lazy`-ready default export. Returns null for `2d`. `frameloop` is `"always"` only while `warming`, or `playing` with full motion, and `"demand"` otherwise. Tween, collapse and light low-pass request their own frames while moving.
- `src/scene/StatusReporter.tsx`: `markWebglLost()` on `webglcontextlost` or canvas creation failure, real progress from drei `useProgress`, `setSceneReady`, and an error boundary that calls `setAssetFailed(message)`.
- `src/scene/ScreenDriver.tsx`: turns `introStore.status` and `motion` into `screenState`: warm-up timeline, power-off collapse (0.55 s, instant under Calm), animation time (frozen under reduced), and an estimate of mean luminance.
- `src/scene/ScreenOnly.tsx`: `3d-screen`. 1 unit = 1 CSS px, bezel `--bezel-thin`, dock `--dock-size`, and `displayStore.screenRect` wins when set.
- `src/scene/cameras/poses.ts`, `cameras/SetCameraRig.tsx`: Idle (+14° az, +5° el, 1.45 D) and Watch (0°, 0°, 1.0 D). The power dolly is 1200 ms and the reset 700 ms, both on the `--ease-camera` bezier. D is computed from `min(0.56 vw, 0.82 vh)` and re-derived on resize with a 150 ms debounce. Orbit limits are ±25° az, -8° to +15° el and 0.8 to 1.3 D, with no pan and damping 0.08. Orbit works by drag, wheel and arrow, +/- and Home keys. Double-click resets. `cameraOffWatch` is reported at 2° or 5%.
- `src/scene/lights/SetLights.tsx`: dim white key and ambient, plus a point light in front of the glass driven by `screenState.meanLuminance` through a 2 Hz one-pole low-pass, capped at 25% of max.
- `src/scene/objects/KnobLayer.tsx`: picks knobs by node name. Inverted-hull outline fades in over 100 ms, and a drei `Html` tag is anchored beside the knob. Power knob turns 40° in 150 ms. Click: power calls `power()`, channel calls `nextPage()` only when `ended` or reduced, volume calls `toggleAudio()`.
- `src/scene/objects/ScreenSurface.tsx`: screen mesh plus CRT material wiring (uniforms copied from `screenState` each frame).
- `src/scene/objects/TvSet.tsx`, `objects/Room.tsx`: placeholder geometry (see below).
- `src/scene/integration/stores.ts`, `screenState.ts`, `useScreenTexture.ts`: the thin seams.

## Placeholders (swap points)
| Seam | Placeholder | Real replacement |
|---|---|---|
| `integration/stores.ts` | `useIntroStore` is a local zustand stub (shape from architecture 4.2). `power()` toggles `ready` and `warming` then `playing` after 2.2 s. | `src/state/introStore.ts` did not exist. Replace the stub with `export { useIntroStore } from '@/state/introStore'`. `useDisplayStore` is already the real store. |
| `objects/TvSet.tsx` | Boxes and cylinders in the design-spec 10 proportions. Nodes `screen`, `knob-power`, `knob-channel`, `knob-volume`. Pivot at the screen centre, front glass at z = 0, knobs face +z. | Technical-artist GLB via `useGLTF(\`${import.meta.env.BASE_URL}models/tv.glb\`)`. Update `TV_SCREEN_WIDTH` / `TV_SCREEN_HEIGHT` if they differ. |
| `objects/Room.tsx` | Two flat dark standard-material surfaces, no paper pattern, no dust texture | Technical-artist textures or materials |
| `integration/useScreenTexture.ts` | Own 960x720 test-card-like canvas while `displayStore.screenCanvas` is null (then the texture follows the real canvas and `screenVersion`) | Nothing to do once the rasteriser calls `setScreenCanvas` |
| `SetLights.tsx` | No HDR or environment map, no contact shadows, no real area light | Tech artist may supply env or baked shadows |
| `ScreenDriver.tsx` luminance | Hand-estimated mean luminance for the room light | Replace with a measured value if the CRT shader exposes one |

No GLB is loaded yet, so there are no asset sizes or triangle counts to list.

## Decisions
- Custom camera rig rather than drei OrbitControls: Idle (1.45 D) lies outside the orbit limit (1.3 D) and the dolly must override input.
- Knob outlines use an inverted hull (no postprocessing package, ADR 0005).
- Calm is read through `displayStore.motion`, which already folds in the OS setting and the manual switch. The scene has no separate Calm code path. Calm means no tween (camera snaps), no orbit, frozen `uTime`, instant knob turn and outline, instant collapse.
- Power-off returns the camera to Idle over 1200 ms (spec is silent). Reduced or Calm snaps.
- Orbit keys listen on `window` when focus is on `body` or inside the stage. The canvas is `aria-hidden`, so it is not made focusable.

## Assumptions
- `introStore.power()` toggles on and off.
- Powered means `warming`, `playing` or `ended`. `off` and `ready` mean set off (Idle). The collapse plays on any powered to not-powered transition.
- Knob front faces +z and the turn axis is local z.
- The canvas wrapper is `position: fixed; inset: 0` at `--z-canvas`. The dock and HUD sit above it with `pointer-events: none` on their containers.
- 3d-screen insets ignore `env(safe-area-inset-*)` unless the UI publishes `screenRect`.

## Open questions
- Should the dolly also run in reverse on power-off, or should the camera stay at Watch? (ux-ui-designer)

## Requests for other agents
- frontend-developer: create `src/state/introStore.ts` per architecture 4.2, then the Tech Lead or I swap the seam. Mount with `React.lazy(() => import('@/scene/Experience'))` and keep `renderMode !== '2d'`. Publish `screenRect` in 3d-screen so the quad and the DOM dock agree.
- frontend-developer: scene uses `markWebglLost`, `setLoadProgress`, `setSceneReady`, `setAssetFailed` and `setCameraOffWatch`. Please keep these names. Power must stay disabled until `sceneReady`.
- frontend-developer: `src/state/displayStore.ts` imports `@/ui/teletext/grid`; that is fine for you, but confirm the scene chunk does not pull the whole `src/ui` tree in.
- technical-artist: deliver `tv.glb` with node names from design-spec 10 and the pivot at the screen centre. Tell me whether the GLB already contains the screen mesh (then `ScreenSurface` should assign the CRT material to it instead of drawing its own quad). Confirm `uWarmup` is 1 and `uBrightness` is 0.4 for the loading card, and `uWarmup` 0 for the set-off look.
- technical-artist: give `createCrtScreenMaterial` a way to report its mean luminance, if you want it to drive the room light instead of my estimate.
- architect: no stack changes needed. The scene uses inline `eslint-disable react-hooks/immutability` in `KnobLayer.tsx` and `ScreenSurface.tsx` for the imperative R3F mutations that the React Compiler lint rule rejects.

## Round 2 (ghost story)

### Summary
Round-1 integration is done: the real `introStore`, the technical-artist's `TvBody` with the CRT material on the glass, `GreyEnvironment`, and the uniform drive. The haunt animations are in (camera creep, knob cues, room dim, CRT ghost, roll and vignette uniforms), reading a haunt store through one seam. `npm run build` and `npm run lint` pass. A headless Chrome run showed the TvBody set, the lit room and the room dim with a haunt store set by hand.

### Changes
- `integration/stores.ts`: `useIntroStore` now re-exports `@/state/introStore`. New **haunt seam**: a local `useHauntStore` stub with the spec 16.3 fields (`ghost`, `ghostNear`, `creep`, `dim`, `shadow`, `hum`, `roll`, `knobCue`). `readHaunt()` returns all zeros when `displayStore.reducedMotion` is true (Calm and OS reduced motion), so no haunt motion reaches any consumer.
- `integration/useCrtMaterial.ts` (new): builds the CRT material and drives its uniforms every frame: `uTime`, `uWarmup`, `uCollapse`, `uCalm`, `uJitter`, `uBrightness` (0.4 loading), `uNoiseHz` (24 with no text, 12 for playing and ended), `uBar` (0 when `ended`), `uPixelRatio`. Haunt uniforms `uGhost`, `uGhostNear`, `uRoll`, `uHauntVignette` are set only if the shader declares them (they are not in the shader yet; no change is needed here once they land).
- `objects/TvSet.tsx`: now `<TvBody>` with the CRT material as the glass (`uCurvature` 0.04, `uAspect` 4/3). `objects/ScreenSurface.tsx` is the 3d-screen quad only (curvature 0.08).
- `objects/Room.tsx`: shelf top at `TV_LAYOUT.shelfY`. `Experience.tsx` mounts `<GreyEnvironment intensity={0.4} />` in 3d-set.
- `ScreenDriver.tsx`: room-light luminance now comes from `estimateCrtMeanLuminance` (picture mean 0.208 for the card, 0.12 for text pages), and it invalidates on haunt changes.
- `cameras/SetCameraRig.tsx`: creep multiplies the visitor's distance by `1 - creep x creepMax`, where `creepMax = min(0.22, 1 - hScreenAtWatch / (0.86 vh))`. The follower is rate-limited to 0.04 per second upward and 1.2 per second downward (so Skip and Replay can ease back), the product respects the 0.8 D minimum, Reset view does not touch creep, and Calm zeroes it within one frame. Arrow keys and Home on `window` are ignored while `status === 'ended'`.
- `objects/KnobLayer.tsx`: knob cues turn the channel or volume knob by `deg` over at least 2 s (cue `dur`, ease `--ease-camera`, 1 degree overshoot then rest). It is skipped while the pointer is over that knob, the knob stays where it ended, and power-off or Calm returns both knobs to rest at once. Outlines and tags are not triggered.
- `lights/SetLights.tsx`: key, ambient and `scene.environmentIntensity` are multiplied by `1 - dim x 0.65`, low-passed at 2 Hz. The screen-glow point light is not dimmed.
- Reset view: the scene has no Reset control of its own (no DOM besides the Html knob tags). The clipped top-left one is not from `src/scene`. `.hud__reset` stays the only one; the scene only writes `cameraOffWatch` and reads `cameraResetNonce`.

### Remaining placeholders
| Where | What |
|---|---|
| `integration/stores.ts` | `useHauntStore` stub until `src/state/hauntStore.ts` exists. Swap: `export { useHauntStore } from '@/state/hauntStore'` and delete the stub (keep `readHaunt`) |
| `objects/Room.tsx` | Flat wall and shelf. Marked HAUNT SEAM for wall pattern, dust, blob shadow and the Occupant wall decal (opacity `shadow x 0.10`). The technical-artist's room pieces did not exist yet |
| `integration/useScreenTexture.ts` | Own test-card canvas until the rasteriser sets `screenCanvas` (in my headless run the intro store was still `loading`, so the placeholder showed "TUNING") |
| `useCrtMaterial.ts` | The shader has no `uGhost`, `uGhostNear`, `uRoll` or `uHauntVignette` yet, so the haunt values go nowhere on screen |

### Assumptions
- `roll.startedAt` is in `performance.now()` ms and `roll.dur` in seconds (values over 20 are treated as ms). `uRoll` receives the offset in screen heights (0 to 1.02, sine in-out, 400 ms settle), per spec 16.6.1; tell me if the shader wants raw progress instead.
- `knobCue.dur` is in seconds (values over 20 are treated as ms), and `knobCue.nonce` changes for every new cue.
- Knob rotation about z: positive `deg` turns clockwise seen from the front, the same direction as the power knob.
- Home is also ignored on `window` while `ended` (diary spec uses Home for P100); the Reset view key still works.

### Requests for other agents
- frontend-developer: create `src/state/hauntStore.ts` with the 16.3 field names, then the swap above. Confirm the `roll` and `knobCue` time units. Keep calling `markWebglLost`, `setSceneReady` and the other scene actions as before.
- technical-artist: add `uGhost`, `uGhostNear`, `uRoll`, `uHauntVignette` to the CRT shader and material defaults (I set them by name when present). Deliver the wall pattern, dust, blob shadow and decal as components so I can mount them in `Room.tsx` (the decal takes an opacity prop or reads `shadow`). Say if `uRoll` should be an offset or a progress value.
