# v2 theme change: 2050 "holographic glass" (change document)

Status: user-approved (2026-11-11). Applies to the **v2 branch only**. v1 on main stays the 1970s release and its requirement files (`requirements.md`, `user-stories.md`) are not edited. This document overrides the 1970s styling in `docs/requirements/v2-environments.md` and, for the v2 branch, in v1 requirements where listed below. Where this document and an older one disagree on look and feel, this document wins. Everything not listed here is unchanged.

**User-approved override of the brief:** `ps.md` asks for a black-and-white, 1970s-television site. The user has chosen a 2050 identity for v2. `ps.md` stays as the original brief and is not edited. The repo's v1 history and the v1.0 tag remain the record of the 1970s release.

## Changelog
| Date | Change |
|---|---|
| 2026-11-11 | New change document. Replaces the 1970s theme with a 2050 holographic-glass identity on the v2 branch: floating light-field display, frosted-glass UI, soft volumetric light, calm and premium, colour allowed. Occupant story retold for 2050. Colour/B&W switch kept as Colour/Monochrome, default Colour. V2-FR-36 retired. New requirements T50-1 to T50-14 |

## 1. The new identity in one paragraph
Channel 0 is a ghost trapped in a 2050 holo-display: a floating light-field panel with a slim emitter base, frosted-glass controls, and soft volumetric light in a calm, premium room. Colour is allowed and is the default. The Occupant still tells the story of its own making, slowly, with no jump scares and only true build facts from the existing pipeline. The other eight rooms keep their scenes but wear the 2050 UI chrome (frosted-glass dock, guide, notices).

## 2. What stays unchanged
| Area | IDs | Note |
|---|---|---|
| Truthfulness and the facts pipeline | FR-9 to FR-14, FR-26, FR-32, FR-33 | Facts still generated from real sources, verified by test, wording "as of commit <hash>", DOM transcript with `data-fact` spans. The story copy changes (section 3); the pipeline and the checks do not |
| Flash safety | FR-19, FR-30, V2-FR-27 | All new light, bloom and shimmer effects obey the same limits (3 flashes per second, WCAG 2.3.1) |
| Calm mode and reduced motion | FR-17, FR-31, V2-FR-29 | Calm still gives a static, fully readable version |
| Accessibility | FR-16, FR-18, FR-20, NFR-6 (except the measurement wording), V2-NFR-6 | Skip, replay, DOM transcript, 2D fallback |
| Content note | FR-24 | Mild horror note stays |
| YouTube rules | V2-YT-1 to V2-YT-15, V2-FR-1 to V2-FR-12, V2-FR-16 to V2-FR-23, V2-FR-26 to V2-FR-35, V2-FR-37, V2-FR-38 | Unchanged, and the new glass effects must obey them (T50-9) |
| Process and legal | NFR-12, L1 to L8, third-party allow-list | Unchanged |
| Site name | "Transmission Pending" | Kept (see Q-T50-1) |
| Nine rooms and placement rules | V2-FR-15 (list of other rooms), V2-FR-35 | Scenes unchanged; only chrome changes |

## 3. Requirements that change
Mark: **[CHANGED]** new wording replaces the old. **[RETIRED]** removed on the v2 branch. IDs refer to `requirements.md` (v1 FR, NFR, G) and `v2-environments.md` (V2-).

