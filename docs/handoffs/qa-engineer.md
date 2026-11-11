# Handoff: qa-engineer

## Summary
Round 1 re-test is at the end of this note and in `docs/qa-report.md` section 8 (301 of 311 checks pass; 6 fail, all the design-margin finding BUG-7 and the BUG-4 collapse; 4 skipped).

Wrote the unit and end-to-end suites for every user story and the Phase 6 report in `docs/qa-report.md`. 288 of 297 checks pass (51 of 51 unit; 237 of 246 E2E across Chromium, WebKit, two Pixel 7 viewports and an iPhone 14, with 4 deliberate skips). The 5 failures are three real bugs, listed with owners below. Firefox is installed but cannot start on this host.

## Files changed
- `playwright.config.ts`: five projects (chromium, webkit, mobile-portrait, mobile-landscape, ios-portrait) plus firefox; two web servers (test build on 4390, production on 4391); a per-run facts snapshot; tracing off (it makes the fake-clock loops very slow).
- `package.json` (root file, scripts only, as the task asked): `build:test`, `test:e2e`, `test:e2e:chromium`, `test:e2e:firefox`, `test:e2e:all`, `test:e2e:update`, `test:qa`.
- `tests/unit/facts.test.ts`, `tests/unit/repo.test.ts`: independent fact recomputation (no collector import); licences, diary and script checks.
- `tests/helpers/recompute.ts` (independent routes from architecture 5.7), `flash.ts` (WCAG 2.3.1 detector), `global-setup.ts`.
- `tests/e2e/*.spec.ts` (power, facts, haunt, calm, a11y, greyscale, flash, fallback, mobile, production, story, visual), `fixtures.ts`, `dom-lib.d.ts` (DOM types and typed test hooks, because `tsconfig.node.json` has no DOM library and `npm run build` type-checks `tests/`).
- `tests/e2e/__screenshots__/chromium/visual.spec.ts/*.png`: five first-time baselines (nothing existed before).
- `docs/qa-report.md`, `docs/handoffs/qa-engineer.md`.

## Decisions
- E2E runs against a `vite build --mode test` build (hooks present) and one smoke spec runs against the production build (hooks absent), instead of exposing hooks in production.
- Playwright's fake clock plays the 66 s story in about a second in 2D (paused after load, so only `runFor` moves time). 3D modes, which are slow under SwiftShader, check shorter windows and the scene uniforms.
- The haunt store is pinned with a subscription in 3D tests, because the scheduler rewrites it every frame.
- A run takes one snapshot of the recomputed facts before the builds start and stops with a clear message if HEAD moved during the build; the unit test always recomputes live so that it catches a stale `dist/`.
- Flash steps that replace the screen contents ("cuts") are measured apart from typing, effects and ramps. A cut is one event, not a flash, but design-spec 7.1 limits it to 10 per cent.
- Design-margin (5 per cent) checks are enforced for fake-clock tests and only reported for real-time screencasts, whose sampling varies by a few thousandths.
- Visual baselines are Chromium on macOS with SwiftShader. The 3d-set Calm baseline records the BUG-1 framing and must be regenerated after the fix (intended change).

## Assumptions
- "Persists for the visit" (FR-31) means across a reload in the same tab, so `sessionStorage` is acceptable under NFR-7.
- A warm-up of 1 to 3 s is measured from entering `warming` to entering `playing` (store timestamps).
- Text contrast with the ghost at maximum is estimated as the 99th over the 25th percentile pixel of the screen; 4.5:1 is the target. This is an estimate, not a per-glyph measurement.

## Open questions
- Is a single screen cut of 0.10 to 0.12 relative luminance acceptable, given that it is one event and not a WCAG flash? The design spec says no (ux-ui-designer, tech lead).
- Should the story clock clamp at 100 ms per frame, given that it slows the story below 10 FPS (BUG-5)? (frontend-developer, ux-ui-designer)

