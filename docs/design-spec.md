# Design spec: Transmission Pending

Owner: ux-ui-designer. Status: Phase 3 deliverable (2026-11-10), revised the same day for the ghost-story scope change (section 16 is new; sections 1, 2, 6, 7, 10, 14 and 15 were revised). Tokens: `src/styles/tokens.css`. Copy: `src/content/intro.tmpl`. Fonts: `public/fonts/LICENCES.md`.

Terms: "set" is the 3D TV model. "Screen" is the CRT picture, drawn from one teletext canvas (ADR 0005). "Dock" is the DOM control strip. "Safe screen width" (W) is the screen's on-screen width in CSS px multiplied by `--tt-safe-area` (0.92), which removes the edge lost to curvature.

## 1. Visual direction

Mood: a quiet room, late at night, one television, and something inside it that has been waiting. Creepy first, with dark humour second. Slow dread, never a shock. The set is the only light source. Everything is black, white and grey, so the contrast between a warm-looking object and a cold picture comes from texture and luminance, never hue.

References (styles only, nothing copied): a mid-1970s wood-cabinet portable, teletext information services, engineers' test patterns, the sign-off of a late-night transmission, and the dry tone of a continuity announcer who has stopped being human. The story and every animation are specified in section 16.

How the layers fit together:

| Layer | Look |
|---|---|
| Room | Near-black wall and shelf, faint paper-pattern texture, soft pool of light from the screen that is low-pass filtered so it never flashes (section 7) |
| Set | Wood-effect cabinet in greyscale, dark bezel, curved glass, chunky knobs, speaker grille (section 10) |
| Screen | Teletext type on black, scanlines, phosphor glow, vignette, mild barrel curvature, fine static; during the story, haunted text and the Occupant's figure (section 16) |
| DOM UI | Looks like hardware labels and teletext "fastext" keys: flat light-grey keys with dark condensed caps, square corners, no blur panels, no gradients |

Rules for every state: greyscale only (R=G=B); nothing drawn in a hue, including antialiasing, shadows and the favicon. Copy is Australian English and upper case on the screen (set by the copy, not CSS). UI labels use Title case or caps in the display face.

Verified facts are drawn as inverse blocks (`--screen-fact-bg` with `--screen-fact-text`), copy as plain `--screen-text`. The honesty page of the intro tells the visitor this. The DOM transcript uses the same styling on `[data-fact]` spans.

## 2. User flows

### E1 Power on and first view

```text
Load -> start screen (set OFF, test card not shown, screen dark with faint reflection)
  assets loading? -> screen shows dim test card + "TUNING... NN%", Power disabled
  asset fails?    -> screen shows "NO SIGNAL" + Retry key + "Use plain version" key
  ready           -> Power enabled, receives focus ONLY if the visitor has not moved focus
Power (click, tap, Enter, Space on button; click the power knob in 3d-set)
  -> warm-up (2.2 s, section 6.1) -> intro (section 6.3)
```

Start screen content (DOM, always present, not in the canvas): site name "Transmission Pending" (h1), one line "A television with something to say.", the Power key labelled "Switch on", and, before power-on (FR-24):

- Content note, plain text, `--text-sm` or larger, 4.5:1 or better, directly under the Power key: "Mild horror theme. Slow and creepy, with no jump scares. Expect flicker, trembling text, a pale figure and a slowly closing camera. Calm mode turns every effect off."
- The Calm mode switch beside it (label "Calm mode", `aria-pressed`, 44 px target). When the OS reduced-motion setting is on it reads "Calm mode: on (system setting)" and cannot be turned off here. The note references it in the accessible description of the Power key (`aria-describedby`), so a screen reader hears the note when it reaches Power.

### E2 The ghost story ("Haunted TV tells its build")

```text
warm-up ends -> 9 story pages (section 16.2), haunting builds in steps of 2 s or more
  last line complete + 3.0 s hold -> haunting eases out over 3 s -> end state: page 100 build diary index
Skip anytime -> haunting eases out over 1.2 s (cues cancelled) -> end state within 500 ms
Calm / reduced motion -> same pages, no effect of any kind (section 16.8)
```

### E3 Control and accessibility

```text
Skip   (playing)  -> index P100, focus moves to Replay
Replay (ended)    -> page 1 of the intro from the top, no warm-up, focus moves to Pause
Pause/Play        -> freezes the reveal and the page timer (WCAG 2.2.2); label flips
Read full text    -> opens the transcript panel (focus trapped, Escape closes, focus returns)
Sound             -> off by default; toggles; label states the result ("Sound on" / "Sound off")
Reduced motion    -> OS setting read live; no reload (US-9)
Calm mode         -> a key in the dock at all times (FR-31) and on the start screen; on = every haunting effect, camera move and animated noise off; persists for the visit; turning it on mid-story cancels running effects within one frame (no fade, no flash)
Power off         -> Power toggles; off collapses to a dot, cancels cues, resets haunting to zero
No WebGL / context lost -> 2D mode takes over at the current page and line, with a notice (US-12)
```

### E4 Delivery: nothing to design beyond load and error states (section 8).

### E5 Extras: audio (off, explicit unmute), channel-change burst (Could, section 7.4).

## 3. Layout per mode

### 3.1 Mode choice and the 3d-set / 3d-screen breakpoint

```css
/* 3d-set requires ALL of these; otherwise 3d-screen (WebGL2 permitting, otherwise 2d) */
@media (min-width: 1024px) and (min-height: 600px) and (min-aspect-ratio: 5/4)
  and (hover: hover) and (pointer: fine)
```

| Case | Mode | Why |
|---|---|---|
| Laptop or desktop window 1024 wide or more, landscape-ish, mouse | `3d-set` | Room to show the set; fine pointer for orbit and knob clicks |
| Tablet in landscape (coarse pointer) | `3d-screen` | Touch cannot hover, the set's knobs are small targets, and GPU cost is higher |
| Desktop window narrower than 1024 or taller than 4:5 | `3d-screen` | The set would shrink under the 16 px glyph floor |
| Phones, any orientation | `3d-screen` | User decision: screen fills the view |
| No WebGL2, creation failure or context lost | `2d` | FR-20 |

The mode is re-evaluated at load, and on resize or orientation change only while `status` is `off`, `loading`, `ready` or `ended`. It never switches mid-playback, except to `2d` on context loss. A forced `?mode=` always wins. The resize check is debounced by 300 ms.

### 3.2 `3d-set` (desktop)

```text
+----------------------------------------------------------------------+
| TRANSMISSION PENDING                                    [Reset view] |  HUD, top edge
|                                                                      |
|                 +--------------------------------+                   |
|                 |  cabinet                       |                   |
|                 |  +-----------------+  o   o    |                   |
|                 |  |                 |  ======   |                   |
|                 |  |     SCREEN      |  ======   |  grille           |
|                 |  |                 |  (power)  |                   |
|                 |  +-----------------+           |                   |
|                 +--------------------------------+                   |
|          [Switch on] / [Skip] [Pause] [Sound off] [Read full text]   |  dock, bottom centre
+----------------------------------------------------------------------+
```

- Canvas fills the viewport at `--z-canvas`; DOM sits above with `pointer-events: none`, and each control sets `auto`.
- The centre of the viewport is clear. HUD at the top edge, dock centred 24 px above the bottom edge (`--space-6`).
- The set's projected screen width: `Wscreen = min(0.56 x vw, 0.82 x vh)`, at the watch pose (section 4.2). At 1024 x 600 this is 492 px; W = 453 px, so 40 columns.
- Dock keys are real DOM buttons, so the experience works without picking 3D objects. The 3D power knob is a second route to the same action.
- Dock keys: height `--target-min` (44 px) or more, width fits label plus `--space-4` padding each side.

### 3.3 `3d-screen` (phones, tablets, narrow windows)

Portrait:

```text
+------------------------+
| (8 px bezel)           |
| +--------------------+ |
| |                    | |
| |                    | |
| |   SCREEN fills     | |
| |   the view         | |
| |                    | |
| |                    | |
| +--------------------+ |
| [Skip][Pause][Snd][Txt]|  dock, 64 px, outside the screen
+------------------------+
```

Landscape (viewport height under 500 px): the dock moves to a vertical strip on the right, 64 px wide (`--dock-size`), buttons stacked, each 44 px or more. Respect `env(safe-area-inset-*)` on all four sides.

- The screen is a curved quad, `Wscreen = viewport width - dock (landscape only) - 2 x --bezel-thin`; height is the viewport height minus the dock (portrait) and minus 2 x bezel.
- Bezel: `--bezel-thin` (8 px) in `--tv-bezel`, with `--shadow-bezel-inset`. No wood, no knobs, no model download.
- The screen's aspect follows the viewport. The corner radius is `--radius-screen`.
- No camera movement of any kind. A static framing; the curvature is in the shader.
- Rows: see section 5.3. The dock never overlaps the screen.

### 3.4 `2d`

Same as `3d-screen`, built from DOM and CSS:

