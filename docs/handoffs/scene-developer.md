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

## Integration (round 2 wrap-up)

- `integration/stores.ts`: `useHauntStore` is now `export { useHauntStore } from '@/state/hauntStore'` (stub deleted). `readHaunt()` is kept and still returns zeros under Calm or reduced motion. The scene only reads the store. Units checked against the hauntStore header: `dur` seconds, `startedAt` `performance.now()` ms, values 0..1. The earlier "over 20 means ms" tolerance for `knobCue.dur` is removed.
- `objects/Room.tsx`: now the technical-artist's `RoomPieces`; `decalRef.current.opacity = decalOpacity(shadow)` each frame, no React state.
- `integration/useCrtMaterial.ts`: copies `ghost`, `ghostNear` and `rollPhase(roll, now)` into `uGhost`, `uGhostNear`, `uRoll`. `rollPhase` takes seconds on one clock, so `startedAt / 1000` and `performance.now() / 1000` are passed (this replaces my own roll offset; the shader does the easing). The roll is forced to 0 unless status is `playing` or `ended`, so the test card never rolls. `uHauntVignette` is `dim x 0.25` in 3d-screen only and 0 in 3d-set.
- Test hook (dev and test builds only): `window.__SCENE_TEST__.crtUniforms` exposes the live CRT uniforms.
- Checks: `npm run lint`, `typecheck`, `test` (27 passed) and `build` pass. Headless Chrome, real app, `?mode=3d-set`: power on, then during the story the uniforms follow the store (ghost 0.12 and `uNoiseHz` 12 while the store showed ghost 0.12, creep 0.05). With the haunt store hand-set every 20 ms (ghost 0.6, ghostNear 0.4, dim 0.5, roll 1 s into 2.4 s): `uGhost` 0.6, `uGhostNear` 0.4, `uRoll` 0.417 (matches 1/2.4) in both modes, `uHauntVignette` 0 in 3d-set and 0.125 in 3d-screen. No page errors.

Remaining requests: none new. I did not set `uGhostSeed` (the shader default applies). Not verified by eye: the room pieces and the decal at high `shadow`.

## QA round 1 (BUG-1: Watch framing)

- `cameras/poses.ts`: `watchDistance(vw, vh)` now sizes D from the **whole set** (`SET_BOX` from `TV_LAYOUT`: cabinet width 1.0, height from the top to `shelfY`, centred at x 0.135, y -0.045), per the tech-lead decision. The set is 0.56 of the viewport width, unless it would be taller than `min(0.82 vh, vh - 2 x 72 px)` (72 px at top and bottom reserved for the dock), in which case height wins. Every pose (Idle, Watch, orbit, creep) looks at `SET_CENTRE`, so the set is centred horizontally and vertically and the dock sits below it.
- Measured (headless, `.scratch/`): 1440x900 D 1.946, set about 55 per cent wide; 1024x600 D 1.996, set about 50 per cent wide (height-limited). The Idle pose is the same framing at 1.45 D, 14 degrees.
- Creep: still `1 - creep x creepMax`, now also bounded so the whole set stays inside the viewport (`creepMax = min(0.22, glass <= 0.86 vh, set height <= 0.98 vh, set width <= 0.98 vw)`), about the set centre. At maximum creep both sizes reach 0.8 D with the whole cabinet and knob panel in frame (screenshots below). The visitor's own zoom to 0.8 D plus creep is floored at 0.8 D as before.
- Test hook (dev and test builds only), merged into `window.__SCENE_TEST__`: `cameraPose()` returns `{ position, target, D, distance, distanceOverD, userK, creep, azimuthDeg, elevationDeg }`; `knobAngles()` returns `{ power, channel, volume }` in degrees clockwise from rest; `crtUniforms` as before.
- Trade-off for ux-ui-designer and frontend-developer: the glass is now smaller than the spec's worked example (about 0.58 of the set: 1440x900 glass about 500 px wide, 1024x600 about 290 px wide at Watch). The grid maths should read the real screen rect, and 1024x600 will fall into a narrower column band. If larger text is wanted at 1024x600, the set must be allowed to be taller than the dock-clear area, or the dock made one row.
- At 1024x600 the dock wraps to two rows; at maximum creep the set's feet sit behind the second row (the cabinet is clear).
- Screenshots (not baselines): `.scratch/bug1-1440x900-{idle,watch,creep-max}.png`, `.scratch/bug1-1024x600-{idle,watch,creep-max}.png`. `calm-page1-3d-set.png` must be regenerated by QA (intended change).

## v2 (Phase 4b): environments, projector, Look around

### Summary
Registry, nine room modules, `ScreenAnchor`, the watch-pose solver and projector, Look around, the TV-room live-channel integration and room switching are in. Channel 0 in the TV room is v1 unchanged (same rig, lights, room, knobs, CRT/teletext/haunt set, 3d-screen quad). `npm run lint`, `typecheck`, `build` and `test` (144 tests) pass.

