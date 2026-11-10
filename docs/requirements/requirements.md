# Requirements: 1970s TV self-introduction site

## 0. Changelog
| Date | Change | Items |
|---|---|---|
| 2026-11-10 | Scope change: the intro is now a horror ghost story, "Haunted TV tells its build". A ghost trapped in the set narrates its own making using real build facts. Creepy, slow dread, no jump scares. Site name fixed as "Transmission Pending". Earlier open questions Q1, Q3, Q4, Q5 resolved. | Changed: Overview, Goals G3, Core experience, FR-1, FR-4, FR-7, FR-8, FR-17, FR-19, NFR-1, Section 7, 8, 9, 10. New: FR-24 to FR-35. Out of scope: FR-X7, FR-X8 |

Items marked **[CHANGED]** or **[NEW]** below were altered in this change.

## 1. Overview
**[CHANGED]** A black-and-white website, "Transmission Pending", presented as a haunted 1970s television set. On entry, the "TV" powers on and a ghost trapped inside tells the story of its own making as a slow, creepy ghost story (dark humour allowed, jump scares not). Dread is the primary register, with a little self-deprecation. The story is built from the real build, and the intro's facts must be true. Every factual claim in that introduction must be true of the real build and must be derived from real project data, not hand-written. The site is a single-page, static, front-end-only experience for curious visitors, developers and anyone who enjoys retro-TV nostalgia and dry humour.

## 2. Goals
| # | Goal | Measure |
|---|---|---|
| G1 | Convincing 1970s CRT look | Reviewer checklist (FR-2 to FR-5) passes; output is strictly greyscale |
| G2 | Intro facts never drift from the real build | 100% of numeric/named facts resolve from generated data; build and tests fail on mismatch (FR-8 to FR-11) |
| G3 | **[CHANGED]** Creepy but safe and accessible | Intro is skippable, replayable, has a Calm mode and reduced-motion path, a content note, no jump scares, no flashing above limits (FR-16, FR-17, FR-19, FR-24 to FR-35) |
| G4 | Git history reads as a build diary | Every build step is its own commit with a clear message (see NFR-12) |
| G5 | Fast to first laugh | Intro starts within 3 s on 4G (NFR-2) |

## 3. Target users
| User | Device and context |
|---|---|
| Curious visitor arriving from a link | Phone or laptop, short attention span, may be on 4G |
| Developer or hiring reviewer | Desktop, reads the facts and checks them against the repo |
| Assistive-technology user | Screen reader, keyboard only, or reduced-motion preference |
| Retro-TV enthusiast | Desktop, large screen, notices period accuracy |

## 4. Core 3D experience
**[CHANGED]** The visitor sees a stylised 1970s television set in a dim room, with a curved CRT screen. A start screen carries a short content note (mild horror theme). Pressing the power control (click, tap, Enter or Space) switches the set on with a warm-up (line to dot to static to original test-card-style graphic); the same control switches it off with a CRT collapse. The intro then plays as a ghost story told in teletext-style type: the ghost trapped in the set recounts its own making. The text trembles, rewrites itself or bleeds down the screen. A pale figure forms out of the static and drifts slowly closer to the glass. The set misbehaves: knobs turn on their own, the picture rolls, the room light dims. On desktop the camera slowly pushes in towards the screen. Pace is slow dread, with no jump scares. Facts (commit count, first-commit date, agent roles, phases, stack, tool, plugin, model) are slotted in from real build data and woven into the story. After the story the screen shows a teletext-style page index (build diary). Skip, replay and a Calm mode switch are always available. On desktop the 3D set is shown; on mobile the screen fills the view. Calm mode, reduced motion, or no WebGL gives a fully static, readable version.

## 5. Functional requirements