- Wide viewport (1024 px and over): a 4:3 screen centred, max width 960 px, on `--color-room`, in a flat greyscale bezel (`--tv-bezel`, 24 px, `--radius-lg`), no knobs.
- Narrow viewport: the screen fills the view exactly as `3d-screen`.
- CRT on a flat element: scanlines as a `repeating-linear-gradient` (`--crt-scanline-pitch`, `--crt-scanline-opacity`), vignette as `--shadow-screen-inset`, corner radius `--radius-screen`, glow as `text-shadow: 0 0 6px var(--screen-glow)`, static as a pre-rendered greyscale noise tile (`--crt-noise-opacity`, frozen under reduced motion). No fake curvature warp.
- A notice bar above the screen when 2D was reached by failure: "3D is not available here, so you are getting the plain set. Everything else is the same." Role `status`, not dismissible for the first 8 s, then dismissible. When 2D is chosen with `?mode=2d` no notice is shown.
- The visible screen text is the transcript component itself (same DOM as the screen-reader text), laid out on the teletext grid with `ch` units and `--font-teletext`.

### 3.5 Shared HUD and dock contents

| Element | Where | Shown when |
|---|---|---|
| Site name "Transmission Pending" | top-left (3d-set), part of the start screen elsewhere | always visible in 3d-set; others show it on the start screen and in the page `h1` (visually hidden after power-on) |
| Reset view | top-right | `3d-set` only, full motion only, after power-on, and only when the camera is off the watch pose |
| Switch on | dock | status `off`, `loading` (disabled), `ready` |
| Skip | dock | status `warming` (disabled), `playing` |
| Pause / Play | dock | `playing` |
| Replay | dock | `ended`, and during `playing` after Skip's first use is not needed |
| Sound on/off | dock | always after load; off by default |
| Read full text | dock | always |
| Page keys: Prev, Next, Index | dock | `ended` (diary) and reduced motion (manual advance) |

On `3d-screen`, if the dock holds more than four keys, the extras collapse into a "More" key opening a bottom sheet (`--z-panel`) with the remaining keys, 44 px rows.

## 4. Camera behaviour (`3d-set` only)

### 4.1 Rig

Perspective camera, vertical FOV 32 degrees, target at the screen centre. Orbit-style rig (drei `CameraControls` or `OrbitControls`), pan disabled, damping 0.08. Distances below are expressed relative to the "watch distance" D (the distance at which `Wscreen = min(0.56 x vw, 0.82 x vh)`), so they stay correct on every window size. Recompute D on resize (debounced 150 ms) while no tween runs.

### 4.2 Poses