### Structure (`src/scene/environments/`)
- `<id>/index.tsx`: a LIGHT facade (id, screen spec, `Scene` resolved lazily). Reason: `tests/unit/environment-contract.test.ts` loads every module under the node tsconfig (nodenext, no `import.meta.env`, no `?raw`), so a module's static or dynamic imports must not reach three, R3F, shaders or v1 scene code. The real scenes are `<id>/Scene.tsx`; `lazyEnvironments.ts` registers the dynamic imports (one chunk per room) through `lazyScene.ts`. The tv-room scene is imported statically by `Experience.tsx` (it is v1's code, same chunk).
- `ScreenAnchor.tsx`: local XY face, +Z to the viewer, registers in `anchorRegistry.ts`; its near-black face carries the paused card (channel name and "Paused") in browse and "Stand by" with no channel.
- `ScreenProjector.ts`: `solveWatch` (fill, align, `vAlign`, height rule `min(0.78 vh, vh - 56 - 64 - 48)`, `WATCH_MAX_FILL`, phone framing 0.92 wide at 68 per cent (34 per cent for `vAlign: upper`), optional lateral `extent` that centres the TV set and keeps it within 95 per cent of the width), `projectCorners`, `enforceClearHalo`. The camera only ever sits on the anchor normal through a point shifted in the plane (translated, never rotated), so the quad is exactly axis-aligned.
- `EnvironmentCamera.tsx`: watch (static; no input), browse (orbit about the anchor: azimuth plus or minus 35 degrees, elevation -5 to +12 (-8 to +15 in mountain-sky), distance 0.85 to 1.15, no pan), 700 ms tweens (1.6 s rise for mountain-sky's entrance), a snap under Calm and on phones. On settle and on resize it projects the corners, calls `usePlayerStore.reportCorners(corners, viewport)` (null while tweening and in browse), writes the shared keep-out box, and runs the clear-halo check. It never runs per frame while watching.
- Clear halo: props opt in with `userData.halo`, `userData.sweep` (swept metres), `userData.screenOwned` (frame dressing exempt). Only props nearer to the camera than the anchor plane are tested; violators are hidden (and logged with `console.error` in dev rather than thrown, so a bad prop cannot blank the canvas).
- Shared kit (`shared/`): `useRoomClock` and `spill`, `SpriteField` (one instanced draw call, drift and wrap in the vertex shader, keep-out fade), `GradientSky`, `Stars`, `Block`, `ViewFrame` and `ViewPlaced` (place props in view space by stage fraction), `SpillLight`, `keepOut` (GLSL `keepOutFade()`), `roomUniforms` (the technical-artist's `createRoomUniforms` as the single shared set: `uKeepOut` = rect plus 24 px, `uView`).
- `seam.ts` is the single adapter to the frontend's stores (`useIsLive`, `useChannelNumber`, `stepChannel`, `useColourActive`).
- Room switching: `useDeferredValue` keeps the old room up until the new chunk is built; `RoomReadyReporter` then calls `environmentStore.setReady()`; the error boundary also calls `setReady()` so `loading` never sticks; `ProgressReporter` forwards real load progress to `setLoading`. Prefetch: `prefetchEnvironment(id)` (export of `lazyEnvironments.ts`) for the picker. Previous rooms are disposed by unmounting; manual resources are disposed in effect cleanups.
- TV room, live channel: `TvSetLive` hides the dome and the anchor's flat 4:3 black face sits at the glass plane; the camera is the shared solver with `extent` = the whole set; `LiveSpill` drives the room light from the generic spill at base 0.22; the Occupant is off; the wall decal is 0.04 static (0 in Calm); `TvLiveProps` adds a lamp, doily and rug edge. Channel knob (`KnobLayer`): live click = next, Shift-click = previous, wheel over it = plus or minus one (250 ms step), tag "Channel"; on channel 0 it keeps v1 (next diary page).
- `window.__SCENE_TEST__.environment()` (dev and test builds): id, pose, settled state, local placement class, projected rect, reported corners, keep-out box, hidden props, watch distance, camera position and target, orbit params, viewport; `renderInfo()` gives `gl.info` render and memory counts (to check disposal on room switch).

### Per-room status
| Room | Status |
|---|---|
| mountain-sky | Technical-artist's `MountainSkyRoom` mounted (anchor 12 m, fill 0.72, `vAlign: upper`; rect centre at 41 per cent, 1440x900 rect 1037x583 at y 77). Settled, no props hidden. Entrance rise 1.6 s |
| space-deck, bedroom, train | Technical-artist's rooms mounted the same way; settled, no props hidden |
| tv-room | Channel 0 v1; live channels as above (camera, flat anchor, spill, lamp). Not checked in a headless run with a real channel |
| cinema, drive-in, open-air, chai-stall | PLACEHOLDER scenes of mine (blocks, view-placed seats, car dash, crowd boxes, instanced sprites). Anchor, projector and halo work; art is rough (cinema is dark). The halo check hides several chai-stall props at 1440x900 (roof, counter, bike) and the cinema beam; they need the technical-artist's real rooms |

### Placeholders
- The four rooms above; `ScreenAnchor` paused and idle card (plain canvas text); `isLastDiaryPage()` in `seam.ts` (always false, so the knob never hands over from the diary to channel 1); `TvLiveProps` (lamp, doily, rug as simple shapes, no colour-era tints).

### Not done
- TV-room colour-era tints and the bezel-only CRT static ring and the 300 ms channel-change burst (technical-artist's shader on the bezel meshes). The room edge-dip on channel change in other rooms (needs an edge-only uniform; `DimOverlay` darkens the whole canvas).
- `uKeepOut` on the technical-artist's rooms is set (via the shared uniforms); no `dim` prop is passed (the UI's CSS brightness on the canvas does the focus backdrop).
- Mountain sky: a dark rectangle shows below the rect at 1440x900 (between the portal's side edges, under the frame); it comes from the room's own parts, not the projector. Technical-artist to check.

### Requests for other agents
- technical-artist: deliver cinema, drive-in, open-air and chai-stall rooms in the same `<XRoom calm colour pose widthM watchDistance uniforms quality/>` form (anchor space, built around the watch camera); the scene mounts them with `useRoomBindings`. Also the dark rectangle under the mountain-sky frame; TV-room tints and bezel burst.
- frontend-developer: `introStore` should expose whether the diary is on its last page (for the channel knob). `tests/unit/environment-contract.test.ts` is satisfied by the light facades; room `Scene.tsx` files must stay out of its import graph.
- architect: none (the facade pattern avoids changing `tsconfig.node.json`).

## v2 integration pass (technical-artist's nine rooms)

### What changed
- All eight non-TV rooms now mount the technical-artist's `*Room` through one shared `shared/RoomScene.tsx` (anchor at the origin, room as a sibling, `widthM` from the spec). My four placeholder rooms and their helper kit (Block, SpriteField, Sky, ViewPlaced, SpillLight, clock, keepOut GLSL) are deleted. Facades match the exported `*_SCREEN` values, including drive-in `vAlign: 'upper'` and mountain-sky `widthM` 12.
- Uniforms: each room scene creates one `createRoomUniforms()` (`useRoomBindings`) and registers it (`shared/roomUniforms.ts`). The projector calls `setKeepOut(uniforms, playerRect)` on every settle and resize (only the player rect, never the info row or dock) and clears it (null) in browse and while tweening. `watchDistance` is the solver's distance; `quality="low"` on phones.
- Camera: for rooms the fov is 32 degrees (the room art's horizon angles assume it), `near` = 0.01 x widthM, `far` = max(60 x widthM, 200). The controller always reads the current R3F camera (`getState().camera`): after a channel 0 to live switch in the TV room it had been holding v1's removed camera, which left the glass projecting at the default 75 degrees (rect 296 px wide, "too small"). Fixed.
- TV room, live channels: dome hidden and flat black backing (the anchor face), no CRT material so no haunt uniforms exist on the glass, `TvBody tint={colourActive ? 1 : 0}` (channel 0 never tints), `TvRoomExtras` with `colourActive` and `burst` from `useChannelBurst` (300 ms sine envelope on a live channel change, at most once per 1000 ms, none in Calm). The watch solver now also fits the set's height: at most 0.9 of the viewport (feet included), centred vertically; at 1440x900 the glass is 540x405 (inline), the whole set in frame.
- Mountain sky dark block: the cause was the technical-artist's cloud rows fading to zero inside the keep-out over a dark sea floor (they have fixed it: clouds fade to 55 per cent at most, floor cloud-coloured, rect height clamped). I confirmed the fixed room at 1440x900: it reads as a summit over a cloud sea with the portal frame, brackets and pillar. My changes that helped: a 32 degree fov and a per-scene uniform set.
- `isLastDiaryPage()` (seam.ts) is still the placeholder: `introStore` has no last-diary-page flag yet. One-line swap once it exists.

### Deviation
- `dim` is passed as 1, not 0.6: the UI already applies `brightness(0.6)` to the canvas in focus layout (`ui.css`), and the room's own dim overlay would double it to 0.36. If the UI drops its CSS brightness, set `dim={0.6}` in `RoomScene` for focus.

### Checks
- `npm run lint`, `typecheck`, `build`, `test` (144) pass.
- Screenshots in `.scratch/`: `v2-int-<room>-1440x900.png` and `-390x844.png` for all nine rooms, `v2-int-mountain-sky-1024x600.png`, and `v2-int-tv-room-live-1440x900.png` (a pasted channel set through `__APP_TEST__.useChannelStore`). All eight non-TV rooms settle with no props hidden by the halo check at 1440x900 (phones report focus, reason phone).
- The TV room on channel 0 is v1 and never settles through the projector (v1 rig), as designed.

### Remaining
- Real iframe playback in a live TV room was not run through the scene; the rect and keep-out were checked in the test hook and screenshot.
- Look around (browse) orbit was not exercised in this pass.
- Channel knob handover: `isLastDiaryPage()` in `seam.ts` now re-exports `introStore`'s (checked in the browser: false before the story, true on the last commit page, false on the index), so the knob moves from the diary's last page to channel 1.

## 2050 (Holo room)

### Done
- **Device:** `objects/HoloDisplay.tsx` is the Lumen pane (16:9, 1.2 m glass, ceramic border, steady edge light in the 1.5 per cent ring outside the player rect) over a graphite puck with two light rings and a power dimple, with the spec's node names (`screen`, `bezel`, `trim`, `cabinet`, `control-plate`, `knob-channel` outer ring, `knob-volume` inner ring, `knob-power`). `TvSet` (channel 0, holo material on the glass, no curvature) and `TvSetLive` (dark glass, no haunt or holo material on the player area, edge light pulses 1.4 x for 300 ms on a channel change through `useChannelBurst`). The dome logic, `TvBody`, `TvRoomExtras` and the colour-era tint are no longer used by the scene.
- **Anchor and framing:** facade `tv-room`: `{ aspect: 16/9, widthM: 1.164, fill: 0.60, align: 'centre' }` (the 1.2 m glass inset 1.5 per cent a side). The watch pose frames the whole device (pane plus puck, `SET_BOX` from `holoLayout.ts`) centred, with the device at 60 per cent of the width (height limits unchanged). Channel 0 uses the same pose with v1's creep (bounded by the glass height, the whole device and the viewport) and orbit. At 1440x900 on a live channel: rect 864x486, inline. The optional lean (2 degrees or less on a `knob` cue) is not built.
- **`ControlRings`** (was `KnobLayer`, same contract): picking, outline, tag ("Channel", "Sound", "Power"), the v2 channel-knob rules (live: click next, Shift-click previous, wheel one step; channel 0 diary hands over to channel 1 on its last page), haunt `knob` cues turning the channel and volume rings (never while hovered, 3d-set only, back to rest on power-off or Calm). Each ring carries a light dot so the turn shows.
- **Shader seam:** `integration/useHoloMaterial.ts` (was `useCrtMaterial.ts`) drives the same uniforms; it still builds the CRT material as the placeholder shader, with curvature 0.
- **Room:** `objects/HoloRoom.tsx`: ink floor, frosted back-lit wall panel, overhead ring light and wall back-light that follow `dim` (x (1 - dim x 0.65), 2 Hz low-pass), light cushion under the puck, the Occupant decal (alpha at most 0.10 on channel 0, 0.04 static on live channels, none in Calm), shared `spill(t)` on live channels.
- **3d-screen:** `ScreenOnly` is ink with a 2 px lumen edge light; no camera motion. 2D stays the frontend's.
- **Test hook:** `__SCENE_TEST__.ringAngles()` (alias `knobAngles()` kept for one release) and `cameraPose()`.

### Placeholders (to swap for the technical-artist's pieces as they land)
- `HoloDisplay.tsx` and `holoLayout.ts` (pane, puck, rings, edge light): swap for `HoloDisplay` and its layout.
- The holo shader (the CRT material still runs behind `useHoloMaterial`: scanlines and grain remain on channel 0).
- `HoloRoom.tsx` and `GreyEnvironment` (still mounted): the coloured environment.
- `Occupant` decal still uses the v1 silhouette component.
- Tone mapping is unchanged (`NoToneMapping`); the spec recommends `NeutralToneMapping` for the Holo room.

### Not done
- Pane lean on a channel 0 `knob` cue; the `glitch` cue (frontend's chrome); the vertical placement keeps the device centred, so the info row and dock cover most of the puck on live channels.

### Requests
- technical-artist: `HoloDisplay` with the node names above (rings turn about local z), its layout export, the holo shader on the `useHoloMaterial` uniforms, the coloured environment, `drawStandby`.
- frontend-developer: the build is blocked by `src/ui/teletext/draw.ts` (`Frame.chromeAlpha` missing) and lint by `src/state/derived.ts` (unused names); not my files. The facts tests fail on a stale `dist` until the build passes.
- architect: the `tv-room` facade now has `widthM: 1.164`; update any doc or test that expects 4:3 or 0.58.