## Requests for other agents
- scene-developer: **BUG-1** (major): in the Watch pose the 3D set is clipped, off centre, with an empty strip on the left. Fix the distance and target in `src/scene/cameras/poses.ts` and `SetCameraRig.tsx` so the whole set is framed. Also expose the camera position and knob angles in `window.__SCENE_TEST__` (test builds only) so creep and its limit can be asserted. Then run `npm run test:e2e:update` for `calm-page1-3d-set.png` and record why.
- frontend-developer: **BUG-2** (major): keep Calm across a reload (`sessionStorage`). **BUG-5** (minor): story clock slows under 10 FPS. **BUG-4** (minor, with ux-ui-designer): the 2D warm-up and collapse change a tile by 0.054 to 0.070 per 100 ms, over the 0.05 design margin.
- ux-ui-designer: **BUG-3** (minor): the screen cut from the dense diary page steps a tile by 0.102 (Chromium) and 0.118 (WebKit), over the 0.10 limit; also confirm what design-spec 4.2 means by "the set at 56 per cent" (BUG-1).
- devops-engineer: **BUG-6** (minor): production ships 6 MB of source maps and empty `.gitkeep` files in `dist/`. Decide whether that is intended.
- architect: `npm run typecheck` and `npm run build` type-check `tests/` and `playwright.config.ts` with no DOM library, which is why `tests/e2e/dom-lib.d.ts` exists. Note the new scripts in `package.json` and the facts-snapshot behaviour in `playwright.config.ts`.
- tech lead: this handoff file is itself a fact source (`agents.ids`), so `npm run build` must be rerun after it is committed, or the unit facts test will correctly report a stale `dist/`. Commits made while a long E2E run is under way can make it stop with "HEAD moved during the build"; rerun it. Firefox needs a host where it starts. Real-device FPS and 4G timing (NFR-1, NFR-2) are still unmeasured.

## Round 1 re-test (build 7111d4b)

### Summary
BUG-1, BUG-2, BUG-3 (hard limit) and BUG-5 are fixed and verified; BUG-4 is partly fixed (warm-up yes, collapse still 0.066 per 100 ms against a 0.05 margin); BUG-6 stays open and is deferred to devops in Phase 7. One new minor finding, BUG-7. Counts: unit 51 of 51; E2E 250 pass, 6 fail, 4 skip of 260.

### Files changed in this round
- `tests/e2e/camera.spec.ts` (new): camera framing, creep bounds, Calm and 3d-screen cases, knob cues, through `__SCENE_TEST__.cameraPose()` and `knobAngles()`.
- `tests/e2e/dom-lib.d.ts`: types for the two new hooks.
- `tests/e2e/power.spec.ts`: 3D warm-up now bounded at 4.5 s (the clock uses real time).
- `tests/e2e/flash.spec.ts`: the warm-up and collapse design margin is enforced again.
- `tests/e2e/__screenshots__/chromium/visual.spec.ts/calm-page1-3d-set.png`: regenerated on purpose, because BUG-1 changed the framing. Reason recorded in `docs/qa-report.md` sections 5 and 8. The other four baselines are unchanged and pass.
- `docs/qa-report.md` (section 8 and status tags on each bug), this note.

### Decisions
- Test failures that came from my own tests (azimuth not yet settled, the power knob resting at 40 degrees) were fixed in the tests, not by loosening product checks.
- The design margin stays enforced, so BUG-7 and the BUG-4 collapse stay red until fixed.

### Open questions
- Is a 250 ms fade enough, or should it be about 500 ms to meet the 5 per cent per 100 ms margin? (ux-ui-designer)

### Requests for other agents
- ux-ui-designer and frontend-developer: BUG-7 (minor), fade steps of 0.056 to 0.075 per 100 ms; and the collapse step (BUG-4, 0.066).
- devops-engineer: BUG-6 (deferred, Phase 7).
- tech lead: the 8 earlier unit failures were the stale-`dist/` check, reproduced and confirmed. Run `npm run build` before `npm test`, and again after committing this note (it is a fact source). Firefox still cannot start on this host.