### Entry and presentation
| ID | Priority | Requirement |
|---|---|---|
| FR-1 | Must | **[CHANGED]** On first load the visitor sees a powered-off TV with one clearly labelled control to switch it on; the intro does not start until the visitor activates it. The same control switches the set off at any time, with a CRT collapse (picture shrinks to a line, then a dot, then fades) and stops the story |
| FR-2 | Must | All rendered pixels (3D scene, screen, UI, favicon) are greyscale: R=G=B within a tolerance of 2 levels in a sampled screenshot |
| FR-3 | Must | The screen shows scanlines, static noise, phosphor glow, edge vignette and slight curvature, all visible in a desktop screenshot |
| FR-4 | Must | **[CHANGED]** Text on the screen uses the VT323 typeface (SIL OFL 1.1); its licence is listed in the repo. Bedstead was dropped on 2026-11-10 because its glyphs derive from the Mullard SAA5050 typeface, a residual licence risk |
| FR-5 | Must | Power-on shows a warm-up sequence (line to dot to static to test card) lasting 1 to 3 s |
| FR-6 | Should | An original test-card-style graphic (circles, grid, bars in greys, resolution wedges) is shown as idle and loading state; it must not copy any real broadcaster's card, logo or trademark |
| FR-7 | **[CHANGED]** Must | On desktop the TV set body (bezel, knobs, speaker grille, wood-effect rendered in greyscale) is modelled and lit in the scene; on mobile the screen fills most of the viewport (portrait and landscape) |

### Intro content and truthfulness
| ID | Priority | Requirement |
|---|---|---|
| FR-8 | Must | **[CHANGED]** The intro plays after power-on as a ghost story told by a ghost trapped in the set about its own making. The main register is creepy; dark self-deprecating humour is allowed; the story lasts 45 to 90 s at default speed |
| FR-9 | Must | Every factual claim in the intro (counts, dates, names, versions, phases) is produced at build time from real sources (git log, package.json, docs/ files, agent handoff notes); no such fact is typed by hand into copy |
| FR-10 | Must | Intro copy is authored as templates with named placeholders; the build fails if a placeholder is unresolved, a source is missing, or a resolved fact is empty |
| FR-11 | Must | An automated test recomputes each fact independently from the repo and fails if it differs from the value shown in the intro (including text read from the rendered page) |
| FR-12 | Must | **[CHANGED]** The intro states at least: the number of commits, the date of the first commit, the list of AI agent roles involved, the build phases in order, the main stack with versions from package.json, and the tool, plugin and model used (all from real sources), told in the ghost's voice |
| FR-13 | Must | The intro names the commit it was generated from (short hash) and words self-referential facts as "as of commit <hash>", so the commit-count claim is true for that commit |
| FR-14 | Should | Jokes may be hand-written but must not assert facts; a lint or review rule distinguishes joke text from fact text, and any digit in hand-written copy fails the build unless allow-listed |
| FR-15 | Should | After the intro, a teletext-style "page 100" index lists the build diary: each commit subject from the real git log, generated at build time, navigable by page number keys, arrow keys, or tap |

### Control and accessibility
| ID | Priority | Requirement |
|---|---|---|
| FR-16 | Must | A visible, keyboard-focusable Skip control is available throughout the intro, and a Replay control after it; both have text labels |
| FR-17 | Must | **[CHANGED]** With prefers-reduced-motion: reduce, or Calm mode on (FR-31), the intro shows as static text pages (manual or slow auto advance), with no camera movement, no rolling, no jitter, no text distortion, no moving ghost (a still figure or none), and flicker/noise replaced by a static texture; the story and facts stay fully readable |
| FR-18 | Must | The full intro text exists as real DOM text readable by screen readers (not only in canvas or an image), in reading order, with the TV shown as decorative or with a short text alternative |
| FR-19 | Must | **[CHANGED]** No part of the experience (including the ghost forming, rolling picture, dimming and bleed effects) flashes more than 3 times in any one second, and no large area flashes with a relative luminance change over the WCAG general flash threshold; power-on, collapse and static respect this |
| FR-20 | Must | If WebGL is unavailable or context creation fails, a 2D (CSS or canvas 2D) presentation delivers the same intro, controls and facts, with a notice |
| FR-21 | Should | The intro is usable on touch: tap power, tap Skip, swipe or tap for pages |
| FR-22 | Could | Optional period-style audio (hum, static, click) is off by default, with a visible mute/unmute control; no audio plays without an explicit action |
| FR-23 | Could | Channel-change transition between pages (brief greyscale static burst within FR-19 limits) |

