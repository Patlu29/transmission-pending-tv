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
