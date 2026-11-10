# Requirements: 1970s TV self-introduction site

## 1. Overview
A black-and-white website presented as a 1970s television set. On entry, the "TV" powers on and delivers a deliberately terrible, self-deprecating introduction describing how the site was built. Every factual claim in that introduction must be true of the real build and must be derived from real project data, not hand-written. The site is a single-page, static, front-end-only experience for curious visitors, developers and anyone who enjoys retro-TV nostalgia and dry humour.

## 2. Goals
| # | Goal | Measure |
|---|---|---|
| G1 | Convincing 1970s CRT look | Reviewer checklist (FR-2 to FR-5) passes; output is strictly greyscale |
| G2 | Intro facts never drift from the real build | 100% of numeric/named facts resolve from generated data; build and tests fail on mismatch (FR-8 to FR-11) |
| G3 | Funny but safe and accessible | Intro is skippable, replayable, reduced-motion aware, no flashing above limits (FR-12 to FR-16) |
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
The visitor sees a stylised 1970s television set in a dark room, with a curved CRT screen. Pressing the power control (click, tap, Enter or Space) switches the set on with a warm-up: a bright line collapses to a dot, static hisses into view, then an original test-card-style graphic settles. The intro then plays on the screen as teletext-style type, line by line, with scanlines, phosphor glow, slight screen curvature, vignette and light interference. The tone is hostile to its own quality ("we are not sure why this works"). Facts are slotted in from real build data (agents, phases, stack, commit count). After the intro the screen shows a teletext-style page index (build diary). A visible control lets the visitor skip or replay at any time. If 3D is unavailable or reduced-motion is on, an equivalent 2D/static presentation is used. Whether the TV body is real 3D geometry or a screen-only shader effect is the architect's decision, provided the look in FR-2 to FR-5 is met.

## 5. Functional requirements

### Entry and presentation
| ID | Priority | Requirement |
|---|---|---|
| FR-1 | Must | On first load the visitor sees a powered-off TV with one clearly labelled control to switch it on; the intro does not start until the visitor activates it |
| FR-2 | Must | All rendered pixels (3D scene, screen, UI, favicon) are greyscale: R=G=B within a tolerance of 2 levels in a sampled screenshot |
| FR-3 | Must | The screen shows scanlines, static noise, phosphor glow, edge vignette and slight curvature, all visible in a desktop screenshot |
| FR-4 | Must | Text on the screen uses a teletext-style blocky/mosaic typeface and a period-appropriate sans or monospace for headings; fonts are open-licence or original, and licences are listed in the repo |
| FR-5 | Must | Power-on shows a warm-up sequence (line to dot to static to test card) lasting 1 to 3 s |
| FR-6 | Should | An original test-card-style graphic (circles, grid, bars in greys, resolution wedges) is shown as idle and loading state; it must not copy any real broadcaster's card, logo or trademark |
| FR-7 | Should | The TV set body (bezel, knobs, speaker grille, wood-effect rendered in greyscale) is modelled and lit in the scene, with the camera framed so the screen fills most of a phone portrait view |

### Intro content and truthfulness
| ID | Priority | Requirement |
|---|---|---|
| FR-8 | Must | The intro plays after power-on, in a deliberately terrible, self-deprecating tone, lasting 30 to 60 s at default speed |
| FR-9 | Must | Every factual claim in the intro (counts, dates, names, versions, phases) is produced at build time from real sources (git log, package.json, docs/ files, agent handoff notes); no such fact is typed by hand into copy |
| FR-10 | Must | Intro copy is authored as templates with named placeholders; the build fails if a placeholder is unresolved, a source is missing, or a resolved fact is empty |
| FR-11 | Must | An automated test recomputes each fact independently from the repo and fails if it differs from the value shown in the intro (including text read from the rendered page) |
| FR-12 | Must | The intro states at least: the number of commits, the date of the first commit, the list of AI agent roles involved, the build phases in order, and the main stack with versions from package.json |
| FR-13 | Must | The intro names the commit it was generated from (short hash) and words self-referential facts as "as of commit <hash>", so the commit-count claim is true for that commit |
| FR-14 | Should | Jokes may be hand-written but must not assert facts; a lint or review rule distinguishes joke text from fact text, and any digit in hand-written copy fails the build unless allow-listed |
| FR-15 | Should | After the intro, a teletext-style "page 100" index lists the build diary: each commit subject from the real git log, generated at build time, navigable by page number keys, arrow keys, or tap |

