# Handoff: ux-ui-designer

## Summary
Phase 3 delivered the design spec, greyscale tokens, a favicon and the font plan. After the user's scope change (2026-11-10) the intro became a horror ghost story, "Haunted TV tells its build", narrated by a nameless Occupant. The spec gained section 16 (story beats, cue mechanism, four animation types, flash safety, Calm), and sections 1, 2, 6, 7, 10, 14 and 15 were revised. `src/content/intro.tmpl` is rewritten, a sidecar `src/content/intro.cues` is new, and VT323 replaces Bedstead. I have no shell: `npm run facts` and `CI=true npm run facts` have not been run on the new template.

## Files changed
- docs/design-spec.md: new section 16; revised sections 1, 2 (E1 content note, E2, E3), 3.5 and 9.1 (Calm key, Power toggles), 6.3 to 6.6, 7.6, 10.2, 13, 14, 15
- src/content/intro.tmpl: ghost story, nine pages, no hand-typed digits, no `!draft`
- src/content/intro.cues: new sidecar with animation cues (grammar in design-spec 16.3)
- src/styles/tokens.css: `--font-teletext` now VT323; new haunting ceiling tokens (`--haunt-*`, `--duration-haunt-text`)
- src/styles/fonts.css: Bedstead face removed, VT323 face added (`/fonts/vt323-regular.woff2`)
- public/favicon.svg: unchanged from Phase 3
- public/fonts/LICENCES.md: NOT edited by me (technical-artist is updating it for VT323; see requests)
- docs/handoffs/ux-ui-designer.md: this note