### Ghost-story animations and safety **[NEW]**
| ID | Priority | Requirement |
|---|---|---|
| FR-24 | Must | **[NEW]** The start screen shows a short content note (for example "Mild horror theme: creepy, no jump scares") and a link or control to Calm mode, before the visitor powers on |
| FR-25 | Must | **[NEW]** Haunted text: during the story, screen text visibly trembles, rewrites itself (a word changes, then settles) or bleeds down the screen; each effect completes and the line ends in its true, settled form |
| FR-26 | Must | **[NEW]** The settled text of every line equals the resolved story text exactly, so any fact shown reads as the real fact once the effect finishes |
| FR-27 | Must | **[NEW]** Ghost on screen: a pale greyscale figure forms out of the static and drifts closer to the glass over the story; it is an original design with no recognisable character from an existing film, game or book |
| FR-28 | Must | **[NEW]** Haunted set (desktop 3D): at least three of these occur during the story: a knob turns by itself, the picture rolls vertically, the room light dims; each is slow and non-flashing |
| FR-29 | Must | **[NEW]** Camera creep (desktop): the camera slowly pushes in towards the screen during the story, by a bounded amount, and stops before the screen text is clipped or unreadable |
| FR-30 | Must | **[NEW]** No jump scares: no sudden loud sound, sudden full-screen change, or sudden appearance within 300 ms; all escalation is gradual (at least 2 s per major step) |
| FR-31 | Must | **[NEW]** A manual Calm mode switch, visible at all times, turns off every effect in FR-25, FR-27, FR-28, FR-29 and ambient noise motion, and persists for the visit; it defaults on when prefers-reduced-motion is set |
| FR-32 | Must | **[NEW]** The full transcript is always in the DOM as readable text, with each fact wrapped in a `data-fact` span carrying its fact key; distortion effects are visual only and do not change the DOM text (so QA can verify facts) |
| FR-33 | Must | **[NEW]** Ghost story beats are ordered so each real fact (FR-12) appears in the story at least once; the story has a beginning (waking in the set), middle (the build told as the haunting) and end (the ghost settles or fades) |
| FR-34 | Should | **[NEW]** The ghost's drift and the camera creep scale down on mobile: no camera push (screen already fills the view) but ghost, haunted text and rolling still run |
| FR-35 | Could | **[NEW]** Audio (FR-22) may include low hum and distant static that swell slowly; never sudden, off by default, and muted in Calm mode |

## 6. Non-functional requirements
| ID | Priority | Requirement |
|---|---|---|
| NFR-1 | Must | **[CHANGED]** Frame rate: 60 FPS desktop on a 2022 mid-range laptop, 30 FPS on a 2022 mid-range phone, during the intro, including with ghost, haunted text and camera creep running |
| NFR-2 | Must | Initial load: intro start control interactive within 3 s on 4G (about 9 Mbps, 170 ms RTT) and the intro starts within 1 s of activation |
| NFR-3 | Must | First-view download under 5 MB total (fonts, textures and models included); stretch target 2 MB |
| NFR-4 | Must | Browsers: latest two versions of Chrome, Edge, Safari (macOS and iOS) and Firefox |
| NFR-5 | Must | Devices: desktop and mobile, portrait and landscape, 360 px to 2560 px wide; text on screen stays readable (at least 16 CSS px equivalent) |
| NFR-6 | Must | Accessibility: WCAG 2.2 AA for 2D UI (contrast is measured in greyscale against the screen backgrounds), full keyboard operation, visible focus |
| NFR-7 | Must | Privacy: no personal data, no cookies, no third-party trackers or runtime third-party requests; analytics are not included |
| NFR-8 | Must | No backend: the site is a static deployable bundle; all generated facts are baked in at build time |
| NFR-9 | Should | Build is reproducible: building the same commit twice gives the same facts file (timestamps taken from git, not the wall clock) |
| NFR-10 | Should | Battery and thermals: frame rate caps to 30 FPS when the tab is hidden or the device reports low power where detectable; rendering pauses when the tab is hidden |
| NFR-11 | Should | Lighthouse accessibility score 95 or higher; no console errors on load |
| NFR-12 | Must | Process: the git repo exists from the first step; each phase step is a separate commit with a clear, imperative message, and no squashing or history rewriting after commit |
| NFR-13 | Must | Licensing: all fonts, textures and audio are original or open-licence; sources and licences are recorded; no real broadcaster marks or test cards are reproduced |
| NFR-14 | Should | Text uses Australian English |