### 3.1 v1 requirements (on the v2 branch)
| ID | Old (summary) | New wording |
|---|---|---|
| G1 | Convincing 1970s CRT look; strictly greyscale | **[CHANGED]** Convincing 2050 holographic-glass look; the Colour/Monochrome option (T50-5) works and Monochrome mode is strictly greyscale |
| Section 1 Overview and Section 4 Core experience | 1970s television, CRT, teletext, test card | **[CHANGED]** A 2050 holographic-glass display room called "Transmission Pending". The viewer wakes a floating light-field display; a ghost trapped in the display tells the story of its own making as slow, creepy text. A site-drawn calibration field appears while loading and idle. All other behaviours (power, intro, skip, replay, Calm) as before |
| FR-1 | Powered-off TV; CRT collapse (line, dot, fade) | **[CHANGED]** A dormant display with one clearly labelled control to wake it; the intro does not start until the visitor activates it. The same control puts it to sleep at any time: the panel folds into a point of light that fades over 0.5 to 1.5 s (within flash limits) and the story stops |
| FR-2 | All pixels greyscale (R=G=B within 2 levels) | **[CHANGED]** Colour is allowed. The site uses a defined palette (T50-1) in Colour mode. In Monochrome mode (T50-5) every pixel of the site and rooms is greyscale (R=G=B within 2 levels), excluding the YouTube player. Colour is never the only carrier of meaning |
| FR-3 | Scanlines, noise, glow, vignette, curvature visible | **[CHANGED]** The display shows frosted glass, soft bloom, subtle depth-of-field and volumetric light shafts, all visible in a desktop screenshot. Scanlines, CRT curvature and heavy noise are not required and are not used on the 2050 display |
| FR-4 | VT323 typeface | **[CHANGED]** An open-licence, futuristic typeface set (T50-3); VT323 is retired on the v2 branch. Licence recorded in the repo |
| FR-5 | Power-on warm-up: line, dot, static, test card, 1 to 3 s | **[CHANGED]** Wake-up sequence of 1 to 3 s: a point of light expands into lines that assemble the display panel and settle on the calibration field; no sudden full-screen change; within flash limits |
| FR-6 | Original test-card-style graphic in greys | **[CHANGED]** (Should) An original 2050 "calibration field" (concentric rings, fine grid, gradient swatches and alignment marks, drawn by the site) is the idle and loading graphic. It reproduces no real device UI, brand mark or test card |
| FR-7 | TV set body: bezel, knobs, grille, wood effect in greys | **[CHANGED]** On desktop, a floating light-field display with a slim emitter base and a glass frame is modelled and lit in the scene. On mobile the screen fills most of the viewport (portrait and landscape). No wood, knobs or speaker grille |
| FR-15 | Teletext-style "page 100" diary index | **[CHANGED]** (Should) After the story, a glass "build log" index lists each commit subject from the real git log (generated at build time), navigable by number keys, arrow keys or tap. Numbered pages remain; the teletext look and the term "page 100" are dropped |
| FR-23 | Channel-change static burst (greyscale) | **[CHANGED]** (Could, Must in v2) A light ripple across the surround lasting 200 to 400 ms, never over a player, within flash limits |
| FR-25 | Teletext letters tremble, rewrite, bleed down the screen | **[CHANGED]** Haunted text: letters drift out of phase, desync into a faint double, rewrite a word, or dissolve downward like melting light; each effect completes and the line ends in its true, settled form. FR-26 (settled text equals resolved text) unchanged |
| FR-27 | Pale greyscale figure forms out of the static | **[CHANGED]** A pale luminous silhouette forms slowly out of drifting light particles and drifts closer to the glass. Original design; no recognisable character from an existing film, game or book. Calm: still image or absent |
| FR-28 | Haunted set: knob turns, picture rolls, room light dims (3 of 3) | **[CHANGED]** Haunted display, at least three of these occur: the emitter light slowly pulses out of rhythm, the panel drifts or tilts a few degrees by itself, the image tears slowly (at least 1 s), the room light dims. Slow and non-flashing |
| FR-29 | Camera creep | Unchanged |
| FR-31 | Calm turns off ambient noise motion | **[CHANGED]** wording: "ambient light and particle motion" replaces "ambient noise motion" |
| NFR-6 | Contrast measured in greyscale against screen backgrounds | **[CHANGED]** WCAG 2.2 AA for 2D UI, with contrast measured against the worst-case backdrop behind each glass surface (T50-2); full keyboard operation; visible focus |
| NFR-13 | No real broadcaster marks or test cards | **[CHANGED]** Fonts, textures and audio original or open-licence; no real broadcaster marks or test cards; and no copy of any existing product's UI, glass material or trademark (the 2050 glass look is original and described in the design spec) |
| FR-X2 | Won't: colour mode or colour TV era styling | **[RETIRED]** (v2 branch) Colour is now in scope |
| FR-X3 | No broadcaster test card, logo, ident or jingle | Unchanged (still applies to the calibration field) |
| Assumption 1 | "1970s television" is UK/Australia/US-neutral | **[RETIRED]** replaced by: the 2050 look is an original, optimistic, calm future, not tied to any film or product |
| Section 7 MVP sentence, README, page title, meta description, favicon, 2D page, start-screen and intro copy | Mention a 1970s television or CRT | **[CHANGED]** Every user-facing and repo-facing mention of the 1970s, CRT, teletext or "TV set" is rewritten for the holo-display (T50-12). Hand-written copy still carries no facts and no digits outside the allow-list (FR-14) |

