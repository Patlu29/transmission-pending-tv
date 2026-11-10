# Design spec: Transmission Pending

Owner: ux-ui-designer. Status: Phase 3 deliverable (2026-11-10). Tokens: `src/styles/tokens.css`. Copy: `src/content/intro.tmpl`. Fonts: `public/fonts/LICENCES.md`.

Terms: "set" is the 3D TV model. "Screen" is the CRT picture, drawn from one teletext canvas (ADR 0005). "Dock" is the DOM control strip. "Safe screen width" (W) is the screen's on-screen width in CSS px multiplied by `--tt-safe-area` (0.92), which removes the edge lost to curvature.

## 1. Visual direction

Mood: a quiet room, late at night, one television. Cheap, loved, slightly broken. The set is the only light source. Everything is black, white and grey, so the contrast between a warm-looking object and a cold picture comes from texture and luminance, never hue.

References (styles only, nothing copied): a mid-1970s wood-cabinet portable, teletext information services, engineers' test patterns, and the dry tone of a continuity announcer apologising for a fault.

How the layers fit together:

| Layer | Look |
|---|---|
| Room | Near-black wall and shelf, faint paper-pattern texture, soft pool of light from the screen that is low-pass filtered so it never flashes (section 7) |
| Set | Wood-effect cabinet in greyscale, dark bezel, curved glass, chunky knobs, speaker grille (section 10) |
| Screen | Teletext type on black, scanlines, phosphor glow, vignette, mild barrel curvature, fine static |
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

Start screen content (DOM, always present, not in the canvas): site name "Transmission Pending" (h1), one line "A television with something to say.", the Power key labelled "Switch on", and a flicker note: "This set crackles and flickers. If you prefer calm, turn on reduced motion in your system settings; this page follows it straight away." The note is plain text under the key, at `--text-sm` or larger, 4.5:1 or better.

### E2 The terrible, truthful intro

```text
warm-up ends -> page "test-card" ... -> last page "sign-off"
  last line complete + 1.0 s hold -> end state: page 100 build diary index
Skip anytime -> end state within 500 ms
```

### E3 Control and accessibility

```text
Skip   (playing)  -> index P100, focus moves to Replay
Replay (ended)    -> page 1 of the intro from the top, no warm-up, focus moves to Pause
Pause/Play        -> freezes the reveal and the page timer (WCAG 2.2.2); label flips
Read full text    -> opens the transcript panel (focus trapped, Escape closes, focus returns)
Sound             -> off by default; toggles; label states the result ("Sound on" / "Sound off")
Reduced motion    -> OS setting read live; no reload (US-9)
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

Mosaic graphics (rules, the page-100 frame, the fastext blocks) use sextant block glyphs from the font or filled rectangles drawn by the rasteriser.

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
| `REVEAL_CPS` | 90 characters per second | A line paints as fast typing, a block cursor leads it |
| `LINE_GAP_MS` | 250 | Between lines on one page |
| `PAGE_HOLD_BASE_MS` | 800 | After the last line of a page completes |
| `PAGE_HOLD_PER_CHAR_MS` | 8 | Added per character on the page |
| `END_HOLD_MS` | 1000 | After the last page before the diary index |

Duration (excluding warm-up) = characters / 90 + 0.25 x lines + pages x 0.8 + 0.008 x characters + 1. The shipped copy resolves to about 1,600 characters, 24 lines and 8 pages, so about 43 s. FR-8 allows 30 to 60 s: the copy may change while characters stay between 1,000 and 2,400 and pages between 6 and 12. If it leaves that band, retune the constants and note it in the handoff.

Page change: a hard cut (page cleared and the next one starts at row 1). No static burst unless the Could feature in 7.4 is built. Header tag updates with the cut.

Pause: freezes reveal and the page timer; the block cursor stops blinking and shows solid.

### 6.4 Skip

- Trigger: Skip key; shortcut S (section 9.3). Allowed during `playing` only.
- Result within 500 ms: page P100 (diary index). The reveal is not completed; the transcript is unaffected.
- Focus moves to Replay. Live region (polite): "Intro skipped. Build diary showing."
- Skip is also offered on touch with identical size and behaviour (US-8).

### 6.5 Replay

- Trigger: Replay key; shortcut R. Available in `ended`.
- Result: the screen cuts to a black frame for 200 ms (no static), then page 1 begins. No warm-up and no camera move.
- Focus moves to Pause. Live region: "Replaying the intro."
- Under reduced motion: page 1 shows at once.

### 6.6 End state

When the last page's hold plus `END_HOLD_MS` completes, or on Skip:

- `status` becomes `ended`; the screen shows P100.
- Dock: Skip and Pause disappear, Replay and the page keys (Prev, Next, Index) appear. Focus moves to Replay only if focus was on a removed key; otherwise it stays put.
- The last intro page is not shown again unless the visitor replays.
- The camera stays at Watch.

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
| Typing reveal | 90 cps | Whole page at once |
| Page advance | Automatic | Manual (auto-advance opt-in, slow) |
| Noise | 12 to 24 Hz | Frozen texture |
| Rolling bar, jitter, glow flicker | On | Off |
| UI transitions (hover, focus) | 120 to 240 ms | 0 ms (tokens collapse) |
| Knob rotation | 150 ms | Instant |
| Channel-change burst | 250 ms | Off |

The media query is read live (US-9). A change takes effect on the next frame, with no reload.

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
| Power key | Large: min height 56 px. Label "Switch on". After power-on it is removed from the tab order |
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
| Shelf and room | Flat dark planes; wall with a faint stripe or paper pattern (greyscale, under 8 per cent contrast); one dust-fall texture |

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

Breakpoints (not tokens, because media queries cannot read custom properties): 3d-set at `(min-width: 1024px) and (min-height: 600px) and (min-aspect-ratio: 5/4) and (hover: hover) and (pointer: fine)`; landscape dock at `(max-height: 499px) and (orientation: landscape)`. Grid bands are in JS from the safe screen width.

## 14. Fonts

| Role | Family | Licence |
|---|---|---|
| Screen body and mosaic blocks | Bedstead | Free / public domain (confirm on download) |
| Labels, buttons, headings | Barlow Condensed 400 and 600 | SIL OFL 1.1 |

Files could not be downloaded in the design phase. Instructions are in `public/fonts/LICENCES.md`, and `src/styles/fonts.css` is ready to import once the files exist.

## 15. Copy and truthfulness (design side)

- The intro copy is `src/content/intro.tmpl`: eight pages, no typed digits, every fact a placeholder (build, tool, plugin, model, roles, phases, stack, commit count, first commit date and subject, model co-author count, revision).
- The copy states "as of commit" for the commit count (FR-13).
- Facts render as inverse blocks. A joke never asserts a fact.
- The copy avoids `{{ phases.current }}` because it is null once every phase is done and would stop the build.