## Decisions
- 3d-set only for `(min-width: 1024px) and (min-height: 600px) and (min-aspect-ratio: 5/4) and (hover: hover) and (pointer: fine)`; everything else is 3d-screen.
- Teletext columns from the safe screen width W: 40 cols at 384 px or more, 32 at 320 to 383, 26 at 250 to 319, 20 at 192 to 249. Glyphs stay at least 16 CSS px. With VT323 the grid is unchanged and the draw size is derived from `measureText` (spec section 14).
- Facts are inverse white blocks; the story's second page tells the visitor so. Haunted text may never rewrite a fact segment, so a false fact is never shown.
- Pause control and focus-scoped shortcuts stay (WCAG 2.2.2, 2.1.4).
- Story timing: reveal 60 cps, line gap 450 ms, page hold 1200 ms plus 10 ms per character, end hold 3000 ms. About 78 s plus up to 4 s of effect holds, within the 45 to 90 s target.
- Cues live in a sidecar, `intro.cues`, anchored to line ids (`page-n`, `@end`, `+seconds`). Reason: `scripts/facts/template.ts` treats every non-comment line as copy and rejects unknown `!` directives, so inline markers would need a parser change; the sidecar leaves the facts pipeline and `data-fact` output untouched.
- The flat dark room is not enough for the haunted set. Cheap additions, all procedural: wall paper pattern, shelf dust, blob shadow, and one wall decal (the Occupant's shadow). Room dim only changes the room, never the screen, so text contrast is unchanged.
- Ghost is absent under Calm (a still figure is allowed by FR-17 but not used).
- Camera creep is a multiplier on distance (at most 0.22), bounded so the screen is at most 0.86 of the viewport height; it is the story's, so Reset view does not reset it.
- Answers to earlier questions: Home resets the view in 3d-set while the show plays and goes to the diary index when ended (as the frontend built it). Power-off returning the camera to Idle over 1200 ms is accepted. Calm mode and power-off toggle are in the spec as approved.

## Assumptions
- VT323's advance is narrower than 0.6 em; if the frontend measures otherwise, the spec's rule (`drawPx = cellWidth / advance`, capped by row pitch) still applies.
- The story's role list includes "tech lead" and "UX/UI designer" (both have handoff notes). If a role is missing from `agents.roles`, the "tech lead" line is still fiction and does not depend on it.
- Word indexes in `rewrite` cues count space-separated tokens of the resolved line, before wrapping. The current cues use tokens before any fact segment on their lines, so they stay valid when facts change length.

## Open questions
- Resolved (integration pass, 2026-11-10), both with the defaults: no ghost figure under Calm, and the wall decal ("Occupant's shadow") is kept at alpha 0.10 or less.
- Integration pass: design-spec updated to match round 2 as built. Roll lasts 2.4 to 3 s and is never applied to the test card. VT323 advance is 0.4 em, so cell sizing comes from `measureText` (section 14). Ghost text cap is effectively `uGhostTextCap` x 0.5, with body text at 5:1 or better. Bleed streaks are 0.25 cell wide. Timing figures in 6.3 and 16.2 now point at `src/state/timing.ts`.
- QA round 1: recorded the tech lead's decisions in design-spec. BUG-1: the 56 per cent figure is the whole set (cabinet plus knob panel), centred, with D and the camera target from the set's bounding box (4.1, 4.2); creep must never clip the set (4.2, 16.6.4). The 3d-set glass is therefore smaller, so the grid uses 32 or 26 columns at about 1290 px wide and under (3.2, 5.2 note). BUG-3: the under-0.10 tile-step limit stands, with a dissolve of 300 ms or less where a page or screen change would exceed it (7.1, 6.3). BUG-4: 2D warm-up and collapse stay within 0.05 (7.1). BUG-5: story time is real elapsed time and only gaps of about 1 s or more count as a pause (6.3).

## Requests for other agents

### Change: ghost story

Full detail: docs/design-spec.md section 16. Verify first: the tech lead should run `npm run facts` and `CI=true npm run facts`. The strict run should fail only on uncommitted changes. If a placeholder fails, send me the `file:line`.

- **frontend-developer**
  - Constants in `src/state/timing.ts` and `useIntroClock`: `REVEAL_CPS` 60, `LINE_GAP_MS` 450, `PAGE_HOLD_BASE_MS` 1200, `PAGE_HOLD_PER_CHAR_MS` 10, `END_HOLD_MS` 3000. Update `estimateIntroDurationMs`; the intro should resolve to about 78 s.
  - Cue parser and scheduler for `src/content/intro.cues` (import with `?raw`). Grammar, ranges, clamps and reset rules are in 16.3. Fire cues from the clock when `(pageIndex, lineIndex, revealedChars)` crosses an anchor; `@end` is line end plus 300 ms; once per epoch; frozen by Pause; extend a page's hold (at most 6 s) for an event cue on its last line.
  - `src/state/hauntStore.ts` with the fields in 16.3, written only by the scheduler. All zero and `textEffects` empty when `displayStore.reducedMotion` is true; Calm on mid-story zeroes everything within one frame. Skip eases to zero over 1.2 s, natural end over 3 s, Replay and Power-off at once (camera creep 700 ms on Replay).
  - Text effects in the rasteriser (16.4): `tremble`, `rewrite`, `bleed`, visual only, starting 300 ms after the line has fully revealed, one at a time, 30 Hz redraw while running, and the settled frame must equal the resolved text (add a unit test). `rewrite` may never touch a fact segment. Same layer on the 2D screen. DOM transcript and `data-fact` spans untouched.
  - 2D mode ghost layer and roll (translate the screen contents) driven by `hauntStore`; edge dim as an inset shadow only outside the safe area.
  - Start screen: content note and the Calm switch before Power with the exact wording in design-spec 2 (E1); `aria-describedby` from Power to the note. Calm key in the dock at all times (FR-31), directly after Power.
  - VT323: await `document.fonts.load('16px VT323')`; draw mosaics (rules, fastext blocks, bleed streaks) as rectangles; derive the draw size from `measureText` and report the measured advance in your handoff (design-spec 14).
  - Audio: `hum` cue raises the hum and static gain slowly (16.9); muted under Calm.
- **technical-artist**
  - Add to the CRT material: `uGhost`, `uGhostNear`, `uGhostSeed`, `uGhostMap`, `uGhostTextCap` (0.07), `uGhostPeak` (0.30), `uRoll` (0 to 1 phase), `uHauntVignette` (0 to 0.25). Behaviour, ceilings and the emergence formula are in 16.5 and 16.6. Calm: all zero, and the shader must stay greyscale.
  - Draw the Occupant sprite procedurally (`drawOccupant`, 256 by 384, greyscale with alpha) per the description in 16.5; export the same drawing for the 2D layer. Original design only.
  - Verify with the ghost at maximum: text contrast stays 4.5:1 or better (header stays on `--tt-2` or darker), ghost mean contribution at most 0.05, change at most 0.02 per 100 ms.
  - Room: procedural wall paper pattern (under 8 per cent contrast), shelf dust texture, blob shadow, and the wall decal (silhouette of the sprite, darker than the wall). See 10.2 and 16.5.
  - Fonts: download VT323 (SIL OFL 1.1), subset to Basic Latin, Latin-1, punctuation and arrows, ship `public/fonts/vt323-regular.woff2` and the OFL text, update `public/fonts/LICENCES.md`, and remove the Bedstead row, file and licence texts. `src/styles/fonts.css` and `--font-teletext` already point at VT323 and will 404 once until the file exists.
- **scene-developer**
  - `SetCameraRig`: apply `creep` as a distance multiplier `1 - creep x 0.22`, bounded so the projected screen height is at most 0.86 of the viewport (formula in 16.6.4); never in 3d-screen; user orbit still works; Reset view does not reset creep; eased, at most 0.04 per second.
  - `KnobLayer`: read `hauntStore.knobCue` and turn the named knob by `deg` over `over` seconds, ease in-out, 1 degree overshoot back; never while hovered; leave it where it ends; power-off resets. No-op in 3d-screen.
  - `SetLights`: multiply key, ambient and environment by `1 - dim x 0.65`; leave the screen-glow light alone; keep the 2 Hz low-pass. Add the wall decal quad with alpha `shadow x 0.10`.
  - Copy `hauntStore.ghost`, `ghostNear`, `roll` and `dim` into the material uniforms each frame (as you do for `screenState`); in 3d-screen `dim` goes to `uHauntVignette`. Read only, never write the store. Swap the seam `integration/stores.ts` to the real stores if not already done.
- **architect**
  - No change to `scripts/facts/template.ts` is required: the cues sidecar is outside the facts pipeline. Optional (Should): add a build-time validator `scripts/facts/cues.ts` run by `npm run facts` that checks every anchor id exists in the resolved intro, the grammar and ranges in 16.3, at most two `roll` cues, no `rewrite` over a fact segment, no digits in `to=` words, and event cues at least 2 s apart; and emit `src/generated/cues.json` so the frontend need not parse at run time. If you prefer inline markers, the parser would need a new directive; I recommend against it.
  - Add `src/content/intro.cues` to the Vite and ESLint ignore lists if either complains about the extension.
- **qa-engineer**
  - Settled text equals resolved text after every effect, and `[data-fact]` text is unchanged during effects (FR-26, FR-32). Every fact from FR-12 and FR-13 plus tool, plugin and model appears in the story.
  - Under Calm and reduced motion: no ghost, roll, knob, dim, creep, text effect (frame-by-frame, three modes). Calm toggled mid-story cancels within one frame.
  - Flash frame analysis of the full story: no more than 3 flashes per second, ghost mean change at most 0.02 per 100 ms, no change over 0.1 of a range in 300 ms; text contrast 4.5:1 or better with the ghost at maximum; greyscale R=G=B within 2 levels in every mode including the ghost.
  - Duration 45 to 90 s at the new constants; creep bounded and text fully visible at maximum creep at 1024 x 600 and 1440 x 900; no camera movement in 3d-screen.
- **performance-optimiser**
  - Ghost and roll are shader work on a full-screen quad; check frame time at DPR 2 and on the 3d-screen mobile path. The text effect layer redraws the canvas at 30 Hz only while an effect runs.
- **tech-lead**
  - Run the facts pipeline as above, commit `intro.cues` with the template, and note that `public/fonts/LICENCES.md` is owned by me but is being updated by the technical-artist.
- **devops-engineer**
  - None.

## v2 design (branch `v2`, 2026-11-11)

Delivered `docs/design-spec-v2.md` (draft for user approval). `docs/design-spec.md` (v1) is unchanged except a pointer line. No code or tokens were written this pass (docs only); proposed v2 tokens are in section 9 of the v2 spec. Open questions Q-D1 to Q-D8 are in section 10 of the v2 spec.

Requests for other agents:

- **scene-developer**
  - `ScreenProjector` and watch pose (v2 spec 2.2, 5.0): the pose function takes the anchor, `fill` (0.55 to 0.72 per room), a max height of `min(0.78 vh, vh - 40 - 64 - 2 x 24)`, and an optional "include box" so the tv-room pose can fit the whole set at 95 per cent of the width with the glass left of centre. The camera is translated parallel to the glass plane (never rotated) so the face-on check holds. Show the iframe only when the projected rect is axis-aligned within 1 px, inside the viewport, and at least 480 x 270 (else request focus layout from the frontend).
  - `clearHalo`: every prop's projected bounds (animated props: swept bounds) stay 24 CSS px outside the rect in the watch pose at every supported viewport; throw in development, hide the prop in production.
  - Browse pose (Look around): orbit azimuth plus or minus 35 degrees, elevation -5 to +12, distance 0.85 to 1.15, no pan; pause and hide the player when entering; none under Calm.
  - Shared `spill(t) = 1 + 0.08 sin(2 pi 0.6 t) + 0.05 sin(2 pi 1.3 t + 1.7)` for all light spill (constant 1 under Calm), applied only to surround lights. Channel-change cue: tv-room static burst on the bezel ring and the cabinet strip only (300 ms, at most once per 1000 ms); other rooms a 300 ms edge-vignette dip of at most 15 per cent; none under Calm.
  - Room switch: keep the `<Canvas>`, swap the scene in `Suspense`, 300 ms cross-dissolve (instant in Calm); loading progress to `environmentStore`.
  - tv-room: channel 0 path untouched; for live channels swap the dome glass for a flat black backing, anchor 4:3 at the glass plane, v1 haunting forced to 0 on and around the screen (wall decal at most 0.04, static). Channel knob: click next, Shift-click previous, wheel plus or minus one; on channel 0 with the diary shown keep v1 (next page) until the last page, then channel 1 (Q-D7).
  - Per-room placement rules and motion limits in v2 spec 5.2 to 5.8; the paused card (channel name, "Paused") on the anchor mesh in the browse pose.
- **technical-artist**
  - The seven new rooms within ADR 0011's budgets, following 5.2 to 5.8: palettes (colour hexes, B&W reads checked after grayscale with at least 25 per cent luminance separation where props must read apart), props, procedural-first (Earth, stars, rain, parallax strips, crowd silhouettes as vector cut-outs, instanced seats and grass), no real brands or logos, generic text only ("CHAI", "EXIT"), `LICENCES.md` per folder.
  - tv-room additions: table lamp, doily, rug edge, a bezel-ring shader (low-alpha scanline texture and soft inner glow at the opening edge only), warm tint uniforms for the Colour variant (5.1).
  - Ambient motion shaders (rain, steam, grass sway, parallax) with a frozen state under Calm; ambient audio synthesised in the existing Web Audio engine (5.0, 5.2 to 5.8), off by default.
  - Site-made cards (idle test card on non-tv rooms, paused card, still card, no-signal card) as DOM or canvas art, greyscale, static; 2D room skins as CSS (5.9).
- **frontend-developer**
  - Stores: `environmentStore`, `channelStore`, `playerStore`, `guideStore` per ADR 0011; session-storage persistence for room, colour, focus mode, notice accepted (V2-FR-24).
  - `PlayerHost` (one `YT.Player`, `host: https://www.youtube-nocookie.com`, `origin`, `playsinline=1`, `cc_load_policy=1` in Calm, iframe `title`, `referrerpolicy`), 8 s `onReady` timeout, error map in 1.9, Stop within 1 s, pause on hide and on browse pose, no 3D transform and no ancestor filter, opacity, blend, mask or clip-path.
  - UI: room picker (radiogroup, prefetch on hover or focus, progress text), teletext guide panel in DOM (grouping, filters, status labels, Find field, last refreshed), paste-a-link with the messages in 1.5, first-play notice (modal, once per visit, Calm line), still card with Play, info row (name, owner tag, Watch on YouTube, Stop, Back to controls, skip link before the iframe), HUD channel readout, focus layout (2.4, header Exit key, min height 240 on phones, landscape strip), dock changes (2.3, Calm always on the bar), More sheet, Keyboard help with the context map (3), Credits panel, footer links, `privacy.html` static page with the copy in 6.3 once the product-manager approves.
  - Keyboard contexts and digit handling exactly as the table in 3 (diary digits stay v1; elsewhere channel numbers with a 1.5 s timeout); letter shortcuts G, E, C, F, L, V, W, A, S only inside the stage or dock focus and never in a text field.
  - Live region messages in the accessibility table (7); `role="alert"` once for errors.
- **architect**: confirm the CSP decision against Q-D1 (thumbnails need `img-src https://i.ytimg.com` after the notice; default design needs none); add `privacy.html` to the static build; confirm session storage is acceptable under the v2 privacy copy; confirm the contract's `screen.aspect` accepts 4/3 for tv-room.
- **product-manager**: review the privacy copy (6.3), the notice (1.6), the guide labels (OFFICIAL EMBED, STATE MEDIA) and the Credits wording.
- **qa-engineer**: no-overlap grid test and ancestor-style test per room in B&W and Colour; the 24 px halo; minimum size at 360 and 1280 wide; keyboard map contexts; first-play notice before any YouTube request; error cards via fixtures; Calm click-to-play; v1 flash tests per room with the iframe region excluded; v1 suite on channel 0.

## Earlier requests (Phase 3), still valid except where section 16 supersedes them
- Camera poses and limits, knob picking, dock and transcript behaviour, shortcuts only inside the television region, flash rules in section 7, and the TV body in section 10 are as built.
