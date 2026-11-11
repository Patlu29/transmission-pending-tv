# Handoff: performance-optimiser

## Summary
v2 pass on branch `v2` (base 83fd9f6). Measured the nine rooms in headless Chrome (SwiftShader, not a real GPU), found and fixed an environment-map leak on every TV room re-entry, moved room ambient motion to a 30 Hz demand ticker, and cut first-view JS by 17.8 kB gzip. Full figures are in `docs/performance-report.md` (v2 section). `npm run build`, `lint`, `typecheck` and `test` (144 passed) pass. Nothing is committed.

## Files changed
- `src/scene/materials/GreyEnvironment.tsx`: rebuilt on `PMREMGenerator.fromScene` (no drei `Environment`); disposes on unmount. Fixes a leak of 36 framebuffers and a texture per TV room entry; first-view JS 405.6 to 387.8 kB gzip. Screenshot differs by at most 2 of 255. The retheme will replace it; keep the dispose pattern.
- `src/scene/AmbientTicker.tsx` (new): 30 Hz `invalidate()` loop on rAF while a room is animating; off under Calm.
- `src/scene/Experience.tsx`: `frameloop="always"` only for warm-up and the full-motion intro; rooms and live channels run on the ticker; mounts `AmbientTicker`; `AdaptiveDpr ambient`.
- `src/scene/AdaptiveDpr.tsx`: `ambient` prop (24 fps floor), and sets `<html data-dpr-stepped="true">` on the first step down.
- `src/scene/materials/rooms/roomParts.tsx`: puff shader exact early-out and trimmed quad (8 of 9 rooms pixel-identical in Calm, mountain sky 3,110 pixels off by 1 level).
- `docs/performance-report.md` (v2 section appended), `docs/handoffs/performance-optimiser.md`.

## Decisions
- 30 Hz for ambient-only room motion: nothing in the rooms moves faster than 1.5 Hz or 7 px/s, and phones target 30 FPS. Camera tweens and the intro keep 60 Hz. Recorded as a trade-off below.
- Reverted a sky-dome aurora skip that gave no measurable gain, to leave the artist's shader alone.
- Did not touch `src/content`, `src/styles`, the player layer or any ancestor's style.
- Did not optimise the 1970s TV parts (TvBody, CRT shader), per the retheme decision.

## Assumptions
- Rooms may run at 30 Hz in watch pose; the YouTube player is unaffected because it is plain DOM above the canvas.
- A hidden tab pauses all rendering because everything is on `requestAnimationFrame` (code reading; headless cannot report `hidden`).

## Open questions
- Is 30 Hz ambient motion acceptable on desktop, where the NFR says 60 FPS during the intro? (ux-ui-designer, product-manager). Easy to raise: change `INTERVAL_MS` in `AmbientTicker.tsx` or revert to `always`.
- First-view JS is 387.8 kB gzip against 350 kB in architecture 6 (under the 500 kB skill budget). Accept or raise? (architect)
- The CSS grayscale filter costs 19 to 36 per cent of the frame rate in software compositing. Acceptable pending a real-device measurement? (ux-ui-designer)

## Requests for other agents
- frontend-developer: for ADR 0012, use `html[data-dpr-stepped='true']` (set by `AdaptiveDpr`) together with `prefers-reduced-transparency` for `data-glass="solid"`. Frosted `backdrop-filter` only on small chrome at 12 px or less, no nesting; large panels tinted with no live blur. Never on the player or its ancestors, and nothing frosted, glowing or shadowed within 24 px of the player rect.
- scene-developer: in the holo TV room use `renderer.compileAsync` (or precompile) for the new material; re-entry takes about 1 s, nearly all shader compile. Dispose every PMREM target and cube target you create (three never frees the PMREM of a render-target cube).
- technical-artist: Mountain sky and space deck are the heaviest rooms; check them on a real phone. The sky dome is the largest single draw; the cloud rows are about 3 ms each in software.
- qa-engineer: add a disposal check (WebGL object counts flat across a lap through all rooms, as in my probe), a Calm idle check (0 draws in 4 s), and real-device frame rates. Hidden-tab behaviour needs a real browser.
- architect: decide the JS budget; confirm the room budgets in the registry are checked in CI (all rooms are 1.7 to 4.3 kB gzip, far under 60 kB).