### Control and accessibility
| ID | Priority | Requirement |
|---|---|---|
| FR-16 | Must | A visible, keyboard-focusable Skip control is available throughout the intro, and a Replay control after it; both have text labels |
| FR-17 | Must | With prefers-reduced-motion: reduce, the intro shows as static text pages (manual or slow auto advance), with no camera movement, no rolling, no jitter, and flicker/noise replaced by a static texture |
| FR-18 | Must | The full intro text exists as real DOM text readable by screen readers (not only in canvas or an image), in reading order, with the TV shown as decorative or with a short text alternative |
| FR-19 | Must | No part of the experience flashes more than 3 times in any one second, and no large area flashes with a relative luminance change over the WCAG general flash threshold; power-on and static respect this |
| FR-20 | Must | If WebGL is unavailable or context creation fails, a 2D (CSS or canvas 2D) presentation delivers the same intro, controls and facts, with a notice |
| FR-21 | Should | The intro is usable on touch: tap power, tap Skip, swipe or tap for pages |
| FR-22 | Could | Optional period-style audio (hum, static, click) is off by default, with a visible mute/unmute control; no audio plays without an explicit action |
| FR-23 | Could | Channel-change transition between pages (brief greyscale static burst within FR-19 limits) |

## 6. Non-functional requirements
| ID | Priority | Requirement |
|---|---|---|
| NFR-1 | Must | Frame rate: 60 FPS desktop on a 2022 mid-range laptop, 30 FPS on a 2022 mid-range phone, during the intro |
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
The MVP is every Must requirement: FR-1 to FR-5, FR-8 to FR-13, FR-16 to FR-20, and NFR-1 to NFR-8, NFR-12, NFR-13. This exceeds ten Must requirements. The reason is that the brief makes truthfulness, accessibility and the diary non-negotiable. Items already moved to Should: test card, TV body modelling, fact-vs-joke lint, diary index, touch polish, hidden-tab handling.

MVP in one sentence: click to power on a greyscale CRT, watch a generated-from-real-data terrible intro with skip/replay, with reduced-motion, screen-reader text and a non-WebGL fallback, deployed as a static site with a verified-facts test.

## 8. Out of scope (this release)
| ID | Item |
|---|---|
| FR-X1 | Won't: backend, accounts, comments, guest book, saved state |
| FR-X2 | Won't: colour mode or colour TV era styling |
| FR-X3 | Won't: reproducing any real broadcaster's test card, logo, ident, jingle or trademarked graphic |
| FR-X4 | Won't: multi-language intro |
| FR-X5 | Won't: analytics or cookies |
| FR-X6 | Won't: real video playback or live TV content |

## 9. Assumptions
1. "1970s television" means a UK/Australia/US-neutral generic look, not any specific country's broadcaster.
2. The intro is in English (Australian), roughly 30 to 60 s, and is not voiced.
3. "Terrible" refers to comedic self-deprecation and lowbrow jokes, not offensive content; the humour is clean and does not target people.
4. The site is one page with no routing needed beyond teletext pages in app state.
5. Facts come from this repo only. The agent team and plugin are real inputs, recorded in docs and handoff notes that the build can read.
6. The commit count is "as of the build commit"; the final delivery commit itself may add commits after the one shown, and the intro wording accounts for this.
7. Hosting is a static host chosen by the devops-engineer and architect.
8. Flash limits follow WCAG 2.2 success criterion 2.3.1 as the testable standard.

## 10. Open questions
| # | Question | Why it matters | Default if unanswered |
|---|---|---|---|
| Q1 | Is a modelled 3D TV set required, or is a full-screen CRT shader effect acceptable? | Drives scope, download size and mobile performance | Real 3D TV body on desktop, screen-filling on mobile |
| Q2 | How strictly must the intro match the build at the moment a visitor sees it, given commits made after the deployed build? | Defines wording like "as of commit X" | Facts are as of the build commit, and the intro says so |
| Q3 | Should the intro reveal the AI-agent process openly (names of agents, plugin, model), or only describe it generally? | Determines which facts are sourced | Reveal openly: roles, phases and tools |
| Q4 | Is audio wanted? | Adds licensing and autoplay handling | Optional and off by default (Could) |
| Q5 | Is there a target host or public URL, and a project name for the page title? | Affects delivery and metadata | Generic static host; title "Transmission Pending" (placeholder) |