## 7. MVP scope
**[CHANGED]** The MVP is every Must requirement: FR-1 to FR-5, FR-7 to FR-13, FR-16 to FR-20, FR-24 to FR-33, and NFR-1 to NFR-8, NFR-12, NFR-13. This is well over ten Musts. The brief makes truthfulness, accessibility and the diary non-negotiable, and the user has fixed all four animation types as in scope. If scope must shrink, the first candidates to move to Should are FR-28 (haunted set) and FR-29 (camera creep), as they are the most 3D-heavy. Already Should: test card, fact-vs-joke lint, diary index, touch polish, hidden-tab handling, mobile scaling (FR-34).

MVP in one sentence: click to power a greyscale haunted CRT on and off, hear a ghost tell its own build as a slow, creepy story with haunted text, a ghost in the static and a misbehaving set, all facts generated from real data and verified by a test, with skip/replay, Calm mode, a content note, reduced-motion, a DOM transcript and a non-WebGL fallback, delivered as a static site.

## 8. Out of scope (this release)
| ID | Item |
|---|---|
| FR-X1 | Won't: backend, accounts, comments, guest book, saved state |
| FR-X2 | Won't: colour mode or colour TV era styling |
| FR-X3 | Won't: reproducing any real broadcaster's test card, logo, ident, jingle or trademarked graphic |
| FR-X4 | Won't: multi-language intro |
| FR-X5 | Won't: analytics or cookies |
| FR-X6 | Won't: real video playback or live TV content |
| FR-X7 | **[NEW]** Won't: jump scares, gore, graphic violence, or real-world tragedies as story material |
| FR-X8 | **[NEW]** Won't: ghosts, characters or imagery recognisably taken from existing horror films, games or books |

## 9. Assumptions
1. "1970s television" means a UK/Australia/US-neutral generic look, not any specific country's broadcaster.
2. The intro is in English (Australian), roughly 30 to 60 s, and is not voiced.
3. **[CHANGED]** The tone is creepy first, darkly funny second; content stays within a mild horror rating (no gore, no jump scares, nothing that targets people).
3a. **[NEW]** The user has decided: 3D set on desktop and screen-filling on mobile; power toggles on and off; audio optional and off by default; the site name is "Transmission Pending"; fonts are VT323 (Bedstead dropped over a licence caveat); the intro names the tool, plugin and model openly.
4. The site is one page with no routing needed beyond teletext pages in app state.
5. Facts come from this repo only. The agent team and plugin are real inputs, recorded in docs and handoff notes that the build can read.
6. The commit count is "as of the build commit"; the final delivery commit itself may add commits after the one shown, and the intro wording accounts for this.
7. Hosting is a static host chosen by the devops-engineer and architect.
8. Flash limits follow WCAG 2.2 success criterion 2.3.1 as the testable standard.

## 10. Open questions
**[CHANGED]** Q1, Q3, Q4 and Q5 were resolved by the user (see assumption 3a); the page title is "Transmission Pending". Remaining:

| # | Question | Why it matters | Default if unanswered |
|---|---|---|---|
| Q2 | How strictly must the intro match the build at the moment a visitor sees it, given commits made after the deployed build? | Defines wording like "as of commit X" | Facts are as of the build commit, and the intro says so (the user kept this) |
| Q6 | **[NEW]** Which public host or URL will it deploy to? | Affects delivery and metadata | Generic static host chosen by devops-engineer |
| Q7 | **[NEW]** Should the ghost be given a name or stay nameless? | Affects the copy | Nameless ("the Occupant") |
