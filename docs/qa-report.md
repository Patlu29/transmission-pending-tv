# QA report

Owner: qa-engineer. Run date: 2026-11-11. Build under test: the working tree on top of commit `fc862fd` (and `ffd0238` for part of the runs; the facts snapshot is described below), revision string `…-dirty` because the QA files were uncommitted.

## 1. Summary

| Suite | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|
| Unit (Vitest): `tests/unit/` | 51 | 51 | 0 | 0 |
| E2E, Chromium (desktop 1440 x 900) | 117 | 114 | 3 | 0 |
| E2E, WebKit (desktop Safari engine) | 105 | 99 | 2 | 4 |
| E2E, mobile portrait (Pixel 7, Chromium) | 8 | 8 | 0 | 0 |
| E2E, mobile landscape (Pixel 7 landscape, Chromium) | 8 | 8 | 0 | 0 |
| E2E, iPhone 14 portrait (WebKit) | 8 | 8 | 0 | 0 |
| E2E total | 246 | 237 | 5 | 4 |
| **Everything** | **297** | **288** | **5** | **4** |

Firefox: **not run**. The browser is installed (Firefox 159, Playwright build 1572) but it exits on start in this environment with "Could not find profile folder", even when launched by hand with an existing profile directory. The project is in `playwright.config.ts` (`npm run test:e2e:firefox`) and should be run on a host where Firefox starts.

The 5 E2E failures are 3 distinct product bugs (BUG-1, BUG-2, BUG-3); each is a test that stays red until the owner fixes the bug. The 4 skips are by design: 2 Chromium-only screencast tests and 2 Tab-order tests that macOS Safari cannot run (it does not Tab to buttons by default).

### Results by area

| Area | Chromium | WebKit | Mobile portrait | Mobile landscape | iPhone 14 |
|---|---|---|---|---|---|
| Power on/off, skip, pause, replay, loading and failure states | 31 pass | 31 pass | | | |
| Facts on the page (`[data-fact]`, painted screen, FR-12) | 10 pass | 10 pass | | | |
| Haunt effects and the 3D scene | 13 pass | 13 pass | | | |
| Calm and reduced motion | 12 pass, 1 fail | 12 pass, 1 fail | | | |
| Keyboard, screen reader, content note, audio | 15 pass | 13 pass, 2 skip | | | |
| Greyscale pixel sampling | 8 pass | 8 pass | | | |
| Flash safety | 6 pass, 1 fail | 4 pass, 1 fail, 2 skip | | | |
| No WebGL fallback | 5 pass | 5 pass | | | |
| Story length and shape | 3 pass | 3 pass | | | |
| Production build (port 4391) | 6 pass | not run (Chromium only) | | | |
| Visual regression | 5 pass, 1 fail | not run (Chromium only) | | | |
| Mobile viewports | | | 8 pass | 8 pass | 8 pass |

Every E2E test also runs an automatic monitor that fails the test on any console error, uncaught page error, failed network request (4xx, 5xx or aborted) or request to another origin. No test failed for that reason, so **there were no console errors, no failed requests and no third-party requests in any state tested**, in either engine (the failure-state tests that deliberately abort the scene chunk or the WebGL context opt out of the monitor).

## 2. How the tests were run and what that limits

