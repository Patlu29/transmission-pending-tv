# 0008: Three presentation modes, with a lazily loaded scene

## Status
Accepted (2026-11-10)

## Context
The user chose a modelled 3D TV on desktop and a screen that fills the view on mobile. NFR-2 needs the power control interactive within 3 s on 4G; NFR-3 caps the first view at 5 MB; FR-20 needs a non-WebGL path; NFR-1 needs 30 FPS on a 2022 mid-range phone.

## Decision
- `displayStore.renderMode` is `3d-set` (desktop: TV model and room), `3d-screen` (narrow or touch-first: full-view curved screen quad, no TV model downloaded) or `2d` (no WebGL2, creation failure or context loss).
- Mode is chosen at start from WebGL2 support and a viewport and pointer media query (breakpoint set by the design spec). It can be forced with `?mode=`, and it drops to `2d` on `webglcontextlost`, keeping playback state.
- The scene (`src/scene/Experience.tsx`) is a `React.lazy` chunk, prefetched after first paint and never loaded in `2d` mode.
- Motion preference is orthogonal: reduced motion changes behaviour in every mode, not the mode itself.

## Consequences
- Phones skip the model download and most of the GPU cost.
- Two 3D framings to test and tune, plus a 2D mode; QA covers all three with `?mode=`.
- Playback cannot depend on the R3F frame loop (architecture §4.1).