| Pose | Azimuth | Elevation | Distance | When |
|---|---|---|---|---|
| Idle (set OFF) | +14 deg (towards the visitor's right) | +5 deg | 1.45 x D | Load, `loading`, `ready` |
| Watch | 0 deg | 0 deg | 1.0 x D | From Power press; `ended` |

### 4.3 Interactions

#### Interaction: Power on dolly
- Trigger: Power activated (dock key or 3D knob).
- Feedback: knob rotates 40 degrees over 150 ms; click sound only if sound is on.
- Camera: eases Idle to Watch over `--duration-camera` (1200 ms, `--ease-camera`), concurrent with the warm-up (the picture does not wait). Input is ignored while it runs.
- Exit: none; it is a one-way tween that the visitor caused. Reduced motion: no tween, the camera is placed at Watch at once.

#### Interaction: Orbit
- Trigger: drag with the primary button on empty space or the set body, after power-on; or the arrow keys when the canvas stage has focus.
- Feedback: cursor `grab` then `grabbing`; damping 0.08.
- Limits: azimuth -25 to +25 degrees, elevation -8 to +15 degrees, distance 0.8 x D to 1.3 x D (wheel or plus and minus keys). Pan is off. The screen can never lose more than 35 per cent of its width off the view.
- Keyboard: arrows rotate 4 degrees per press (hold repeats), plus and minus zoom 5 per cent, Home resets.
- Disabled while the visitor has reduced motion on (camera fixed at Watch, US-9), and while the Power tween runs.

#### Interaction: Reset view
- Trigger: the Reset view key, the Home key, or double-click on empty space.
- Camera: eases to Watch over `--duration-camera-reset` (700 ms); instant under reduced motion.
- The key is hidden until the camera has moved at least 2 degrees or 5 per cent from Watch.

#### Interaction: Hover and select (3D parts)
| Part | Hover (fine pointer) | Click | Keyboard route |
|---|---|---|---|
| Power knob | Outline in `--grey-1000`, cursor `pointer`, DOM tag "Power" anchored beside it (drei `Html`, `occlude`) | Same as the Switch on key | The Switch on key |
| Channel knob | Same outline, tag "Channel" | Steps to the next page (ended state, or reduced motion); in `playing` it does nothing and the tag reads "Channel (after the show)" | Next key |
| Volume knob | Same outline, tag "Sound" | Toggles sound | Sound key |
| Screen | No hover effect | None | none |

Outline reaches full strength within 100 ms. Touch devices never use `3d-set`, so there is no touch hover case. Every action is also in the dock (section 3.5).

## 5. The teletext grid

### 5.1 Rules

- Cell width = `--tt-cell-aspect` (0.6) x font size f. Row pitch = `--tt-row-pitch` (1.1) x f. Font size is never below 16 CSS px (`--tt-min-font-px`) on the displayed screen. "CSS px equivalent" means the glyph's size as seen on screen, not the canvas texture size: texture size x (on-screen width / texture width).
- The grid occupies the safe area only (`--tt-safe-area` 0.92 of the screen width and height), centred.
- Column count is chosen from the safe screen width W (CSS px), then f = W / (cols x 0.6), then rows = floor(Hsafe / (1.1 x f)).

### 5.2 Columns and breakpoints

| Safe screen width W | Columns | f at the smallest W in the band | Typical device |
|---|---|---|---|
| 384 px and over | 40 | 16.0 px | Desktop, tablet, large phone landscape |
| 320 to 383 px | 32 | 16.7 px | Phones from 360 wide in portrait (W is about 324 at 360) |
| 250 to 319 px | 26 | 16.0 px | Small phones and the 3d-screen with a wide dock |
| 192 to 249 px | 20 | 16.0 px | Minimum supported (viewport 208 px) |
| under 192 px | not supported | | The 2D plain version is offered |

Caps: f is capped at 40 px (large desktop screens use the same 40 columns with bigger glyphs; the canvas is 960 x 720 logical in `3d-set` and is only scaled by the GPU). In landscape on short screens f is also capped so that at least 12 rows fit: `f = min(W / (cols x 0.6), Hsafe / (12 x 1.1))`; the grid is then centred with side margins.

Worked examples:

| Case | Viewport | W (safe) | Columns | f | Rows |
|---|---|---|---|---|---|
| 3d-set, laptop | 1440 x 900 | 0.92 x min(806, 738) = 679 | 40 | 28.3 px | 0.92 x 553 / (1.1 x 28.3) = 16 |
| 3d-set, small | 1024 x 600 | 0.92 x min(573, 492) = 453 | 40 | 18.9 px | 0.92 x 369 / 20.8 = 16 |
| 3d-screen, phone portrait | 360 x 740 | 0.92 x (360 - 16) = 316 | 26 | 20.3 px | 0.92 x 652 / 22.3 = 26 |
| 3d-screen, large phone | 430 x 932 | 0.92 x 414 = 381 | 32 | 19.8 px | 0.92 x 844 / 21.8 = 35 |
| 3d-screen, phone landscape | 740 x 360 | 0.92 x (740 - 64 - 16) = 607 | 40 | 25.3 px, then capped by height to 24.3 | 12 |
| 2d, small | 208 x 500 | 0.92 x 192 = 177 | not supported | | |

The 360 px portrait case is 316, below 320, so it uses 26 columns at 20 px: glyphs are comfortably over 16 px. Round W down to a whole pixel before choosing the band.

### 5.3 Page layout

| Row | Content |
|---|---|
| 0 | Header bar: page tag (left) and revision `REV <source.shortHash>`-style text from `source.revision` (right), on `--screen-header-bg`, text `--screen-header-text`. Hidden when W is in the 20-column band |
| 1 | Page title in double height when rows allow, otherwise single height |
| 2 to n-2 | Content lines, wrapped on word boundaries to the column count; a word longer than the column count is hard-broken with no hyphen |
| n-1 | Fastext row: four labelled cells, grey blocks |

Long pages sub-page: if wrapped lines do not fit, the page splits into sub-pages shown as "1/2", with the same hold rule per sub-page. The header tag shows the intro as `INTRO 3/8` and the diary as `P100`, `P101` and so on.

Colour mapping: copy `--screen-text`; headings `--screen-text-strong`; facts inverse block (`--screen-fact-bg`/`--screen-fact-text`); rules and mosaic graphics `--screen-rule`; fastext cells alternate `--tt-1` to `--tt-4` with `--tt-7` text so the four keys read as different greys without hue.

Mosaic graphics (rules, the page-100 frame, the fastext blocks) are filled rectangles drawn by the rasteriser (VT323 has no sextant glyphs, section 14).

### 5.4 Page 100 build diary (FR-15)

- Index pages "P100" onward list `git.commits` oldest first, one entry per row: `101 <subject>`. Subjects wrap onto continuation rows indented by 4 cells; never truncated. Entries per sub-page = content rows divided by wrapped height.
- Typing digits shows `P1__` in the header's page tag as they are entered; on three digits the page opens if it exists, otherwise the tag blinks no more than once (a single 200 ms flash on the tag only) and shows "NO SUCH PAGE" on the row beneath the header for 2 s.
- A commit page `P1nn` shows: subject (double height), short hash, date (`dateDisplay`), and "Page n of N". Page numbers cap at 899; the last sub-page is labelled "LAST PAGE".
- Navigation: Left and Right arrows (or Prev and Next keys, or tap on the left and right halves of the dock keys), Up and Down move between entries, digit keys jump, Backspace clears entry, Home goes to P100.
- Touch: tap an entry (row hit area at least 44 CSS px tall; at the 20 and 26 column bands rows are padded by the transcript hit layer, see section 9.4) or the Prev, Next and Index keys.

## 6. Flows in detail: power-on, warm-up, intro, skip, replay, end state

### 6.1 Warm-up (full motion), 2.2 s, within FR-5's 1 to 3 s

| t (ms) | Picture | Luminance rule |
|---|---|---|
| 0 | Screen black; click sound if sound on | Mean luminance 0 |
| 0 to 300 | A horizontal line, 2 CSS px tall, grows from the centre to the full screen width | Area under 1 per cent |
| 300 to 700 | The line shrinks to a dot (radius 5 CSS px) with a soft glow, leaving a faint afterglow that fades in 400 ms | Peak area under 1 per cent |
| 700 to 1000 | The dot holds. Glow eases once (no pulse train) | No change |
| 1000 to 1500 | Static fades in from the dot outward, opacity 0 to 0.6, grain size at least 2 CSS px | Mean rises 0 to 0.15 (relative luminance), monotonic |
| 1500 to 2200 | Static cross-fades to the test card; the test card's brightness ramps 0.3 to 1.0 | Mean rises 0.15 to the card's own mean (about 0.30), monotonic, no overshoot |
| 2200 | Warm-up ends; intro starts after a 300 ms hold on the card | |

The dock Skip key is disabled during `warming` (the sequence is short). Pressing Escape or S during `warming` does nothing.

Reduced motion: no warm-up. Power cuts straight to the static test card. After 1.5 s of that card (or at once if the visitor presses Next) page 1 shows. No line, dot or static.

### 6.2 Test-card idle and loading

The card (section 11) is the idle picture whenever a screen has power but no page: during `loading` (dimmed to 40 per cent, with `TUNING... NN%` plate), at warm-up's end, and behind the pages' title if desired. It is static under reduced motion; in full motion only the shared noise layer moves.

### 6.3 Intro playback

Reveal rules (the frontend exports these constants; QA computes duration from `intro.characterCount`):

| Constant | Value | Notes |
|---|---|---|
| `REVEAL_CPS` | See `src/state/timing.ts` | Slower than the first design (90), so the story breathes; a block cursor leads the line |
| `LINE_GAP_MS` | See `src/state/timing.ts` | Between lines on one page |
| `PAGE_HOLD_BASE_MS` | See `src/state/timing.ts` | After the last line of a page completes |
| `PAGE_HOLD_PER_CHAR_MS` | See `src/state/timing.ts` | Added per character on the page |
| `END_HOLD_MS` | See `src/state/timing.ts` | After the last page, before the haunting eases out and the diary index shows |

The values are not repeated here because the frontend retunes them (target for the ghost story: 65 to 75 s of intro, never outside FR-8's 45 to 90 s). `src/state/timing.ts` is the source of truth, and `estimateIntroDurationMs` there gives the baseline without effect holds. Measured with the first constants in round 2: 89.3 s with 17 commits and 7 agents, because the facts grow the text (each role, stack entry or commit-count digit adds characters) and effect holds add up to 6 s per page. Rule: after any change to the copy, the role list or the constants, re-measure the full run and keep it inside 45 to 90 s. Page timings are the cue schedule's basis (section 16.3), so changing a constant moves every cue automatically because cues are anchored to lines, not to seconds.

Page change: a hard cut (page cleared and the next one starts at row 1). No static burst unless the Could feature in 7.4 is built. Header tag updates with the cut.

Pause: freezes reveal and the page timer; the block cursor stops blinking and shows solid.

### 6.4 Skip

- Trigger: Skip key; shortcut S (section 9.3). Allowed during `playing` only.
- Result within 500 ms: page P100 (diary index). The reveal is not completed; the transcript is unaffected.
- Focus moves to Replay. Live region (polite): "Intro skipped. Build diary showing."
- Skip is also offered on touch with identical size and behaviour (US-8).

### 6.5 Replay

- Trigger: Replay key; shortcut R. Available in `ended`.
- Result: the screen cuts to a black frame for 200 ms (no static), then page 1 begins. No warm-up. Haunting state returns to zero (a camera creep eases back over 700 ms, because the visitor caused it; ghost, dim and shadow are cut while the screen is black, which is a single step to black and not a flash).
- Focus moves to Pause. Live region: "Replaying the intro."
- Under reduced motion: page 1 shows at once.

### 6.6 End state

When the last page's hold plus `END_HOLD_MS` completes, or on Skip:

- `status` becomes `ended`; the screen shows P100.
- Dock: Skip and Pause disappear, Replay and the page keys (Prev, Next, Index) appear. Focus moves to Replay only if focus was on a removed key; otherwise it stays put.
- The last intro page is not shown again unless the visitor replays.
- The camera returns to Watch: the creep eases back to zero over 3 s (natural end) or 1.2 s (Skip); under Calm it was never off Watch.

### 6.7 Reduced-motion intro (FR-17)

- A page shows complete at once (no typing, no cursor movement), static texture, no jitter or rolling bars, fixed camera.
- Advance by the Next key, Space, Enter or the Right arrow, or by tapping the screen's right half. A visible "Auto-advance: Off" toggle is offered (a key in the dock, default off). When on, a page stays for `max(8 s, 25 ms x characters)`.
- Total pages are the same; Skip and Replay work as above.

## 7. Motion and flash rules

### 7.1 Hard rules (WCAG 2.3.1 and FR-19)

1. No element or region changes between two states more than 3 times in any one second. Counted by the QA frame check (screen area and full frame).
2. Any change of relative luminance across more than 25 per cent of a 10-degree visual field (use 341 x 256 CSS px as the area at a typical viewing distance, so about 87,000 px) must stay below a 10 per cent swing of relative luminance when the darker state is under 0.80. Design margin: keep the swing below 5 per cent of relative luminance per 100 ms for large areas (more than 87,000 px or 25 per cent of the screen, whichever is smaller).
3. Mean screen luminance never exceeds 0.50 (relative) and never steps up by more than 0.15 inside 500 ms, except as the monotonic ramps in 6.1.
4. No red-based flash rule applies (greyscale), but the general limits above stay in force.
5. No full-area white frame, ever. The brightest large area is the test card's white bars, which total under 8 per cent of its area.

### 7.2 Noise (static)

- Spatial grain at least 2 CSS px. Update rate at most 24 Hz in warm-up and idle, at most 12 Hz behind text.
- Per-frame noise amplitude is zero-mean: the average luminance over any 87,000 px region stays within 0.02 of the frame before. This is what makes noise safe.
- Reduced motion: noise is a single frozen texture (shader `uTime` held, 2D tile static).

### 7.3 Rolling bar and jitter (full motion only)

- Rolling hum bar: a soft band, height 18 per cent of the screen, luminance delta 0.04 or less, travels the screen in 6 s (about 0.17 Hz), looping, never faster; starts only after the warm-up and fades out with the diary index.
- Horizontal jitter: at most 0.5 CSS px, at most once every 2.5 s, 80 ms long, text lines only. Off under reduced motion.
- Glow flicker: 0.5 per cent amplitude, below 3 Hz, never reaching a threshold.

### 7.4 Channel change (FR-23, Could)

Brief static burst on page change: 250 ms, ease in and out, mean luminance rise at most 0.10, at most one burst in any 1000 ms (so under 2 flashes per second in the worst case of rapid paging; extra page changes within 1000 ms cut without a burst). Disabled under reduced motion.

### 7.5 Room light

The pool of light on the room (3d-set) follows the screen's mean luminance through a one-pole low-pass at 2 Hz, with a ceiling of 25 per cent of the maximum light intensity. It never flickers with the noise.

### 7.6 Reduced motion summary

| Thing | Full motion | Reduced motion |
|---|---|---|
| Warm-up | 2.2 s sequence | None, cut to the static test card |
| Camera | Dolly and optional orbit | Fixed at Watch, no orbit, no Reset |
| Typing reveal | 60 cps | Whole page at once |
| Page advance | Automatic | Manual (auto-advance opt-in, slow) |
| Noise | 12 to 24 Hz | Frozen texture |
| Rolling bar, jitter, glow flicker | On | Off |
| Haunted text, ghost figure, picture roll, knob turns, room dim and wall shadow, camera creep, audio swell | Cue-driven (section 16) | All off. Calm mode behaves the same as reduced motion |
| UI transitions (hover, focus) | 120 to 240 ms | 0 ms (tokens collapse) |
| Knob rotation | 150 ms | Instant |
| Channel-change burst | 250 ms | Off |

The media query and the Calm switch are read live through `displayStore.reducedMotion` (US-9, FR-31). A change takes effect on the next frame, with no reload. Flash limits for the haunting effects are in section 16.7 and apply on top of 7.1.

## 8. Loading and error states

| State | Screen (canvas or 2D) | DOM |
|---|---|---|
| Loading | Dim test card (40 per cent), plate `TUNING... NN%` from `displayStore.loadProgress`, real value only | Power key disabled, labelled "Switch on" with `aria-disabled="true"` and a visible reason line: "Tuning in, NN%" |
| Ready | Dark screen (set OFF); in 3d-set a faint window reflection | Power key enabled |
| Asset failed | Plate `NO SIGNAL` and the cause in plain words ("The set's picture did not arrive.") | A text error under the screen with Retry (reload the failed asset) and "Use plain version" (forces 2D) keys, role `alert` |
| WebGL missing | Skip 3D entirely | 2D mode and the notice (3.4) |
| Context lost mid-intro | Switch to 2D at the same page and line, no restart | Notice (3.4), focus and playback state kept |
| Fonts late | System monospace until loaded; canvas waits (`document.fonts.load`) then redraws once | none |
| Script disabled | Nothing renders | `<noscript>` block in `index.html`: "Transmission Pending needs JavaScript to switch on." (architect) |

Progress values: never fake. If progress is unavailable, show "TUNING..." with a static three-dot ellipsis (no animation under reduced motion; under full motion, advance the dots no faster than once per 500 ms).

## 9. Components and accessibility

### 9.1 Component states

Applies to dock keys, the Power key and panel buttons.

| State | Spec |
|---|---|
| Default | Fill `--color-control-bg`, text `--color-control-text` in `--font-display` weight 600, `--text-md`, caps, `--tracking-label`; square corners `--radius-sm`; shadow `--shadow-key`; min 44 x 44 px |
| Hover (fine pointer) | Fill `--color-control-bg-hover`; shadow lifts 1 px |
| Focus-visible | `outline: var(--focus-ring-width) solid var(--color-focus)` plus `box-shadow: 0 0 0 calc(var(--focus-ring-width) + var(--focus-ring-offset)) var(--color-focus-halo)` so the ring shows on light and dark; never removed |
| Active (pressed) | Fill `--color-control-bg-active`, shadow collapses, 1 px down (0 px under reduced motion) |
| Disabled | Fill `--color-control-bg-disabled`, text `--color-control-text-disabled`, no shadow, `aria-disabled="true"`, still focusable if it carries an explanation |
| Loading | Label unchanged, `aria-busy="true"`, progress is stated beside it (never a spinner) |
| Toggle on | Adds a solid 4 px bar on the key's lower edge in `--grey-0` and the label changes ("Sound on"), so state never relies on shade alone |

| Component | Notes |
|---|---|
| Power key | Large: min height 56 px. Label "Switch on"; while the set is on it reads "Switch off" and stays in the dock (power toggles, approved in Phase 3) |
| Calm mode | Dock key and start-screen switch, `aria-pressed`, label "Calm mode", toggle-on bar. Always visible (FR-31). Tab order: directly after Power |
| Skip, Pause/Play, Replay | Labels "Skip intro", "Pause" / "Play", "Replay". Order in the DOM and tab order: Power, Skip, Pause, Replay, Sound, Read full text, page keys, Reset view |
| Sound | "Sound off" by default. `aria-pressed`. Never plays until pressed (FR-22) |
| Read full text | Opens the transcript panel (9.4) |
| Reset view | 3d-set only; text label |
| Notice bar | `role="status"` for 2D notice; `role="alert"` for errors |
| Transcript panel | See 9.4 |
| Tooltips (3D tags) | `role="tooltip"` is not used; the tag is decorative, since the real label is in the dock |

### 9.2 Contrast

All pairs measured in greyscale. Minimums: text 4.5:1, large text and UI parts 3:1.

| Pair | Ratio |
|---|---|
| `--color-text` on `--color-bg` | 14:1 |
| `--color-text-muted` on `--color-bg` | 8.3:1 |
| `--color-text-subtle` on `--color-bg` | 5.9:1 (floor for body text) |
| `--color-control-text` on `--color-control-bg` | 13:1 |
| `--color-border` on `--color-bg` | 3.7:1 |
| `--screen-text` on `--screen-bg` | 14.5:1 |
| `--screen-fact-text` on `--screen-fact-bg` | 15:1 |
| `--screen-header-text` on `--screen-header-bg` | 6.1:1 |
| Focus ring (`--color-focus` with halo) | 3:1 or more against bg and against the key |

Screen text is measured against the busiest part of the screen: the static layer at maximum noise amplitude and the scanline darkening (CRT scanlines reduce effective luminance by up to `--crt-scanline-opacity`). The shader must keep the post-effect contrast of body text at 4.5:1 or better; QA samples this.

### 9.3 Keyboard

Tab order follows section 9.1. No keyboard trap, except the transcript panel (focus trap with Escape to leave).

Single-key shortcuts (WCAG 2.1.4 compliant by being active only while focus is inside the television region, that is, the stage element or any dock key): S skip, P pause or play, R replay, M sound toggle, T read full text, N or Right arrow next page, B or Left arrow previous page, I index, Home reset view (3d-set), digits page entry (diary only), Escape close panel. A "Keyboard" key (`?`) in the transcript panel footer lists them. Enter and Space activate the focused key natively; neither is remapped on a button.

The stage element: `role="group"`, `aria-label="Television"`, `tabindex="0"`; arrows rotate in 3d-set.

### 9.4 Screen-reader and non-3D alternatives

- Canvas: `aria-hidden="true"`. The TV region has `role="group"` and `aria-label="Television. The show is also available as text."`.
- The transcript (frontend) holds the full resolved intro in reading order with `data-fact` spans, visually hidden in 3D modes and visible as the screen in 2D. Page and line boundaries are headings and paragraphs: each intro page is an `h2` (its first line text, e.g. "Test card"), each line a `p`. No `aria-live` on it (US-10).
- "Read full text" opens it as a dialog (`role="dialog"`, `aria-modal="true"`, labelled "Intro text") over `--color-scrim`, in `--font-ui` at `--text-md`, line length under 70 characters, inverse blocks kept for facts, then the diary list as an ordered list. Close key and Escape. Focus returns to the key.
- Live region (single, polite, visually hidden): announces only status changes: "TV on", "Intro skipped. Build diary showing.", "Replaying the intro.", "Intro finished. Build diary showing.", "Sound on" and "Sound off", "Page 105 of the build diary". Never per-line text.
- Diary entries in the transcript are links/buttons with real text. On the canvas screen, tap targets are an invisible DOM layer over the canvas sized to row boxes with a minimum 44 CSS px height (rows are padded in hit-testing, not in drawing), aria-hidden since the transcript carries the same actions.
- Reduced motion, forced colours (focus drawn by the system) and 200 per cent text zoom: the dock and the start screen reflow into one column; nothing is clipped; the screen text scales with the screen (not with the browser's text zoom) but the DOM transcript does.
- Language `en-AU`. Page title "Transmission Pending".

## 10. Visual direction for the TV body (technical-artist)

### 10.1 Form

A mid-1970s wood-cabinet portable set, front 4:3 proportion cabinet:

| Dimension | Proportion (width = 1.0) |
|---|---|
| Cabinet width x height x depth | 1.0 x 0.78 x 0.72 (rear tapers to 0.62 wide, 0.5 high; a visible CRT bell is not needed, a tapered back shell is enough) |
| Screen | 4:3, width 0.58, left side, centred vertically, corner radius 6 per cent; glass domed with about 6 per cent depth bulge |
| Bezel | 0.045 wide dark moulded surround, inner chamfer, rounded outer corners (radius 0.04) |
| Control column | Right 0.28 of the front: two large knobs on top (channel, volume), a speaker grille below, a small power knob bottom right |
| Feet | Four short tapered legs, 0.09 high, splayed 6 degrees, on a shelf (a wide flat box) |
| Top | Slight top panel with a recessed handle slot and a ventilation strip |

### 10.2 Surfaces (all greyscale)

| Part | Material cues |
|---|---|
| Cabinet | "Walnut" as grey wood grain: base `--tv-wood-mid`, long grain streaks between `--tv-wood-dark` and `--tv-wood-light`, roughness 0.55, slight clearcoat, faint edge wear |
| Bezel and back shell | `--tv-bezel`, satin plastic, roughness 0.4 |
| Trim ring around the screen and knobs' base plates | Brushed metal in `--tv-trim`, roughness 0.35, anisotropic if cheap, else plain |
| Knobs | `--tv-knob`, ribbed edge, `--tv-knob-mark` pointer line, caps roughness 0.3; channel knob has tick marks around it |
| Grille | Horizontal slots, `--tv-grille` recess, cloth weave normal at low strength; do not model every slot, a texture is enough |
| Glass | `--tv-glass-tint`, low roughness, faint environment reflection of a window shape (luminance 0.05 or less), no strong highlight |
| Labels | Etched caps on the control plate: "POWER", "CH", "VOL" in `--font-display`, in light grey on dark, baked into the control plate texture |
| Shelf and room | Decision after the ghost-story change: the flat dark room is NOT enough, because dimming a featureless plane shows nothing. Add four cheap things (about 0 kB, all procedural): (1) a wall with a faint paper pattern, greyscale, under 8 per cent contrast, 256 x 256 tiled; (2) a dust-fall alpha texture on the shelf top; (3) a soft blob shadow under the set; (4) one wall decal, the "Occupant's shadow" (section 16.5): a vertical, slightly too tall dark oval-and-shoulders shape on the wall to the left of the set, alpha 0 by default. No real-time shadow maps, no extra lights beyond the existing key, ambient and screen-glow point light |

Greyscale rules: every material colour must have R = G = B, textures are single-channel or desaturated before export, tone mapping is `NoToneMapping` or `NeutralToneMapping` (architecture 4.5), lights are white.

### 10.3 Lighting

- Key: very dim cool-neutral white area light high and to the left (intensity about 12 per cent), just enough to read the cabinet's grain.
- Screen glow: a point light in front of the glass, intensity driven by the 2 Hz low-pass mean luminance (7.5), to soften the bezel and shelf when the set is on.
- Environment: a tiny greyscale HDR or generated gradient, low intensity.
- Soft contact shadows under the feet; no hard shadows.
- Vignette on the render (not post): the room's far corners fall to black.

### 10.4 Budget and detail

Model within 1.5 MB (Draco or Meshopt, KTX2); under 60k triangles; knobs and power button are separate nodes named `knob-power`, `knob-channel`, `knob-volume` for picking; the screen mesh named `screen` with UVs 0 to 1 covering the 4:3 glass; the cabinet pivot at the screen centre so the camera target is the origin.

## 11. Original test card

A 4:3 vector composition in a 1000 x 750 unit space (drawn by the rasteriser, or a baked texture). It has no broadcaster logo, name, clock, face, mascot or characteristic layout; it is built from generic test geometry in new proportions.

| # | Element | Spec |
|---|---|---|
| 1 | Field | Mid-grey `--tt-1` (about 24 per cent) with a 20 x 15 hairline grid in `--tt-3` (1 unit lines at 50 per cent opacity) |
| 2 | Frame | A double rule 24 units in from the edge: outer 6 units `--tt-6`, inner 2 units `--tt-3`, with square (not castellated) corners |
| 3 | Main circle | Centre (500, 360), radius 215, 6-unit line `--tt-7`, filled with the field greyscale; it must stay a circle on 4:3 (use equal x and y scale) |
| 4 | Siren | Inside the circle, a 12-sector pie disc, radius 100, sectors alternating `--tt-0` and `--tt-7`, with a 24-unit `--tt-2` hub |
| 5 | Ring steps | Around the siren, five concentric rings from radius 112 to 202, 18 units each, stepping from `--tt-1` to `--tt-6` |
| 6 | Cross | Hairline horizontal and vertical lines through the centre across the whole frame, 2 units, `--tt-6`, with small centring ticks every 50 units |
| 7 | Grey scale | A top strip (y 48 to 118, x 150 to 850), nine blocks stepping black to white, equal width |
| 8 | Ramp | A bottom strip (y 660 to 710, x 150 to 850), a continuous black-to-white gradient with a 1-unit line at each tenth |
| 9 | Wedges | Left and right edge strips (x 48 to 130 and 870 to 952, y 160 to 590): vertical groups of lines narrowing from 12 units to 1 unit as they go down, five groups, in `--tt-7` on `--tt-0` |
| 10 | Corner marks | Four quarter-circle caps (radius 60) in the frame corners, each a different grey (`--tt-2`, `--tt-4`, `--tt-5`, `--tt-6`) |
| 11 | Caption plate | Black plate (`--tt-0`), 420 x 84 units, centred at (500, 606), so y 564 to 648, between the circle and the ramp strip. Line one: `TRANSMISSION PENDING` in `--font-display` weight 600, `--tt-7`, 32 units tall. A 2-unit rule in `--tt-3` under it |
| 12 | Sub-caption | Line two inside the plate: `STAND BY` in `--font-teletext`, `--tt-5`, 22 units tall |
| 13 | Loading plate | In `loading`, replace the sub-caption with `TUNING... NN%` |

The main circle ends at y 575, so the plate's top (y 564) cuts 11 units off its lower edge: draw the plate on top. This is intended.

Portrait and narrow screens: scale the whole card to fit the shorter side, then extend the grid and field to fill the rest. The grey scale and ramp strips stretch to the full width minus 2 x the frame; the wedges sit in two horizontal bands above and below the circle instead of the sides; the circle is `min(width, height) x 0.7` across.

Motion: none on the card itself. Full motion adds only the shared noise layer. Reduced motion: the card is a still image, and a static noise tile replaces the noise.

## 12. Responsive summary

| Viewport | Mode (default) | Grid | Dock |
|---|---|---|---|
| 1024 x 600 and over, landscape-ish, mouse | 3d-set | 40 cols, about 16 rows | Bottom centre |
| 640 to 1023 wide, any pointer | 3d-screen | 40 cols if W >= 384 | Bottom, 64 px |
| Under 640 wide portrait | 3d-screen | 26 to 32 cols | Bottom, 64 px |
| Phone landscape (height under 500) | 3d-screen | 40 cols, 12 rows | Right, 64 px |
| Anything without WebGL2 | 2d | As above | As above |

Touch targets are 44 x 44 px or more everywhere (`--target-min`). Hit area may exceed the drawn key.

## 13. Token summary (`src/styles/tokens.css`)

| Group | Tokens |
|---|---|
| Grey ramp | `--grey-0` to `--grey-1000` (14 steps) |
| UI colour | `--color-bg`, `--color-room`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-border-subtle`, `--color-text`, `--color-text-muted`, `--color-text-subtle`, `--color-text-on-light`, `--color-control-*`, `--color-focus`, `--color-focus-halo`, `--color-scrim` |
| Screen colour | `--tt-0` to `--tt-7`, `--screen-bg`, `--screen-text`, `--screen-text-strong`, `--screen-fact-bg`, `--screen-fact-text`, `--screen-header-bg`, `--screen-header-text`, `--screen-rule`, `--screen-glow` |
| TV body | `--tv-wood-dark`, `--tv-wood-mid`, `--tv-wood-light`, `--tv-bezel`, `--tv-trim`, `--tv-knob`, `--tv-knob-mark`, `--tv-grille`, `--tv-glass-tint` |
| Type | `--font-teletext`, `--font-display`, `--font-ui`, `--font-weight-*`, `--text-xs` to `--text-2xl`, `--leading-*`, `--tracking-label` |
| Teletext grid | `--tt-min-font-px`, `--tt-cell-aspect`, `--tt-row-pitch`, `--tt-safe-area`, `--tt-cols-wide`, `--tt-cols-medium`, `--tt-cols-narrow`, `--tt-cols-tiny` |
| Spacing and size | `--space-1` to `--space-12`, `--target-min`, `--dock-size`, `--bezel-thin` |
| Shape and depth | `--radius-*`, `--border-width`, `--focus-ring-width`, `--focus-ring-offset`, `--shadow-panel`, `--shadow-key`, `--shadow-screen-inset`, `--shadow-bezel-inset` |
| Layers | `--z-canvas` 0, `--z-screen-dom` 5, `--z-hud` 10, `--z-dock` 15, `--z-panel` 20, `--z-modal` 30, `--z-toast` 40 |
| Motion | `--duration-fast`, `--duration-normal`, `--duration-slow`, `--duration-camera`, `--duration-camera-reset`, `--ease-standard`, `--ease-camera` (durations go to 0 ms under reduced motion) |
| CRT (2D) | `--crt-scanline-opacity`, `--crt-scanline-pitch`, `--crt-noise-opacity`, `--crt-vignette-strength` |
| Haunting ceilings | `--haunt-tremble-max-em`, `--haunt-ghost-peak-lum`, `--haunt-ghost-text-lum`, `--haunt-room-dim-max`, `--haunt-creep-max`, `--haunt-min-step-ms`, `--haunt-text-redraw-hz`, `--duration-haunt-text` |

Breakpoints (not tokens, because media queries cannot read custom properties): 3d-set at `(min-width: 1024px) and (min-height: 600px) and (min-aspect-ratio: 5/4) and (hover: hover) and (pointer: fine)`; landscape dock at `(max-height: 499px) and (orientation: landscape)`. Grid bands are in JS from the safe screen width.

## 14. Fonts

| Role | Family | Licence |
|---|---|---|
| Screen body | VT323 (Peter Hull) | SIL OFL 1.1 |
| Labels, buttons, headings | Barlow Condensed 400 and 600 | SIL OFL 1.1 (shipped) |

Change (2026-11-10): VT323 replaces Bedstead because of Bedstead's SAA5050 copyright caveat. The technical-artist downloads, subsets (Basic Latin, Latin-1, punctuation, arrows) and ships `public/fonts/vt323-regular.woff2`, updates `public/fonts/LICENCES.md` (remove the Bedstead row and file, add the OFL text) and deletes `bedstead-regular.woff2`. `src/styles/fonts.css` and `--font-teletext` already point at VT323.

Consequences of the swap:

- VT323 has no sextant mosaic glyphs. The rasteriser draws every mosaic (rules, the page-100 frame, fastext blocks, the bleed streaks in 16.4) as filled rectangles; nothing depends on U+1FB00 to U+1FBFF.
- VT323 is a tall, narrow pixel face. Measured: units per em 1000, every glyph tested advances 400, so the advance is **0.4 em** (not Bedstead's 0.6), with ascent 800 and descent 200. The 0.6 in section 5 (`--tt-cell-aspect`) therefore no longer describes the font; it only sets the grid's cell geometry (columns, cell width, row pitch from W), which is unchanged. Cell sizing for drawing comes from `measureText`, never from 0.6: `advance = ctx.measureText('M').width / fontPx` at a reference size, then `drawPx = cellWidth / advance`. If `drawPx` would exceed the row pitch divided by 0.9, use `drawPx = rowPitch / 0.9`, centre each glyph in its cell, and add letter spacing so the columns still line up with the cell grid (the DOM 2D screen does this). Because the advance (0.4) is below 0.6, `drawPx` is at least `cellWidth / 0.6`, so the 16 CSS px floor in 5.2 still holds in every band. As built in the 2D check at 960 x 720: cell 17.5 px, derived size 43.8 px, capped at 35.7 px by row pitch, 3.2 px of extra letter spacing. Glyph size lives in `src/ui/teletext/font.ts`.
- The canvas rasteriser awaits `document.fonts.load('16px VT323')` before the first draw.

## 15. Copy and truthfulness (design side)

- The story is `src/content/intro.tmpl`: nine pages, no typed digits, every fact a placeholder (tool, plugin, model, roles, phases all and done, stack, commit count, first commit date and subject, model co-author count, revision). Cues are in the sidecar `src/content/intro.cues` (16.3), so the facts pipeline and template format are untouched.
- The copy states "as of commit" next to the commit count and the finished phases (FR-13).
- Facts render as inverse blocks. The Occupant's fiction never asserts a checkable fact: it is metaphor ("I was typed", "the doors are locked from the inside"), and every number, name, date and version is a placeholder.
- The copy avoids `{{ phases.current }}` because it is null once every phase is done and would stop the build.
- Haunted text never changes the DOM text, and never shows a false fact even briefly: effects may not rewrite fact segments (16.4).

## 16. Ghost story and haunted animations

Requirements covered: FR-24 to FR-35, US-18 to US-23. The scene's contract is `displayStore.reducedMotion` (OS reduced motion OR Calm); in every place below "Calm" means that flag.

### 16.1 The story in one paragraph

The Occupant is a nameless ghost trapped in the 1970s set. It woke when the set was switched on, and tells, in a flat transmission voice, the true story of how it was made: typed by the tool, ticked off by the plugin, thought by the model, staffed by the roles, built in phases, held up by the stack, recorded in a diary of commits. It says it is closer to the glass than it was. It lets go at the end and asks you to leave the set on a little longer, because it is warm. The humour is dry and sits underneath the dread. No jump scare: the Occupant never moves fast, never makes a sound it was not building towards, and never says anything cruel.

### 16.2 Beat sheet (timing: see `src/state/timing.ts`; the "About t" column is relative only and drifts when constants or facts change; times are from the end of warm-up)

Dread level: 0 calm, 1 uneasy, 2 watched, 3 close, 4 closest. Each row only raises the level by one step, and each step takes at least 2 s of continuous change (FR-30).

| # | Page id | About t (s) | Beat | Cues (full motion) | Level |
|---|---|---|---|---|---|
| 1 | `signal` | 0 | Cold open: "Is someone there?" Just the voice and the static | hum swell starts | 0 |
| 2 | `waking` | 5 | Wakes. Explains that white blocks are true. Names itself the Occupant | ghost begins to cohere (0.12), last line trembles | 1 |
| 3 | `makers` | 13 | Tool, plugin, model: "I was typed" | camera creep begins (0.15), one word rewrites (MIND to HOST and back) | 1 |
| 4 | `staff` | 21 | Agent roles including the tech lead who "never left" | room dims (0.2), last line bleeds, channel knob turns by itself | 2 |
| 5 | `phases` | 32 | Phases, as of commit, finished phases | last line trembles, picture rolls once | 2 |
| 6 | `bones` | 43 | Stack and versions: "it has become a prayer" | figure clearly present (0.45) but far (0.2), creep 0.4, a word rewrites (PRAYER to CELL and back) | 2 |
| 7 | `diary` | 51 | Commit count, first commit date and subject, model signatures | dim 0.5, wall shadow appears (0.5), figure 0.8 and nearer (0.55), volume knob turns, a line bleeds, a word rewrites (GLASS to YOU and back) | 3 |
| 8 | `glass` | 64 | "Closer to the glass than I was." Direct address | closest approach (0.9), creep 0.8, dim 0.7, first line bleeds, last line trembles hardest | 4 |
| 9 | `settle` | 72 | Lets go. "Leave the set on. It is warm." | figure fades to nothing over 8 s while it settles against the glass, creep, dim and shadow ease to zero, hum drops to a low warmth | 4 down to 0 |
| end | diary index | see timing.ts | End hold (`END_HOLD_MS`), then everything is zero before P100 shows | all envelopes reach zero within 3 s | 0 |

Rules for the sequence: no two event cues (tremble, rewrite, bleed, roll, knob) start within 2 s of each other (the shipped `intro.cues` respects this; the parser warns if not). State cues (ghost, dim, creep and the rest) may start together because each is a slow ramp. The roll and the two knob turns each occur at most twice in a run. A visitor who reads only the facts loses nothing: the haunting is on top of true text.

### 16.3 Cue mechanism

Decision: cues live in a sidecar file, `src/content/intro.cues`, not in `intro.tmpl`.

Why (checked against `scripts/facts/template.ts`): the template parser treats every non-comment line as screen copy, rejects any `!directive` other than `!draft` and `!allow-digits`, drops `#` comment lines entirely, and rejects stray braces. An inline marker would either be shown as text, fail the build, or need a parser change. A `#@cue` comment convention would pass but would force the frontend to parse the template a second time and bind a comment to the next line, which is fragile. The sidecar means the facts pipeline, `intro.json` and `data-fact` output stay exactly as they are. The fiction in the template and the effects in the cues file are separate on purpose: cues cannot change fact text.

#### File format

```text
# comment
<anchor> <cue> [key=value ...]
```

| Part | Meaning |
|---|---|
| `<page-id>` | The page's first line starts to reveal |
| `<page-id>-<n>` | Line `n` of the page starts to reveal (the same value as `IntroLine.id`, so it matches `intro.pages[].lines[].id`) |
| `<anchor>@end` | The line (or page) has finished revealing, plus 300 ms, so the true text is always on screen first |
| `<anchor>+<seconds>` | Offset after the anchor (also after `@end`: `staff-2@end+1`) |
| `key=value` | Parameters; numbers may contain digits (this file is not copy, so the digit rule for copy does not apply, but replacement words may not contain digits) |

Anchors follow the clock. They are line events, not timestamps, so changing the reveal constants never desynchronises a cue. The clock fires a cue when `(pageIndex, lineIndex, revealedChars)` crosses its anchor in the current `epoch`. Pause freezes cues (clock paused). Each cue fires at most once per epoch. Replay starts a new epoch. Sub-pages (a long page split by the rasteriser) do not matter because anchors use line ids.

#### Cue vocabulary

State cues (continuous: a target value and a duration, eased with smoothstep):

| Cue | Params | Range | Drives |
|---|---|---|---|
| `ghost` | `to`, `over` (s) | to 0 to 1, over 2 or more | Figure visibility (how much of it has emerged) |
| `ghost-near` | `to`, `over` | to 0 to 1, over 2 or more | Figure closeness (size and position) |
| `creep` | `to`, `over` | to 0 to 1, over 2 or more | Camera push-in, 3d-set only |
| `dim` | `to`, `over` | to 0 to 1, over 2 or more | Room light removed (3d-set) or extra edge vignette (3d-screen and 2d) |
| `shadow` | `to`, `over` | to 0 to 1, over 2 or more | Opacity of the wall decal (3d-set only) |
| `hum` | `to`, `over` | to 0 to 1, over 2 or more | Audio swell, only if sound is on |

Event cues (one-off, with a fixed duration):

| Cue | Params | Notes |
|---|---|---|
| `tremble` | `amp` (em, 0.02 to 0.08), `dur` (s, 1.5 to 5) | Anchor must be a line (`page-n@end`) |
| `rewrite` | `word` (nth space-separated token of the resolved line text, from 1), `to` (replacement), `hold` (s, 0.8 to 2), `dur` (s, 2 to 4) | Replacement letters only, at most the original token's letter count, no digits, never over a fact segment. Punctuation stays |
| `bleed` | `dur` (s, 3 to 6), `rows` (1) | Streaks fall into the blank row under the line |
| `roll` | `dur` (s, 2.4 to 3) | One vertical roll of the picture (shorter values are clamped up to 2.4 s). Anchor must be `...@end` of a page's last line (plus an optional offset up to 4 s) |
| `knob` | `which` (`channel` or `volume`), `deg` (-60 to 60), `over` (s, 2 or more) | 3d-set only; ignored elsewhere |

Parser rules (frontend, with the architect's optional build check below): unknown cue, key or anchor is a hard error in development and a skipped cue in production; values are clamped to the ranges above, never silently exceeded; the rate limits in 16.7 are enforced by clamping `over`; a `roll`, `tremble`, `rewrite` or `bleed` on the last line of a page extends that page's hold until the effect ends (at most 6 s); two event cues on the same line may not overlap.

#### Reset and end

- Natural end: after `END_HOLD_MS` every state cue eases to zero over 3 s, then the diary index shows.
- Skip: all state cues ease to zero over 1.2 s, event cues are cancelled, and the index shows within 500 ms (the screen shows the index straight away; haunting fades under it).
- Power off or Replay: zero at once (the screen is black or collapsing at the time).
- Calm switched on mid-story: all values are set to zero and all event cues cancelled within one frame, without a fade (the visitor asked for stillness). Switching Calm off mid-story does not resume cues until the next line anchor.

#### Output: what the scene and the rasteriser read

Frontend publishes a `hauntStore` (zustand, `src/state/hauntStore.ts`), written only by the clock/cue scheduler:

| Field | Type | Written by cue | Read by |
|---|---|---|---|
| `ghost`, `ghostNear` | 0 to 1 | `ghost`, `ghost-near` | Screen material (3D), 2D ghost layer |
| `creep` | 0 to 1 | `creep` | Camera rig (3d-set) |
| `dim` | 0 to 1 | `dim` | Lights (3d-set), screen vignette uniform, 2D vignette |
| `shadow` | 0 to 1 | `shadow` | Wall decal (3d-set) |
| `hum` | 0 to 1 | `hum` | Audio engine |
| `roll` | `{ active: boolean; startedAt: number; dur: number }` | `roll` | Screen material (`uRoll`), 2D screen |
| `knobCue` | `{ nonce: number; which; deg; dur } or null` | `knob` | Knob layer |
| `textEffects` | map of line id to `{ kind; startedAt; dur; params }` | `tremble`, `rewrite`, `bleed` | Rasteriser (canvas and 2D) |

All values are zero and `textEffects` is empty whenever `reducedMotion` is true. The scene never writes this store.

### 16.4 Haunted text (animation a)

Owner: frontend-developer (rasteriser `src/ui/teletext/`, effect layer on top of the frame model). Visual only: the DOM transcript, `frame` text and `data-fact` spans are never altered, so QA reads true text at all times.

Common rules:
- An effect starts only after its line is fully revealed plus 300 ms, so the true text is always shown first, and it ends with the line drawn exactly as resolved. `settled text equals resolved text` is asserted by a unit test on the frame model (effect off equals effect finished).
- Only one text effect runs at a time; a second waits until the first ends (the schedule rarely needs it).
- Redraw at most `--haunt-text-redraw-hz` (30 Hz) while an effect runs, and stop redrawing when it ends.
- Calm or reduced motion: no effect is created.
- Effects never apply to the header, title, fastext row or fact (inverse block) cells, except `tremble` and `bleed`, which may include fact cells (no change of the characters).

| Effect | Parameters | Motion | Flash safety |
|---|---|---|---|
| `tremble` | `amp` 0.02 to 0.08 em (ceiling `--haunt-tremble-max-em`); `dur` 1.5 to 5 s | Each glyph is offset in x and y by band-limited noise (about 8 Hz, per-glyph phase). Amplitude envelope is a sine: 0.5 s in, hold, 0.5 s out | Motion only; luminance does not change |
| `rewrite` | `word`, `to`, `hold` 0.8 to 2 s, `dur` 2 to 4 s | Letters of the chosen word change one at a time left to right every 90 ms to the replacement (padded with spaces if shorter), hold for `hold`, then change back one at a time every 120 ms. Replacement is drawn in `--screen-text-strong`. A change of letters is not a luminance flash | A glyph changes at most twice in the effect, never faster than once per 90 ms across a word (about 11 Hz of different cells, not the same cell) |
| `bleed` | `dur` 3 to 6 s, `rows` 1 | After settling, every third glyph (seeded by line id, so Replay is identical) drops a streak: 0.25 cell wide (rectangles, centred under the glyph, so they read as streaks and not blocks; as built), colour `--screen-rule`, alpha 0.45 falling to 0, length easing out (cubic) from 0 to one row pitch, into the blank row under the line. Never over other text; if there is no blank row below, skip | Alpha under 0.45, area under 1 per cent of the screen |

Fact rule: `rewrite` may not touch a fact segment, so a false fact is never shown. The parser checks that the target token does not overlap a segment with `kind: 'fact'` and refuses otherwise.

2D mode: the same effect layer draws on the 2D screen element (the rendering of the frame model), so playback state, effects and the DOM transcript behave identically.

### 16.5 The Occupant: ghost on the screen (animation b)

Owner: technical-artist (shader and sprite), driven by `hauntStore.ghost` and `ghostNear`; the 2D mode uses the same sprite as a CSS layer.

#### Visual description (original, greyscale only)

A pale head-and-shoulders bust, like a presenter's portrait from a late-night sign-off that nobody was there to turn off. It is built to be wrong in small ways, not monstrous:

- Head: a tall egg, 1.4 times taller than wide, tilted 5 degrees anticlockwise, slightly narrower at the chin. The crown is a smooth darker cap with a centre parting. No ears, no nose.
- Face: two dark eye hollows, tall ellipses, the left a little larger and lower than the right. They are the darkest tone in the sprite (black). There is no mouth at all until the figure is near; from `ghostNear` 0.8 a thin, dark horizontal slit fades in over at least 4 s at about a third of the way up from the chin.
- Neck: long and narrow, about half the head width.
- Shoulders: sloping, wide (0.8 of the sprite width), dropping about 18 degrees on each side.
- Collar: two wide pointed 1970s lapel collars meeting low on the chest, drawn a little paler than the body.
- Below the chest the body dissolves into static; there are no hands.
- Tone: the face is the palest part (about 0.85 of the figure's peak), the body about 0.6, the rim a thin light edge, the hollows 0. Soft edges (feather about 3 per cent of the width).
- Interference: the figure is cut into horizontal strips about 3 CSS px tall; each strip is shifted sideways by slow noise (plus or minus 1.2 per cent of the screen width, changing at about 0.2 Hz, never abruptly), with one wider "tracking tear" at the throat shifted 3 per cent. It reads like a mis-tracked picture, so it belongs to the set.
- Why it is original: the bust and the lapel collars tie it to the era's presenters; the strips, the too-tall head and the hollow eyes are unique to this design. It has no long hair across the face, no suit and tie with no face, no child, no mask, and no recognisable character from any film, game or book.

Sprite: 256 by 384 greyscale with alpha, drawn procedurally in code (`drawOccupant(ctx, w, h)` in `src/scene/materials/`) so it costs about 0 kB. The same drawing feeds the shader texture and a 2D PNG-equivalent canvas.

#### How it forms and moves

| Parameter | Value |
|---|---|
| Emergence | A coherence mask: `visible = smoothstep(n - w, n + w, ghost x sprite x 1.2)` where `n` is slow low-frequency noise in the static (0.05 Hz drift), `w` is 0.12. Low `ghost` shows only the face centre and the eye hollows emerging from the grain; higher values fill the head, collar and shoulders. It uses the existing static grain, so it truly forms out of the static |
| Forming time | At least 3 s of continuous change (US-19). The schedule uses 6 s for the first step (0 to 0.12) and 8 to 10 s for later steps |
| Size | `heightFrac = lerp(0.35, 0.95, easeInOut(ghostNear))` of the glass height. At `ghostNear` 1 the head is about 70 per cent of the glass height, pressed to the glass |
| Position | x centre `0.5 + 0.06 sin(2 pi t / 40)` (a slow side-to-side drift of plus or minus 6 per cent, period 40 s); y centre lerps from 0.62 (low and far) to 0.45 (near) |
| Fog at the glass | From `ghostNear` 0.8 a soft radial brightening at the mouth, mean luminance contribution under 0.01, fades in over at least 4 s |
| Luminance ceilings | Peak `--haunt-ghost-peak-lum` (0.30) on blank screen. Over glyph cells and their one-cell dilation: `--haunt-ghost-text-lum` (0.07), but, as built and measured, the effective cap is `uGhostTextCap` x 0.5 (`TEXT_CAP_SCALE` in the shader, because glow, grain and scanlines add on top of the cap). With the ghost at maximum, body text measures 5.05:1 strict (7.96:1 mean), corner text 6.99:1 and the header 4.55:1, so body text stays at 5:1 or better. The shader samples a blurred mip of the teletext texture as the text mask. The 2D layer uses the same scale |
| Area mean | The figure's contribution to the screen's mean luminance never exceeds 0.05 |
| Draw order | Under the text, over the static; the CRT effects (scanlines, curvature, glow, vignette) apply to the result |
| Calm or reduced motion | No figure at all (a still figure is allowed by FR-17 but not used, to keep the safest path) |
| Mobile (3d-screen) | The figure runs unchanged (FR-34); camera and knobs do not |
| 2D mode | A CSS layer with the sprite canvas, `mix-blend-mode: screen` off (use plain alpha), opacity and scale from the same store values, 30 Hz limited steps, the same ceilings |

Uniforms to add to the CRT material (technical-artist): `uGhost` (0 to 1), `uGhostNear` (0 to 1), `uGhostSeed`, `uGhostMap` (sprite texture), `uGhostTextCap` (0.07), `uGhostPeak` (0.30). The scene copies `hauntStore.ghost` and `ghostNear` into them every frame (as it already does for `screenState`).

#### The wall decal (3d-set only)

The Occupant's shadow on the wall: one quad to the left of the set, the same silhouette as the sprite but darker than the wall, soft-edged, alpha `shadow x 0.10` (it should be hard to be sure it is there), fading in over 10 s. Never moves. This and the room dim are why the room needs the extra texture work in 10.2.

### 16.6 Haunted set (animation c) and camera creep (animation d)

#### 16.6.1 Picture roll (all modes)

Owner: technical-artist (uniform `uRoll`), driven by `hauntStore.roll`. 2D mode: the frontend translates the screen contents with CSS.

| Parameter | Value |
|---|---|
| Duration | 2.4 to 3 s (the shipped cues use 2.4 s), once per cue, at most twice per run. The 2.4 s minimum is forced by the 0.8 screen-heights-per-second peak speed: the built roll peaks at 0.785 at 2.4 s, and `rollPhase` clamps shorter values up to 2.4 s (`ROLL_MIN_SECONDS`) |
| Not on the test card | Measured on 87,000 px blocks, a roll changes a block by 0.041 at most on a text page with the ghost at maximum, but 0.070 on the test card (under the 0.10 hard limit, over the 0.05 design margin). Roll text pages only; never roll the test card or the loading card |
| Motion | Vertical offset of the picture, 0 to 1 screen height (one full wrap), eased with a sine in-out, peak speed at most 0.8 screen heights per second. The last 400 ms is a damped settle (offset overshoots by at most 2 per cent) |
| Hold bar | A dark horizontal sync band, 6 per cent of the height, luminance reduction at most 0.04, travels with the seam |
| Timing | Starts at the end of a page (after the text is read and the page has held), never over a line being revealed |
| Flash | Mean luminance unchanged (translation only); no luminance step; nothing flashes |
| Calm | None |

#### 16.6.2 Knobs turning on their own (3d-set only)

Owner: scene-developer (`KnobLayer`), reading `hauntStore.knobCue`.

| Parameter | Value |
|---|---|
| Channel knob | Turns `deg` (shipped: 25) over 3 s, ease in-out (`--ease-camera`), slight overshoot of 1 degree back, then rests. Ticks are not audible unless sound is on (a soft click, no louder than the power click) |
| Volume knob | Turns `deg` (shipped: -30) over 3 s, same easing |
| Rules | Never while the pointer is over that knob. The knob stays where it ended (it is the set's fault, not the visitor's). Pointer interaction afterwards works as normal. Power-off resets both to rest |
| Hit areas | Unchanged; outlines and tags are not triggered |
| Calm and mobile | None |

#### 16.6.3 Room light dims and wall shadow (3d-set), edge dim (3d-screen and 2D)

Owner: scene-developer (`SetLights`, decal) with technical-artist (vignette uniform).

| Parameter | Value |
|---|---|
| 3d-set room dim | Key, ambient and environment intensity multiplied by `1 - dim x 0.65` (ceiling `--haunt-room-dim-max`). The screen-glow point light is not dimmed (the screen is the only light left). Low-passed at 2 Hz as in 7.5 |
| Rate | Change at most 0.15 of the range per second (the cue `over` is clamped to that) |
| 3d-screen and 2D | `uHauntVignette = dim x 0.25` extra corner darkening in the shader, or an extra inset shadow of the same size in 2D, only outside the safe area (never over text) |
| Screen content | Never dimmed, so text contrast is unchanged |
| Calm | None |

Room decision: see 10.2 (the flat dark room is not enough; the wall pattern, dust, blob shadow and wall decal are added, all procedural).

#### 16.6.4 Camera creep (3d-set only)

Owner: scene-developer (`SetCameraRig`), driven by `hauntStore.creep`.

| Parameter | Value |
|---|---|
| Effect | Multiplies the orbit distance by `1 - creep x 0.22` (ceiling `--haunt-creep-max`). Azimuth and elevation are not touched |
| Bounded by height | Final screen height on screen at most 0.86 of the viewport height: `creepMax = min(0.22, 1 - hScreenAtWatch / (0.86 x vh))` where `hScreenAtWatch` is the screen's projected height at Watch. The grid's safe area is therefore fully visible at maximum creep |
| Rate | At most 0.04 per second of `creep` (so the shipped steps of 0.15 over 10 s are within it); eased with smoothstep so speed rises and falls gently, no sudden start |
| Orbit | The visitor's own orbit and zoom still work. User input is not fought: creep is a multiplier on top of the user's distance, bounded by the limits above, and the user's 0.8 D minimum applies to the product |
| Reset view | Resets the visitor's orbit; it does not reset creep (creep is story, not user state) |
| End and skip | Creep eases to zero over 3 s (natural end), 1.2 s (Skip) or 700 ms (Replay), and is zero under Calm. Pause freezes it |
| Mobile and 3d-screen | No camera movement at all (FR-34) |

### 16.7 Flash and motion safety for the haunting (WCAG 2.3.1, FR-19, FR-30)

These add to section 7. They are testable.

| Rule | Limit |
|---|---|
| No sudden change | No state cue changes by more than its rate limit; every state ramp is smoothstep and at least 2 s (`--haunt-min-step-ms`); nothing appears, jumps or changes more than 0.1 of its range in any 300 ms |
| No jump scare | No sound, size change, cut or full-screen change in under 300 ms. The only hard cuts are page changes (as before) and the Calm switch (which only removes things) |
| Flashes per second | The ghost, dim, shadow, creep and vignette are monotonic ramps between cues: zero flashes. Text effects change glyph cells, not area means; roll is translation. All well under 3 per second |
| Large-area luminance | Ghost contribution to the screen mean at most 0.05 and changes by at most 0.02 per 100 ms (design margin of 5 per cent per 100 ms in 7.1). Roll bar reduction at most 0.04. Fog under 0.01. Room dim changes the room, not the screen mean |
| Contrast | The ghost ceiling over text is 0.07, so body text stays at 4.5:1 or better (7.2 measured by the shader). QA re-measures with the ghost at maximum |
| Combined cues | Peak simultaneous load (diary page): dim, shadow, ghost, ghost-near, creep, hum all ramping at once is allowed because each is slow, but no event cue (roll, knob, bleed, rewrite, tremble) starts within 2 s of another event cue in the shipped schedule, and only one text effect runs at a time. The parser warns otherwise |
| Reduced motion | Everything in this section is off (16.8) |

### 16.8 Calm mode and reduced motion

`displayStore.reducedMotion` is the flag. When true:
- `hauntStore` is all zero, `textEffects` is empty, event cues are not scheduled, no ghost, no roll, no knob turn, no dim, no wall shadow, no creep, no tremble, rewrite or bleed.
- Pages show complete at once with manual advance (6.7). The story and every fact are fully readable. The content is identical.
- The Calm key is in the dock at all times and on the start screen (FR-31). Turning it on mid-story cancels effects within one frame.
- Audio is muted by `hum` being ignored (and the engine's output is not raised).
- Default on when the OS asks for reduced motion; the visitor cannot turn Calm off in that case from the page (the switch says "on (system setting)").

### 16.9 Audio (Could, FR-35)

Owner: frontend-developer (`audioEngine`). Off by default and silent until Sound is turned on. With sound on, `hum` raises the existing 50 and 100 Hz hum gain along a smoothstep from 0.15 to 0.8 of its range (slow, at most a 6 dB change over 2 s) and brings filtered static up at the same rate. No sudden sound, no scream or sting. The channel and volume knob turns play the existing click at its normal level. Muted when Calm is on. The ghost fades with a slow drop of the hum to 0.2 at `settle`.

### 16.10 Ownership summary

| Area | Owner | Reads | Needs |
|---|---|---|---|
| Cue parser, scheduler, `hauntStore`, text effects, 2D ghost and roll layers, audio | frontend-developer | `intro.cues`, `introStore`, `reducedMotion` | New constants (6.3), clock hooks, calm cancel |
| Ghost shader, sprite, roll uniform, haunt vignette, wall and dust textures | technical-artist | `hauntStore` via scene | `uGhost*`, `uRoll`, `uHauntVignette` uniforms; procedural textures |
| Knob turns, room dim, wall decal, creep | scene-developer | `hauntStore` | Reads only; never writes |
| Build-time check of `intro.cues` (optional) | architect | `intro.cues`, resolved intro | See handoff |
| QA of flash, contrast, settled text and calm | qa-engineer | everything | See handoff |