| Item | Value |
|---|---|
| Host | macOS (Darwin 27.2), Apple silicon, Node 26.7, Playwright 1.65.0 |
| Chromium | chrome-headless-shell, started with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` |
| WebKit | Playwright WebKit 27.2 (build 2388); WebGL2 was available |
| Servers | `vite build --mode test` into `test-results/build` on port 4390 (test hooks present) and the normal `npm run build` on port 4391 (production, no hooks). Port 4173 is not used |
| Workers | 2, on a machine that another project was also loading (load average 25 to 50) |

Limits that follow from headless, software-rendered runs. Read the numbers in this report with these in mind.

1. **No frame-rate or performance result is valid.** SwiftShader renders 3d-set at 2 to 5 FPS and 3d-screen at about 18 FPS. NFR-1 (60 FPS desktop, 30 FPS phone) is **not tested**; it needs a real laptop and phone (performance-optimiser already asked for this).
2. **The 4G load time** (NFR-2) was measured with DevTools network emulation (9 Mbps, 170 ms) but on a desktop CPU with software WebGL, so the 3D figure is inflated.
3. **The 70 s story is played on Playwright's fake clock, in 2D mode only.** In 3D modes software rendering is too slow to step through 66 s, so 3D tests check shorter windows and the scene's own uniforms. The 2D screen and the 3D screen texture share one frame model and one haunt store, so the story logic is the same, but the shader's own luminance behaviour over the whole story is **not** frame-analysed here (the technical-artist measured the shader separately).
4. **Flash analysis** (US-11) uses 10 Hz samples of the 2D screen (whole frame and every 341 x 256 CSS px tile, relative luminance). The warm-up and collapse use a real-time DevTools screencast. A flash is counted as WCAG 2.3.1 does: a pair of opposing changes of 0.10 or more where the darker state is under 0.80, at most 3 in any second.
5. **The camera and the knobs cannot be observed.** Only the CRT uniforms are exposed (`__SCENE_TEST__.crtUniforms`). Camera creep, the knob turning and the room dimming are verified through the haunt store (what the scene is told) and, for the "camera does not move" cases, by identical screenshots. Whether the 3D camera really moves, and stops with the text visible, is **not verified** (see request to the scene-developer).
6. **Audio output cannot be heard.** US-16 and US-23 are checked only as far as "no audio context before the visitor unmutes" and the hum value ramp.
7. **Tone and originality** (US-4 AC-3, US-19 AC-3, US-3 AC-2) need a human. The automated part (a deny-list of gore and abuse words, no typed digits) passes. I looked at the ghost frame (pale hooded bust, two dark eyes) and the test card: neither resembles a known character or a broadcaster card, but that is one reviewer's look, not a formal check.
8. **Facts snapshot.** The tech lead committed several times during the long runs. `playwright.config.ts` therefore takes one independent recomputation of the facts before the builds start, and `tests/helpers/global-setup.ts` stops the run with a clear message if a served build is from a different commit. `tests/unit/facts.test.ts` always recomputes live, which is how it detects a stale `dist/`.

## 3. Results by user story

Status key: **PASS**, **FAIL** (bug id), **PARTIAL** (what was and was not checked), **NOT AUTOMATED** (needs a human or a device), **NOT BUILT**. Test names start with the story and criterion, so `npx playwright test -g "US-9 AC-2"` finds them. "All" means Chromium and WebKit (and the mobile projects where the test exists).

| Story | Criterion | Result | Evidence |
|---|---|---|---|
| US-1 | AC-1 off set, labelled power, content note, Calm control, intro not started | PASS | `power.spec` AC-1 and AC-3, all three modes |
| US-1 | AC-2 power off: collapse to line, dot, fade; story stops | PASS | 2D: `is-collapsing` then `is-off`, story position frozen. 3D: `uCollapse` runs 0 to 1. The line and dot themselves are not sampled in 3D (software rendering is too slow); the 2D collapse is frame-analysed (BUG-4) |
| US-1 | AC-4 click, tap, Enter, Space; warm-up 1 to 3 s | PASS | 2D warm-up 2.5 s on the fake clock; 3D checked at least 1 s and by the constants (`WARMUP_MS` + `CARD_HOLD_MS` = 2.5 s); tap on mobile |
| US-1 | AC-5 loading message with progress, power disabled until ready | PASS | scene chunk delayed 2.5 s: `aria-disabled`, "Tuning in, N%" |
| US-1 | AC-6 asset failure: text error, Retry, 2D offered | PASS | chunk aborted: alert, Retry recovers, "Use plain version" gives 2D |
| US-2 | AC-1 scanlines, noise, glow, vignette, curvature visible | PARTIAL | noise running (`uTime` advances) and frozen in Calm checked; five screenshot baselines reviewed by eye. No automated pixel test for scanlines or curvature |
| US-2 | AC-2 R, G, B within 2 levels | PASS | every pixel of start, warm-up, story, diary, collapse and Calm screenshots in 2d, 3d-screen and 3d-set, ghost at maximum, mobile, and the favicon (source colours and rendered pixels) |
| US-2 | AC-3 teletext typeface and licence | PASS | `tests/unit/repo.test.ts`: VT323 in tokens and `fonts.css`, OFL text present, every asset named in its `LICENCES.md` |
| US-2 | AC-4 phone portrait readable | PASS | grid glyph size at least 16 CSS px on Pixel 7 portrait, landscape and iPhone 14 |
| US-3 | AC-1 test card while the TV is on and idle | PASS | card canvas and `crt2d--idle` during warm-up (the card is not shown at any other time) |
| US-3 | AC-2 no broadcaster marks | NOT AUTOMATED | looked at one warm-up frame |
| US-3 | AC-3 static under reduced motion | PASS | noise animation is `none` after `prefers-reduced-motion` |
| US-4 | AC-1 text appears line by line | PASS | characters reveal progressively; first screen and page order checked |
| US-4 | AC-2 45 to 90 s with beginning, middle and end | PASS | 66.1 s (Chromium) and 65.1 s (WebKit) measured on the fake clock; 70.6 s from the estimator (agree within 6 s); first page is "signal", last is "settle" |
| US-4 | AC-3 mainly creepy, no gore or offence | PARTIAL | deny-list check passes; tone needs a human |
| US-4 | AC-4 no jump scare (nothing within 300 ms) | PASS | no haunt value moves more than 0.1 in 300 ms; each stays inside its rate limit over the whole story |
| US-4 | AC-5 Replay and the page index at the end | PASS | `power.spec` end state |
| US-5 | AC-1 facts from git, package.json and docs, none typed by hand | PASS | the unit test recomputes by other routes; no digit in hand-written copy outside the allow-list |
| US-5 | AC-2 unresolved placeholder fails the build | NOT AUTOMATED | a build-time negative test; the architect verified it with scratch clones |
| US-5 | AC-3 commit count, first-commit date, roles, phases, stack with versions | PASS | `facts.spec` (transcript, every mode) and the painted-screen test (every fact reaches the 2D screen) |
| US-5 | AC-4 "as of commit <hash>" | PASS | line pair checked in `facts.test.ts` and on the page |
| US-5 | AC-5 `git rev-list --count <hash>` equals the count | PASS | third independent route in `facts.test.ts` |
| US-6 | AC-1 recomputed facts equal the rendered page text | PASS | 17 unit tests plus 10 E2E per engine |
| US-6 | AC-2 changed versions without rebuilding fail the tests | PASS | meta test: a tampered count, version, hash and role list are all flagged; the stale-build check (commit hash) fired for real several times during this work |
| US-6 | AC-3 digit lint (Should) | PASS | unit scan of the generated copy (the lint itself is build-time) |
| US-7 | AC-1 index lists commit subjects in git order | PASS | first screen starts at 101 with the first commit's subject |
| US-7 | AC-2 typing a page number | PASS | "102" opens the second commit |
| US-7 | AC-3 touch: next and previous | PASS | tap on mobile, click in 2D |
| US-7 | AC-4 last-page indicator | PASS | "n/n" reached by paging |
| US-8 | AC-1 Skip within 500 ms, final page shown | PASS | click-to-store latency under 500 ms in all modes; diary text painted within 500 ms in 2D |
| US-8 | AC-2 Replay restarts at the first line | PASS | page 0, line 0 |
| US-8 | AC-3 keyboard reachable, logical order, visible focus, text labels | PASS | Chromium Tab cycle (stage, Calm switch, Power, Calm, Sound, Read full text), outline or ring on every button. WebKit: skipped (macOS Safari does not Tab to buttons) |
| US-8 | AC-4 touch Skip | PASS | `mobile.spec`, three devices |
| US-9 | AC-1 Calm stops haunt, readable story and facts | PASS | whole story under Calm: haunt store all zero at every step, pages whole, manual advance, facts present. Mid-story switch: zero within one frame. 3D: uniforms zero (`uGhost`, `uRoll`, `uHauntVignette`) |
| US-9 | AC-2 Calm persists on replay or reload | **FAIL (BUG-2)** | survives Replay; lost on reload (Chromium and WebKit) |
| US-9 | AC-3 reduced motion turns Calm on by default | PASS | switch reads "on (system setting)" and is disabled |
| US-9 | AC-4 no warm-up, camera, roll or jitter under reduced motion | PASS | no `is-warming`; haunt store zero through the whole story |
| US-9 | AC-5 pages by control or slow timer; static noise | PASS | no auto-advance by default; opt-in auto-advance waits at least 8 s; noise frozen (`uTime`, CSS) |
| US-9 | AC-6 OS setting changes mid-visit without reload | PASS | `emulateMedia` on and off, same document |
| US-10 | AC-1 full text as DOM text in reading order | PASS | transcript lines equal the built intro, in order, in every mode |
| US-10 | AC-2 canvas hidden from assistive tech | PASS | scene host and canvas are `aria-hidden`; no canvas or image in the accessibility tree |
| US-10 | AC-3 no announcement spam; "read full text" | PASS | one polite live region; announcements during the whole story are short and none contains story text; the dialog is labelled, traps focus, closes on Escape and returns focus |
| US-11 | AC-1 at most 3 flashes in any second | PASS | worst case 0 flashes per second in every window: ghost at maximum, roll, page changes, skip, replay, warm-up, collapse |
| US-11 | AC-2 no large-area flash over the thresholds | PASS under WCAG, **FAIL against the design-spec limit (BUG-3)** | no opposing pairs anywhere. One single screen cut steps a 341 x 256 tile by 0.102 (Chromium) and 0.118 (WebKit); the design spec (7.1 rule 2) says under 0.10 |
| US-11 | AC-3 start screen warns about flicker and the reduced-motion option | PASS | note text checked |
| US-12 | AC-1 WebGL disabled: notice and 2D with power, intro, skip, replay | PASS | context requests made to fail; also forced 3d-set without WebGL |
| US-12 | AC-2 context lost mid-intro: 2D at the current line | PASS | real `WEBGL_lose_context`; page index kept |
| US-12 | AC-3 same facts in 2D | PASS | `[data-fact]` equals the recomputed values |
| US-13 | AC-1 power control interactive within 3 s on 4G | PARTIAL | 2D: 0.52 s. 3d-screen: 4.8 s, but on a desktop CPU with software WebGL, so not a verdict. Needs a real phone |
| US-13 | AC-2 60 FPS desktop, 30 FPS mobile | NOT AUTOMATED | needs real devices |
| US-13 | AC-3 first view under 5 MB | PASS | 3d-set 1,385 kB raw, 2D 318 kB raw |
| US-13 | AC-4 hidden tab pauses (Should) | NOT AUTOMATED | headless Chromium never reports a hidden tab (performance-optimiser read the code) |
| US-14 | AC-1 same-origin requests only | PASS | every test, plus the production run |
| US-14 | AC-2 no cookies | PASS | no cookies, `document.cookie` empty, local and session storage empty |
| US-14 | AC-3 static files only | PASS | `dist/` extensions checked. Note: it also holds source maps and five empty `.gitkeep` files (BUG-6) |
| US-15 | AC-1 one commit per step, imperative messages | PARTIAL | every subject non-empty, 8 to 100 characters, no WIP or fixup; whether each is "imperative" is a review judgement |
| US-15 | AC-2 no squashing or rewriting | PARTIAL | history is linear with no merges; rewriting cannot be proved from the repository alone |
| US-15 | AC-3 every asset has a recorded source | PASS | unit test |
| US-16 | AC-1 no audio on load | PASS | no `AudioContext` is constructed before an unmute |
| US-16 | AC-2 unmute starts audio, visible control mutes | PASS (control and context) | "Sound off" to "Sound on" creates one context and back; the sound itself is not heard |
| US-16 | AC-3 reduced motion does not change the choice | NOT AUTOMATED | |
| US-17 | channel-change burst | NOT BUILT | Could; the frontend handoff says it was not built |
| US-18 | AC-1 tremble, rewrite and bleed at least once | PASS | all three seen in the store and on the painted 2D screen (moving glyphs, streaks) |
| US-18 | AC-2 settled text equals the resolved text | PASS | on every sampled step with no effect running, the screen holds exactly the line, with no residue; a rewrite visibly differs while it runs |
| US-18 | AC-3 DOM unchanged during effects; facts in `data-fact` spans | PASS | transcript text identical in every sample; facts on the line being rewritten stay true |
| US-18 | AC-4 no effects under Calm or reduced motion | PASS | see US-9 |
| US-19 | AC-1 figure forms over at least 3 s, mid-story | PASS | 0.05 to 0.30 visibility takes at least 3 s; clearly visible between 30 and 90 per cent of the story |
| US-19 | AC-2 drifts slowly, no sudden jump | PASS | `ghost` and `ghostNear` change at most 0.1 in 300 ms |
| US-19 | AC-3 original design | NOT AUTOMATED | looked at one frame |
| US-19 | AC-4 flash limits | PASS | ghost at 0.76: no flashes; steps 0.004 outside screen cuts; text contrast 9.3:1 (Chromium) and 9.5:1 (WebKit), estimated as the 99th over the 25th percentile pixel of the screen (the requirement is 4.5:1) |
| US-19 | AC-5 Calm: figure absent | PASS | `ghost` is 0 under Calm |
| US-20 | AC-1 at least three of knob, roll, dim | PARTIAL | store shows both knob cues, a roll and the dim reaching 0.5; the knob turning on screen is not observable |
| US-20 | AC-2 roll takes at least 1 s and passes flash limits | PASS | roll flag lasts 2.4 s; largest step 0.040 (Chromium), 0.047 (WebKit) |
| US-20 | AC-3 mobile: roll and dim still run, no knobs | PASS | on 3d-screen the roll, ghost and edge vignette uniforms follow the store; there is no 3D set |
| US-20 | AC-4 none under Calm | PASS | see US-9 |
| US-21 | AC-1 camera moves closer slowly | PARTIAL | `creep` rises at most 0.06 per second to 0.8; the 3D camera itself is not observable |
| US-21 | AC-2 stops at the limit with text visible | NOT AUTOMATED | no camera hook; see BUG-1 note on framing |
| US-21 | AC-3 mobile: camera does not move | PASS | 3d-screen frames identical with creep at 0 and at 0.2; no Reset view key |
| US-21 | AC-4 none under Calm or reduced motion | PASS | `creep` is 0 |
| US-22 | AC-1 start note: mild horror, no jump scares | PASS | on desktop and on mobile without scrolling |
| US-22 | AC-2 Calm can be turned on before power-on | PASS | |
| US-22 | AC-3 note and Calm control announced | PASS | `aria-describedby` on Power and Calm; accessibility tree checked |
| US-23 | slow-building audio | NOT AUTOMATED | the `hum` value ramps within its rate limit (see US-4 AC-4); the sound is not heard |

## 4. Bugs

Severity: **major** breaks a Must acceptance criterion or an obvious visual defect; **minor** is a limit missed by a small margin, a risk, or housekeeping.

### BUG-1: the 3D set is framed too tightly in the Watch pose (major) - FIXED in round 1, verified
- Owner: **scene-developer** (camera distance and target). Spec question for ux-ui-designer (below).
- Reproduces: yes, confirming the tech lead's observation.
- Steps: open `/?mode=3d-set` at 1440 x 900 (or 1024 x 600), press Switch on, wait 3 s, take a screenshot. Same after the dolly in Calm.
- Expected: the set at about 56 per cent of the viewport width, centred (design-spec 4.2), the whole TV including the CH, VOL and POWER knobs inside the frame.
- Actual: the camera targets the centre of the glass. The glass is 53 per cent of the width, which matches the spec formula `Wscreen = min(0.56 x vw, 0.82 x vh)`, but the body and knob panel extend about 1.6 times further, to the right of that centre. The knob panel is cut off at the right edge, the set sits right of centre, and the left 260 px (a quarter of the frame) is an empty dark wall strip with a hard vertical edge. At 1024 x 600 the same. The idle pose (before Power) frames the whole set correctly. The dock buttons also sit over the lower bezel.
- Evidence: right-edge strip 99th-percentile luminance 0.292 against 0.024 on the left (a framed set gives under 0.05 on both); `tests/e2e/visual.spec.ts` test "3d-set framing"; baseline `tests/e2e/__screenshots__/chromium/visual.spec.ts/calm-page1-3d-set.png` shows the defect.
- Cause (from the code and spec): `watchDistance()` in `src/scene/cameras/poses.ts` sizes the distance from the glass width, and the camera target is the glass centre, so a set that is not symmetric about its glass cannot fit. Either size D from the whole set's width and aim at the set's centre, or shift the target horizontally. The wall plane also ends inside the frame.
- Camera creep: it multiplies the same distance by up to `1 - 0.22`, about the same centre, so it makes the clipping worse. It could not be measured (no camera hook).
- Note: **the baseline `calm-page1-3d-set.png` records the defective framing.** Regenerate it with `npm run test:e2e:update` after the fix, and say so here.
- Spec note for ux-ui-designer: 4.2 defines D by the glass width. If the intent is "the set fills 56 per cent", the formula needs the set's width.

### BUG-2: Calm mode is not kept across a reload (major) - FIXED in round 1, verified
- Owner: **frontend-developer**.
- Steps: open `/?mode=2d`, press "Calm mode: off" on the start screen so it reads "on", reload the page.
- Expected: Calm is still on (US-9 AC-2, FR-31: "persists for the visit"). A visitor who chose Calm because of photosensitivity would otherwise meet the full effects again after a reload.
- Actual: Calm is off after reload, in Chromium and WebKit. Replay keeps it. `calmSwitch` lives only in the zustand store; nothing in `src/` uses `sessionStorage` or `localStorage`.
- Suggestion: `sessionStorage` (per tab, cleared when the tab closes, not a cookie, no personal data), which fits NFR-7 and "the visit".
- Evidence: test "US-9 AC-2 and FR-31: Calm persists across a reload within the visit" (`calm.spec.ts`).

### BUG-3: one screen cut steps a large area by more than 10 per cent (minor) - FIXED in round 1 (hard limit); see BUG-7 for the design margin
- Owner: **ux-ui-designer** (page layout and copy), with **frontend-developer** (how screens are cut).
- Steps: play the story in 2D (full motion) to the diary page, where the screen holds three highlighted fact blocks. Sample the screen at 10 Hz and compare each 341 x 256 CSS px tile as the page moves on to its next screen.
- Expected: no large-area step of 0.10 or more in relative luminance (design-spec 7.1 rule 2); the design margin is 0.05.
- Actual: the step from the dense diary screen to the next, nearly empty, screen is 0.1018 (Chromium) and 0.1177 (WebKit). Everything else is far inside the limit: typing, effects and ramps change a tile by at most 0.006.
- Severity reasoning: WCAG 2.3.1 counts flashes (opposing pairs), and this is a single event every 10 s or more, so US-11 is met under WCAG. It misses the project's own stricter hard limit by 0.002 to 0.018.
- Fix options: cross-fade the cut over two or three steps, reduce the area of the inverse fact blocks on one screen, or split the diary page so fewer blocks vanish at once.
- Evidence: `flash.spec.ts` "a page or screen cut changes a 341 x 256 tile by less than 10 per cent" (fails). The matching "ghost at maximum" test passes, which shows the ghost itself is not the cause.

### BUG-4: the 2D warm-up and collapse exceed the design margin (minor) - PARTLY FIXED: warm-up fixed, 2D collapse still over (open after round 2)
- Owner: **frontend-developer** (`.screen2d.is-warming` and `.is-collapsing` in `src/ui/ui.css`) with ux-ui-designer.
- Steps: switch on, then off, in 2D with full motion; capture the screen in real time (DevTools screencast) and compare tiles per 100 ms.
- Expected: large-area swings under 0.05 per 100 ms (design margin) and always under 0.10.
- Actual: 0.054 to 0.070 per 100 ms across runs, so over the margin and well inside the 0.10 limit. No flashes (0 per second). The first step of the warm-up (0.062) appears to be the start overlay's text and Calm switch disappearing as the picture opens; the test classes it as a UI cut.
- Not covered: the 3D shader's own warm-up and collapse (not frame-analysed; see section 2).
- The test reports these numbers and enforces only the hard 0.10 limit, because screencast sampling moves them by a few thousandths between runs.

### BUG-5: the story clock slows when the frame rate is under 10 FPS (minor, risk) - FIXED in round 1, verified
- Owner: **frontend-developer** (`useIntroClock`), with **performance-optimiser**.
- Steps: run `?mode=3d-set` on software WebGL (2 to 5 FPS) and time the warm-up.
- Expected: 2.5 s (FR-5: 1 to 3 s).
- Actual: the warm-up took 7.4 s in 3d-screen and 12.1 s in 3d-set, because each frame advances the clock by at most 100 ms (a deliberate clamp so that it does not jump after a hidden tab). Below 10 FPS the whole story slows in proportion, so on a weak device FR-8 (45 to 90 s) could be exceeded. `AdaptiveDpr` only steps down after two slow windows. This is a risk, not a failure on a real device; it could not be checked without one.
- Suggestion: raise the clamp (for example 250 ms) or let the clock use wall time and clamp only on a hidden-tab resume.

### BUG-6: production output ships source maps and empty placeholder files (minor, housekeeping) - DEFERRED to devops-engineer, Phase 7
- Owner: **devops-engineer** (hosting and build output); the Vite setting itself is the architect's.
- `dist/assets` contains three `.map` files (6.0 MB in total, `sourcemap: true`) and `dist/{fonts,textures,models,env,audio}/.gitkeep`. The maps are not part of the first view but publish the source. Decide whether that is intended; drop the `.gitkeep` files from the build.

### Observations (not bugs)
- Console warnings, not errors: `THREE.Clock` is deprecated (comes from R3F 9.8.2, known), and SwiftShader prints "GPU stall due to ReadPixels". Neither appears as an error.
- WebKit on macOS does not Tab to buttons by default. That is browser behaviour, but it means keyboard-only Safari users need the system option or Option+Tab; the shortcut keys on the stage help.
- The two Calm controls (start screen switch and dock key) both appear on the start screen; they stay in sync.
- The 3D idle pose and the start screens look right; only the Watch pose is mis-framed.

## 5. Visual regression baselines

These are the first baselines for this project (none existed before), created on 2026-11-11 with `--update-snapshots=missing`. They are Chromium on macOS with SwiftShader, so they are platform specific; do not compare them with another OS.

| Baseline | State | Threshold |
|---|---|---|
| `start-2d.png` | start screen, 2D, 1280 x 800, Calm | 0.5 per cent of pixels |
| `start-3d-set.png` | start screen, 3d-set, 1440 x 900, Calm | 2 per cent |
| `start-3d-screen-portrait.png` | start screen, 3d-screen, 390 x 844, Calm | 2 per cent |
| `calm-page1-2d.png` | Calm story page 1, 2D (header row masked: it carries the revision) | 0.5 per cent |
| `calm-page1-3d-set.png` | Calm story page 1, 3d-set (header revision under the threshold) | 3 per cent. **Regenerated in round 1** (see section 8): it now shows the whole set framed. The first version recorded the BUG-1 framing |

The thresholds are loose for 3D (SwiftShader, small text that carries the revision) and strict for 2D. Regenerate only for an intended visual change: `npm run test:e2e:update`, then record the reason in this section.

## 6. Not tested, and requests

- Real-device frame rate and load time (NFR-1, NFR-2) and a hidden tab (US-13 AC-2 and AC-4).
- Firefox (cannot start on this host) and Edge.
- The 3D camera and knobs. **scene-developer:** add the camera's position and distance to `window.__SCENE_TEST__` in test builds, and the knob angles, so creep, its limit and the knob cues can be asserted.
- US-5 AC-2 (an unresolved placeholder fails the build) as an automated negative test. It needs a throw-away copy of the repository; the architect checked it by hand.
- Tone, originality of the ghost and the test card, and whether the commit subjects are imperative: human review.
- Lighthouse accessibility (NFR-11) and contrast of the 2D UI against the screen (NFR-6) were not measured.

## 7. How to run

| Command | Does |
|---|---|
| `npm run build && npm test` | unit tests (51). `facts.test.ts` compares `dist/facts.json` with the repository, so build first; after any new commit or handoff file it fails until you rebuild, by design |
| `npm run test:e2e` | builds a test build and the production build, starts both servers (ports 4390 and 4391), runs Chromium, WebKit and the three mobile projects (about 20 minutes with 2 workers) |
| `npm run test:e2e:chromium` | Chromium and the two Pixel 7 projects |
| `npm run test:e2e:firefox` | Firefox, on a host where it starts |
| `npm run test:e2e:update` | regenerate the visual baselines (intended changes only) |
| `npm run test:qa` | unit tests, then E2E |

Playwright's HTML report is written to `test-results/report` and the JSON to `test-results/results.json`. Test hooks used: `window.__APP_TEST__` (the four stores, including `useHauntStore`) and `window.__SCENE_TEST__.crtUniforms`, present only in dev and `--mode test` builds; the production spec asserts they are absent from the production build.

## 8. Round 1 re-test

Build: HEAD `7111d4b` plus the uncommitted QA files (revision `7111d4b-dirty`). New tests: `tests/e2e/camera.spec.ts` (7 tests, using the new `__SCENE_TEST__.cameraPose()` and `knobAngles()` hooks). Changed tests: the warm-up bound in 3D is now 4.5 s (was unbounded), and the design-margin checks for the warm-up and collapse are enforced rather than only reported.

### Counts

| Suite | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|
| Unit (Vitest) | 51 | 51 | 0 | 0 |
| E2E Chromium | 124 | 120 | 4 | 0 |
| E2E WebKit | 112 | 106 | 2 | 4 |
| E2E Pixel 7 portrait | 8 | 8 | 0 | 0 |
| E2E Pixel 7 landscape | 8 | 8 | 0 | 0 |
| E2E iPhone 14 portrait | 8 | 8 | 0 | 0 |
| **Total** | **311** | **301** | **6** | **4** |

Before round 1 the total was 297 checks, 288 pass, 5 fail. All 6 failures are the same finding, BUG-7 and BUG-4 (collapse), described below; the two functional bugs (BUG-1 and BUG-2) now pass in both engines. The full run found 11 failures; 5 were fixed in my own tests (an azimuth that had not yet settled, and the power knob legitimately resting at 40 degrees while the set is on), and the camera spec and the visual spec were then re-run in full (14 of 14 and 6 of 6 pass).

### Status of each bug

| Bug | Status | Evidence |
|---|---|---|
| BUG-1 3d-set framing | **Fixed** | `cameraPose()`: Watch is 1.00 x D, Idle is further back, all poses aim at the same set centre. Edge strips (99th percentile luminance) left 0.033, right 0.021 (limit 0.05; was right 0.292). New baseline `calm-page1-3d-set.png` shows the whole TV with CH, VOL and POWER inside the frame. Creep: camera distance falls only slowly (follower within 0.04 per second, no jump) and never below 0.78 x D; no creep under Calm; 3d-screen has no camera rig. Knobs: a channel cue turns the knob 25 degrees and leaves it, the other knobs do not move, power-off returns them to rest, and Calm never turns them |
| BUG-2 Calm reload | **Fixed** | the reload test passes in Chromium and WebKit |
| BUG-3 screen cut step | **Fixed (hard limit)** | the screen-cut step is now 0.003 to 0.005 (was 0.102 and 0.118). The fade itself is the subject of BUG-7 |
| BUG-4 warm-up and collapse | **Partly fixed** | warm-up largest step 0.028 per 100 ms (was 0.062): fixed. Collapse 0.066 (was 0.054 to 0.070): still over the 0.05 design margin, under the 0.10 limit, no flashes. Kept open |
| BUG-5 clock | **Fixed** | the 3D warm-up now passes the 4.5 s bound (it took 7.4 s and 12.1 s on the same software renderer before) |
| BUG-6 source maps, `.gitkeep` | **Deferred** | devops-engineer, Phase 7 |

### New findings

**BUG-7: the 250 ms screen fades still step a large area by more than the 5 per cent design margin (minor).**
- Owner: **ux-ui-designer** (fade length), **frontend-developer** (implementation).
- Steps: play the story in 2D with full motion; compare 341 x 256 tiles per 100 ms from the ghost-at-maximum window onwards (also around Replay).
- Expected: under 0.05 per 100 ms (design-spec 7.1 rule 2 margin).
- Actual: 0.063 (Chromium) and 0.075 (WebKit) in the diary and glass window, and 0.056 at the start of Replay. All are far under the 0.10 hard limit and there are no flashes (0 per second), so US-11 holds. The fade spreads a 0.10 to 0.12 change over 250 ms, which still puts 0.06 to 0.075 in one 100 ms sample. A fade of about 500 ms would meet the margin.
- Evidence: `flash.spec.ts`, the ghost-at-maximum test, the page-cut test, the "page changes, Skip and Replay" test (and the collapse test for BUG-4). All six failures in the table above are these soft design-margin checks.

### The earlier "8 unit failures that went away on a re-run"

Confirmed as the stale-build check. I reproduced it: with `dist/` built at an older commit and HEAD at `7111d4b`, `tests/unit/facts.test.ts` fails 8 of its 17 tests (build commit, commit count, diary commits, co-author count, revision and the whole-file comparison all differ), and after `npm run build` all 51 unit tests pass. A commit landing mid-run, or a handoff file added after the last build, causes exactly this. It is the test doing its job, not flakiness; run `npm run build` before `npm test`.

## 9. Round 2 re-test (final)

Build: HEAD `3142423` plus the uncommitted QA files. `npm run build` was run before the unit suite (51 of 51 pass). The full E2E suite ran on Chromium, WebKit, Pixel 7 portrait and landscape, and iPhone 14.

### Final counts

| Suite | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|
| Unit (Vitest) | 51 | 51 | 0 | 0 |
| E2E Chromium | 124 | 122 | 2 | 0 |
| E2E WebKit | 112 | 108 | 0 | 4 |
| E2E Pixel 7 portrait | 8 | 8 | 0 | 0 |
| E2E Pixel 7 landscape | 8 | 8 | 0 | 0 |
| E2E iPhone 14 portrait | 8 | 8 | 0 | 0 |
| **Total** | **311** | **305** | **2** | **4** |

(Round 1: 301 pass, 6 fail. First round: 288 of 297.) The 4 skips are unchanged (2 Chromium-only screencast tests and 2 Tab-order tests that macOS Safari cannot run). In the full WebKit run 8 unrelated tests timed out at 180 s during a long stall (the run took 1.1 hours against the usual 20 minutes, with the machine shared with another project). Re-running those tests alone took 47 seconds and all passed, so I count them as passes; the earlier WebKit runs had none of these timeouts either.

### Final status of every bug

| Bug | Final status | Evidence |
|---|---|---|
| BUG-1 3d-set framing | **Fixed** (round 1) | still passes: camera spec 14 of 14, framing edge strips, baseline |
| BUG-2 Calm reload | **Fixed** (round 1) | still passes |
| BUG-3 screen cut step | **Fixed** (round 1) | screen-cut steps 0.003 |
| BUG-4 warm-up and collapse | **Warm-up fixed; 2D collapse still open** | warm-up largest step 0.041 (was 0.062). The 2D collapse is 0.070 per 100 ms (Chromium) with the new 700 ms length: no change from 0.066 to 0.070 before, so lengthening it did not help. Under the 0.10 limit, no flashes. The 3D collapse (450 ms, shader) was not frame-analysed: software WebGL cannot deliver 10 frames per second to sample |
| BUG-5 clock | **Fixed** (round 1) | still passes |
| BUG-6 source maps, `.gitkeep` | **Deferred** | devops-engineer, Phase 7 |
| BUG-7 fade steps | **Fixed for the story; Replay start 0.0035 over the margin** | diary and glass window: 0.039 (Chromium), 0.046 (WebKit), was 0.063 and 0.075. Page changes (makers and staff) 0.012 to 0.018. Skip to the diary 0.028 and 0.012. Replay start: 0.0535 on Chromium (limit 0.05), 0.0265 on WebKit |

### Still open

| Id | Severity | Owner | What is left |
|---|---|---|---|
| BUG-4 (residual) | minor | **frontend-developer** (the 2D `crt-off` animation in `src/ui/ui.css`), with **ux-ui-designer** | 2D power-off collapse steps a 341 x 256 tile by 0.070 per 100 ms against the 0.05 design margin (hard limit 0.10 and the flash limit are met). Lengthening it to 700 ms made no measurable difference, so the step is probably the start overlay returning as the set goes off, not the shrinking picture: fade the overlay in after the collapse. Test: `flash.spec.ts` "the power-off collapse does not flash" (Chromium) |
| BUG-7 (residual) | minor | **frontend-developer** | the Replay start (black frame, then the first page) steps a tile by 0.0535 on Chromium, 0.0035 over the margin; WebKit is 0.0265. Test: `flash.spec.ts` "page changes, Skip and Replay" (Chromium) |
| BUG-6 | minor, deferred | **devops-engineer** | 6 MB of source maps and empty `.gitkeep` files in `dist/` |
| 3D collapse | not analysed | **technical-artist** | the shader collapse (450 ms) could not be frame-analysed under software rendering; needs a real GPU or a deterministic shader time hook |

No major bugs are open. Everything the headless environment cannot show is unchanged from section 6: real-device frame rate and 4G time, Firefox (cannot start on this host), human review of tone and originality, and hearing the audio.