### 3.2 v2 requirements
| ID | Old (summary) | New wording |
|---|---|---|
| D4, V2-FR-15 | Nine rooms, first is "1970s TV (v1)" | **[CHANGED]** Nine rooms: **holo-display room** (channel 0 and live channels; the code id may stay `tv-room`), cinema theatre, car / drive-in, open-air screen, rainy-night bedroom, chai stall with cricket, train window seat, space deck, Mountain sky. The user-facing name no longer says "1970s" |
| D5, V2-FR-25 | Channel 0 in the 1970s TV with full B&W CRT | **[CHANGED]** Channel 0 plays the Occupant's story and diary in the holo-display room, with the full holographic-glass treatment (retold for 2050, T50-11) |
| D6, V2-FR-14 | Colour/B&W option, default B&W, environment only | **[CHANGED]** A visible, keyboard-operable Colour/Monochrome option (T50-5): the default is Colour; it changes the site's chrome, rooms and channel 0; the video is never desaturated or tinted; the state is announced to assistive technology |
| Section 1 (v2), Section 3 | "a 1970s set"; first visit lands on the 1970s TV; CRT scanlines on the bezel and surround | **[CHANGED]** First visit lands on channel 0 in the holo-display room. Live channels appear in the display's screen opening, flat and unfiltered; the glass frame, bloom and light shafts apply to the surround only, never over the player |
| V2-G4 | CRT look on channel 0 | **[CHANGED]** The holographic-glass look on channel 0 |
| C3 | Greyscale and CRT effects apply to channel 0, UI and the TV surround; chrome stays greyscale | **[CHANGED]** Resolved by this document: no greyscale rule applies to the site except in Monochrome mode. The video is still never filtered |
| C7 | The first view stays within NFR-3 on the 1970s TV | **[CHANGED]** "on the holo-display room" |
| V2-FR-13 | Teletext guide page in the TV room | **[CHANGED]** (Could) A glass "station ident" guide page in the holo-display room |
| V2-FR-20 | The 1970s TV applies CRT effects to the bezel and surround only | **[CHANGED]** The holo-display applies glass, bloom and light effects to the frame and surround only, within the 24 CSS px keep-out (T50-9) |
| V2-FR-30 | "or channel 0 in the 1970s TV" | **[CHANGED]** "or channel 0 in the holo-display room" |
| V2-FR-36 | Warm colour-era tint on the TV room for live channels | **[RETIRED]** The room is already in colour (default) and takes the 2050 palette; the tint is no longer needed |
| V2-US-5, V2-US-6, V2-US-14, V2-US-15 | Criteria mention the 1970s TV, scanlines on the bezel, B&W default, colour-era tint | **[CHANGED]** US-5: glass, bloom and light shafts appear on the frame and surround and never on or over the video. US-6: default is Colour; Monochrome makes the site and rooms greyscale; the video is unchanged. US-14: first visit plays channel 0 in the holo-display room. US-15: remove the tint criteria (rewritten as: "Given the holo-display room in Colour mode, when a live channel plays, then the surround takes the 2050 palette and the player is unchanged") |
| Assumptions 3 and 4 | Default B&W; the 1970s TV is the default environment | **[CHANGED]** Default Colour; the holo-display room (channel 0) is the default environment on first visit |
| Appendix A (permission email) | "such as a 1970s television room" | **[CHANGED]** "such as a holographic display room, a cinema and a train window seat". The user has not yet sent the email; edit before sending |

## 4. New requirements for the 2050 identity
All Must unless marked. Each has a check a tester can run.

