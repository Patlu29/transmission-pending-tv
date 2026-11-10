# Handoff: performance-optimiser

## Summary
Measured all three modes in headless Chrome (SwiftShader, not a real GPU), fixed the 2D noise overlay repaint (7.7 to about 32 to 37 FPS), added a step-down-only adaptive DPR, turned MSAA off for the flat 3d-screen quad (pixel-identical) and preloaded the teletext font. Draw calls (17 and 2), triangles (11k and 4), idle redraws (0) and download size (1.4 MB raw) were already inside budget. Full figures are in `docs/performance-report.md`. `npm run lint`, `typecheck`, `test` (27 passed) and `build` pass.

## Files changed
- `src/scene/materials/crt2d/crt2d.css`: noise overlay animates `transform` on an oversized `::after` instead of `background-position`. Same look and timing.
- `src/scene/AdaptiveDpr.tsx`: new. Steps DPR down by 25 per cent (floor 1) after two slow 2 s windows below 36 FPS while the loop runs continuously. Never steps up.
- `src/scene/Experience.tsx`: mounts `AdaptiveDpr`; `antialias` only in 3d-set; `key={mode}` on the Canvas so MSAA matches the mode after a mode switch.
- `index.html`: preload link for `fonts/vt323-regular.woff2`.
- `docs/performance-report.md`, `docs/handoffs/performance-optimiser.md`: new.

I did not write `docs/performance.md`, because the task named `docs/performance-report.md`. Tell me if both are wanted.

## Decisions
- Per-run drawing and 30 Hz throttling of the rasteriser were not done: `drawFrame` costs 0.27 ms, the cost is the texture upload, and changing the typing cadence is a product call.
- drei was not replaced: it would save about 18 kB gzip and risk a lighting change in `GreyEnvironment`.
- `AdaptiveDpr` only steps down and ignores gaps over 1.5 s, so a hidden tab, an idle demand loop or one shader compile cannot cause it to fire.
- MSAA off in 3d-screen was accepted only after a pixel comparison showed zero differing pixels (test card, 390 x 844, DPR 2).

## Assumptions
- Mid-range phone target is DPR 2 at about 390 x 844, as in the measurements.
- A hidden tab pauses everything because all animation is `requestAnimationFrame`-driven (read from the code; headless Chrome cannot report a hidden tab).
- `leva` and `r3f-perf` are devDependencies and unused, so nothing leaks into production.

## Open questions
- First-view JS is 380.8 kB gzip against the 350 kB in architecture 6 (within the 500 kB skill budget). Accept it, raise the architecture figure, or fund the drei replacement for about 18 kB? (architect)
- Is a visible sharpness step on weak devices (DPR 2 to 1.5 to 1.125) acceptable as the price of holding frame rate? (ux-ui-designer)

## Requests for other agents
- qa-engineer: measure on a real mid-range laptop and phone (Chrome remote debugging) and confirm the FPS in NFR-1 and the 36 FPS threshold. Add a check that `?mode=3d-screen` still renders with no console errors, since MSAA is now off there.
- technical-artist: delete `drawGhost2D` (unused, 8 ms with text mask) or, if you plan to use it, cache the mask and use a running-sum dilation. Check the 2D noise visually (`crt2d.css` change 1) in Calm and full motion.
- frontend-developer: if a real phone misses 30 FPS during the reveal, cap texture uploads to every second frame while only the reveal changes. This changes the cadence, so agree it with ux-ui-designer first.
- architect: decide the JS budget question above. Also note `npm run facts` rewrites `src/generated/` with a `-dirty` revision when the tree is uncommitted; regenerate after the Tech Lead commits.
- devops-engineer: serve with gzip or brotli (the 380 kB gzip figure assumes it) and long-cache the hashed `assets/`.