| ID | Priority | Requirement | Check |
|---|---|---|---|
| T50-1 | Must | **Palette.** The site has a defined palette (neutral glass and light tones, one calm accent family, one warning tone for the content note). Colour is never the only carrier of meaning (state also has text or shape) | Palette tokens in the design spec; test that each state has a text or shape cue |
| T50-2 | Must | **Contrast on frosted glass.** Text and essential icons on a glass surface meet WCAG 2.2 AA (4.5:1 for body text, 3:1 for large text and UI components) measured against the worst-case backdrop: the brightest and darkest pixel regions of the backdrop within the panel over a 30 s sample, not an average. If a surface cannot meet this, it gets a denser scrim | Automated sample over a recorded 30 s capture of each panel in each room; fails if any frame is below the ratio |
| T50-3 | Must | **Typeface.** The site uses an open-licence (for example SIL OFL) futuristic display face for headings and a highly legible sans for body and numerals, self-hosted, with licence files recorded in the repo. Body text is at least 16 CSS px with a clear difference between l, 1 and I and between 0 and O. The faces are not derived from a proprietary or trademarked source (the Bedstead lesson). The font payload stays within the budget the architect sets | Licence check in CI; legibility check at 16 px on a phone and a desktop screenshot; payload size test |
| T50-4 | Must | **Legibility over volumetric light.** Story text, controls and the guide never sit on light shafts or bloom brighter than the level at which T50-2 still passes; shafts and bloom are bounded in intensity, and text planes sit on a scrim or in a region the light does not reach | Same sampling test as T50-2 taken at peak light intensity during the intro |
| T50-5 | Must | **Colour/Monochrome option.** A visible, keyboard-operable switch labelled "Colour" with state "on" or "off", default on each visit. Off is Monochrome mode: all site chrome, rooms and channel 0 become greyscale (R=G=B within 2 levels, excluding the YouTube player). The video is never filtered in either mode. Announced to assistive technology | Pixel sampling in Monochrome mode (the v1 greyscale test, reused); test that the player element has no filter in both modes |
| T50-6 | Must | **Reduced transparency.** Honour `prefers-reduced-transparency: reduce`: replace blur and translucency with opaque panels of equal contrast (at least the T50-2 ratios) in every room. Because browser support is not universal, also provide a manual "Solid panels" option that does the same. Honour `prefers-contrast: more` the same way | Tests with the media features emulated where supported; test that the manual option produces opaque panels and no `backdrop-filter` |
| T50-7 | Must | **Transparency fallback.** Where `backdrop-filter` is unsupported or the device cannot hold the frame rate, panels fall back to the opaque style automatically with the same layout | Test in a browser with the property disabled; check frame-rate-driven fallback in the performance test |
| T50-8 | Should | **Forced colours.** In Windows forced-colours mode, controls, focus and text remain visible and operable | Manual check in forced-colours mode |
| T50-9 | Must | **No effect over the player.** Frosted panels, glass reflections, bloom, glare, refraction, light shafts and particle effects never overlap the player rectangle plus its 24 CSS px keep-out, and no backdrop blur samples the player. Frosted panels that would overlap it (for example the guide on a phone) pause and hide the player first | Screenshot test in each room; style inspection that no `backdrop-filter` element intersects the player rectangle. V2-YT-1 and V2-YT-2 stay in force |
| T50-10 | Must | **Flash and motion safety of the new effects.** Light shimmer, bloom pulses, particles, image tear and the wake-up sequence meet FR-19; no sudden change within 300 ms (FR-30); Calm mode freezes them and shows a still, readable version; reduced motion does the same | Frame-by-frame analysis as in v1 QA; Calm and reduced-motion snapshot tests |
| T50-11 | Must | **The Occupant retold for 2050.** The ghost story is rewritten as a ghost trapped in a 2050 holo-display. It keeps the structure in FR-33 (beginning, middle, end), tone (creepy first, dark humour second, no gore, no jump scares, 45 to 90 s), the `data-fact` markup and the "as of commit <hash>" wording. Facts come only from the existing pipeline; hand-written lines assert no facts | Existing facts test (FR-11); copy lint (FR-14); length and structure review |
| T50-12 | Must | **No stale 1970s references.** No user-facing text, metadata, alt text, DOM transcript, 2D page, README or permission email in the v2 build mentions the 1970s, CRT, teletext, wood TV or "television set" as the site's identity, except in the history section stating that v1 was the 1970s release | Grep in CI over source copy, built HTML and docs for the listed terms, with a small allow-list for the history note |
| T50-13 | Should | **Original glass.** The glass material, light-field effect, iconography and motion are original, and a design review confirms no resemblance to a specific existing product's UI or branding | Design review sign-off |
| T50-14 | Should | **Audio.** Room sound (V2-FR-37) is re-tuned for 2050 (soft hum, airy tones), still synthesised, off by default, muted in Calm, and only while video is muted | Existing room-sound tests |

## 5. What the Colour/Monochrome switch means now
Decision (recommended and adopted in this draft): **keep the switch, default Colour.**

| Aspect | Old | New |
|---|---|---|
| Label | Colour/B&W | Colour on / off (off is "Monochrome") |
| Default | B&W | Colour |
| Scope | Rooms only; chrome and channel 0 stayed greyscale | Site chrome, rooms and channel 0; the video is never touched |
| Purpose | Choose the mood | Serves viewers who prefer or need low colour, keeps the old greyscale test useful, and gives a calm option |
| Channel 0 | Always B&W | Follows the switch |

Reason: it costs little, reuses the existing greyscale check as the Monochrome check, and helps people who find colour or glow uncomfortable. If you would rather remove it, T50-5 and V2-US-6 would be deleted.

## 6. Stories to add
### T50-US-1: A calm, readable glass interface (T50-2, T50-4, T50-6, T50-7, Must)
As a viewer, I want the frosted-glass panels to stay readable, so that the beautiful look never costs me legibility.

**Acceptance criteria**
- Given any glass panel in any room, when I sample it over 30 s, then body text stays at 4.5:1 or better and large text and controls at 3:1 or better against the worst-case backdrop
- Given light shafts or bloom peak during the intro, when story text shows, then it still meets those ratios
- Given my system sets `prefers-reduced-transparency: reduce` (or I turn on Solid panels), when the page loads, then panels are opaque with equal or better contrast and no blur
- Given the browser lacks `backdrop-filter`, when I load a room, then panels fall back to the opaque style with the same layout

### T50-US-2: The Occupant in 2050 (T50-11, T50-10, T50-12, Must)
As a visitor, I want a ghost in a holo-display to tell its build, so that the site keeps its story in a new look.

**Acceptance criteria**
- Given I wake the display, when the intro plays, then the ghost story is set in a 2050 holo-display and has a beginning, middle and end within 45 to 90 s
- Given I read it, when I compare its facts with the repo, then every fact comes from the pipeline and equals the git and package data at the named commit
- Given Calm mode or reduced motion is on, when the story plays, then it is a still, readable version with no moving ghost
- Given I search the built site, when I look for the 1970s, CRT, teletext or "television set", then there is no match outside the history note

### T50-US-3: Colour or Monochrome (T50-5, Must)
As a viewer, I want to turn colour off, so that I can have a calm, greyscale site.

**Acceptance criteria**
- Given I enter, when the site shows, then Colour is on
- Given I turn Colour off, when the site updates, then all chrome, rooms and channel 0 are greyscale and the video is unchanged
- Given I use a screen reader, when I reach the switch, then it is labelled and announces its state

### T50-US-4: Nothing over the video (T50-9, Must)
As a viewer, I want the glass effects kept away from the video, so that I see it as the channel made it.

**Acceptance criteria**
- Given any room with a video playing, when I screenshot it, then no panel, bloom, reflection or particle crosses the player or its 24 CSS px margin
- Given a panel would overlap the player, when I open it, then the player is paused and hidden first
- Given I inspect the page, when I check the player, then no filter, blend mode, mask or backdrop blur covers it

## 7. Story map
| Release | Items |
|---|---|
| v2 MVP (this branch) | All Must changes in section 3, T50-1 to T50-7, T50-9 to T50-12, T50-US-1 to T50-US-4 |
| v2.1 | T50-8, T50-13, T50-14 polish |

## 8. Assumptions
1. v1 on main is not changed and stays the 1970s release; the v1.0 tag stays.
2. The Occupant stays nameless.
3. The facts, the pipeline, the content note and the YouTube rules do not change.
4. The architect chooses the technique for the light field, glass and the transparency fallback.
5. The first visit lands on channel 0 in the holo-display room, so the story stays the site's identity.

## 9. Open questions
| # | Question | Default if unanswered |
|---|---|---|
| Q-T50-1 | Keep the name "Transmission Pending" (it fits a 2050 display too), or rename for the new theme? | Keep the name; the repo and page title stay |
| Q-T50-2 | Do you want the Colour/Monochrome switch kept (recommended, colour on by default), or removed now that colour is allowed? | Keep it, default Colour |

## 10. Requests for other agents
- ux-ui-designer: update design-spec-v2 to the 2050 identity (palette, type, glass, light, calibration field, sleep and wake sequences); record contrast values per panel for T50-2.
- architect: choose the light-field and glass technique, the transparency and `backdrop-filter` fallback, supersede any ADR that fixes CRT or greyscale for v2, and check the fonts' licences.
- technical-artist: holo-display model, emitter, particle ghost and volumetric light within flash limits.
- scene-developer and frontend-developer: Monochrome switch, Solid panels option, media-query handling, copy rewrite.
- qa-engineer: add the worst-case contrast sampling, the 1970s grep, the Monochrome pixel test and the no-backdrop-filter-over-player test.
