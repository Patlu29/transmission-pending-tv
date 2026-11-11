# Design spec: 2050 retheme ("holographic glass")

Owner: ux-ui-designer. Status: draft for user approval (2026-11-11), branch `v2` only. Files: tokens `src/styles/tokens-2050.css`, fonts `src/styles/fonts-2050.css`, copy `src/content/intro.tmpl`, cues `src/content/intro.cues`.

## 0. What this supersedes, and what it keeps

The site identity changes from a 1970s television to a 2050 light-field display. Colour is allowed. The product-manager and architect handle the requirements and technical impact in parallel; this file is the design.

| Document | Superseded on branch `v2` | Kept |
|---|---|---|
| `design-spec.md` (v1) | 1 visual direction; 5.3 teletext colours; 6.1 CRT warm-up and collapse; 7.3 rolling bar and CRT jitter; 10 the TV body; 11 the 1970s test card; 14 fonts; the greyscale rule and tokens | 3 modes and breakpoints; 4 camera; 5 grid maths and bands; 6.3 to 6.7 playback flows; 7 flash rules; 9 accessibility; 15 copy truthfulness; 16 haunt limits and cue grammar |
| `design-spec-v2.md` | 5.1 the TV room look and the colour-era tint; the look of every UI component (section 4 and the chrome in 1, 2); 1.8 the meaning of the Colour switch; the 2D skins; privacy page styling | Information architecture and flows; layouts and geometry; the keyboard map; rooms 5.2 to 5.9 (scenes unchanged, they take the new chrome); compliance rules; the privacy copy; accessibility mapping; open-question answers |

Rules that never change: nothing the site makes is drawn, placed or animated over the YouTube player; no filter, blend, mask or opacity on the player or an ancestor; channel 0 and the haunt never appear over the player; Calm and reduced motion give a fully static, readable version; flash limits stay (v1 7.1 and 16.7), plus a red-flash rule (section 1.6).

## 1. Visual direction and tokens

### 1.1 Mood

"Holographic glass": calm, premium, quiet. A floating light-field display in a dim, clean room. Light is the material: soft volumetric glow, frosted glass, thin bright edges, gentle iridescence. Motion is slow and eased. The tone of the UI is that of a very expensive appliance that is slightly too attentive.

| Layer | Look |
|---|---|
| Room | Deep ink floor and walls (`#05070d` to `#0e1524`), a frosted-glass wall panel with back-light, a soft overhead ring light, a faint reflective floor |
| Display ("Lumen pane") | Frameless glass pane with a pearl ceramic edge and a thin steady edge light, hovering over a graphite puck (section 3) |
| Screen | Light-field text on a deep ink card, lit chips for verified facts, soft glow, no scanlines, no curvature, no CRT noise: fine light-field grain only |
| UI chrome | Frosted-glass pills and panels with a lit hairline edge, soft shadows, rounded corners; primary keys are lit pills (light fill, dark text) |
| Accents | Lumen cyan `#8fe3ff` primary, violet haze `#b9a4ff` secondary, rose `#ff9fb0` for errors (edges and icons only), ember `#ffc58a` for warnings, mint `#8ff0c8` for success. The iridescent gradient appears only on borders and the hero room card |

Colour is calm: saturation stays low, accents are pastel, no saturated red anywhere, no strobing gradients.

### 1.2 Token groups (`src/styles/tokens-2050.css`)

The 2050 file keeps every v1 custom property name, with new values, so existing CSS carries over. The frontend swaps `tokens.css` for it in one change. New groups are listed.

| Group | Tokens | Notes |
|---|---|---|
| Ink ramp | `--grey-0` to `--grey-1000` | Names kept; values are cool-tinted near-blacks to near-whites |
| Accent | `--lumen`, `--lumen-bright`, `--lumen-deep`, `--haze`, `--rose`, `--ember`, `--mint`, `--iridescent` | New |
| UI colour | `--color-bg`, `-room`, `-surface`, `-surface-raised`, `-border`, `-border-subtle`, `-text`, `-text-muted`, `-text-subtle`, `-text-on-light`, `-accent`, `-control-*`, `-focus`, `-focus-halo`, `-scrim`, `-error-edge`, `-ok-edge`, `-warn-edge` | |
| Glass | Small chrome: `--glass-small-fill` (alpha 0.84), `--glass-small-blur` (12px), `--glass-backdrop-brightness` (0.7), `--glass-backdrop-saturate`, `--glass-small-filter`. Large surfaces: `--glass-large-fill` (tinted gradient, alpha 0.93 to 0.95, no blur), `--glass-large-grain` (static grain tile). Near-player and Solid panels: `--glass-solid-fill`. Also `--glass-deco-fill`, `--glass-chip-fill`, `--glass-highlight`, `--glass-shadow`, `--glass-edge`, `--glow-near-player` (none) | New. Three levels, section 1.3. `--glass-panel-*` are kept as aliases of the small level |
| Glow | `--glow-lumen`, `--glow-haze`, `--glow-rim`, `--glow-text`, `--glow-alpha-max` (0.35) | New |
| Screen palette | `--tt-0` to `--tt-7`, `--screen-bg`, `-text`, `-text-strong`, `-fact-bg`, `-fact-text`, `-header-bg`, `-header-text`, `-rule`, `-glow`, `-ghost`, `-smear` | Names kept; light-field tones |
| Device materials | `--tv-wood-*`, `--tv-bezel`, `--tv-trim`, `--tv-knob`, `--tv-knob-mark`, `--tv-grille`, `--tv-glass-tint` | Names kept; mapped to plinth, ceramic frame, puck, ring light (section 3) |
| Type | `--font-teletext` and its neutral alias `--font-screen` (Space Mono), `--font-display` (Space Grotesk), `--font-ui` (Atkinson Hyperlegible), sizes, leading, tracking | Section 2 |
| Grid | `--tt-cell-aspect` 0.612 and the rest | Maths unchanged from v1 |
| Shape | `--radius-sm` 12px, `-md` 18px, `-lg` 28px, `-pill`, `-screen` 28px | Rounded glass |
| Motion | `--duration-*`, `--duration-bloom` (2200ms), `--duration-fold` (550ms), `--ease-standard`, `--ease-glass`, `--ease-soft`, `--ease-camera` | New easings |
| Haunt | v1 ceilings kept; new `--haunt-fringe-max-px`, `--haunt-glitch-min-dip`, `--haunt-glitch-max-hz` | |
| v2 layout | `--player-*`, `--info-row-*`, `--rect-halo`, `--panel-w`, `--header-h-focus`, durations, spill, focus backdrop | From design-spec-v2 section 9 |

Easing roles: `--ease-glass` (fast out, long settle) for panels arriving and fading in; `--ease-soft` (symmetric in-out) for light blooms, folds, camera and the colour switch; `--ease-standard` for hover and focus.

### 1.3 Frosted glass, transparency and blur levels

Rules from ADR 0012 (performance and the YouTube rule), applied here:

| Level | Fill | Live blur | Used for | May carry text? |
|---|---|---|---|---|
| Small chrome | `rgba(8,12,22,0.84)` | 12 px at most, with brightness 0.7 and saturate 1.3; never nested | dock, HUD tags, keys | Yes |
| Large surfaces | tinted gradient `rgba(20,30,50,0.93)` to `rgba(8,12,22,0.95)` plus a static 5 per cent grain tile; **no live blur** | none | guide panel, room picker, notices and dialogs, still and error cards, privacy card | Yes |
| Near-player plates | solid `#0e1524`, 1 px border, **no blur, no glow, no shadow bleed** | none | the info row and anything within 24 px of the player rect | Yes |
| Deco | `rgba(220,235,255,0.06)` | none | frame highlights, hero card sheen | No |
| Chip (canvas) | `rgba(143,227,255,0.14)` over the opaque card | n/a | header and fastext chips drawn on the screen canvas | Yes (the backdrop is the opaque card) |
| Scrim | `rgba(5,7,13,0.72)` | none (a plain tint) | behind modal dialogs; never over a visible player (it is hidden first) | n/a |

- Nothing frosted, glowing, shadowed with a bleed, or outlined with a halo comes within 24 px of the player rect (DOM chrome; the info row is the solid flat plate above). No `backdrop-filter` element intersects the rect or is an ancestor of the player.
- Screen-owned frame dressing in the canvas (the pane's ceramic border and its 2 px edge light, flush outside the rect, outward glow at most 8 px) is part of the screen itself, like the mountain-sky portal frame, and is under the player layer.
- No more than one small-chrome blur layer overlaps any pixel; the large surfaces carry the frosted look through tint and grain, not blur.
- `data-glass="solid"` on `<html>` (section 1.5) turns every level into solid fills.

### 1.4 Contrast on glass, worst case

Worst case: the brightest backdrop behind a surface, for example the mountain-sky horizon glow (relative luminance up to about 0.85). T50-2 asks for the brightest and darkest regions within each panel over a 30 s sample, not an average; the plates below are specified against that worst case.

| Panel | Worst-case plate luminance | Text on it | Ratio (worst case) | Requirement |
|---|---|---|---|---|
| Small chrome (dock, HUD tags, keys): after `brightness(0.7)` and the 12 px blur the backdrop is at most 0.55; plate = 0.84 x 0.004 + 0.16 x 0.55 | 0.091 | `--color-text` | 6.7:1 | 4.5:1 |
| | | `--color-text-muted` | 5.1:1 | 4.5:1 (there is no lower text tier) |
| | | `--lumen` link or label | 5.2:1 | 4.5:1 |
| Large surfaces (guide, picker, dialogs, cards): no blur, backdrop up to 0.85; plate = 0.93 x 0.01 + 0.07 x 0.85 at the light end of the gradient | 0.069 | `--color-text` | 7.9:1 | 4.5:1 |
| | | `--color-text-muted` | 6.0:1 | 4.5:1 |
| Near-player plates (info row, solid) | 0.008 | `--color-text` | 16:1 | 4.5:1 |
| | | `--lumen` link | 12:1 | 4.5:1 |
| Solid panels, reduced transparency and the no-`backdrop-filter` fallback | 0.008 | `--color-text-muted` | 11:1 | 4.5:1 |

| Pair | Ratio (worst case) | Requirement |
|---|---|---|
| `--color-control-text` on `--color-control-bg` (lit pill) | 16:1 | 4.5:1 |
| `--color-border` (white at 50 per cent) on small chrome | 4.2:1 | 3:1 for controls and inputs |
| Focus ring (white 3 px with dark halo) | 3:1 or more on light and dark | 3:1 |
| `--rose` edge or icon on small chrome | 3.8:1 | 3:1 (never body text; the error text uses `--color-text`) |
| `--screen-text` on `--screen-bg` (inside the card) | 14:1 | 4.5:1 |
| `--screen-fact-text` on `--screen-fact-bg` (lit chip) | 15:1 | 4.5:1 |
| `--screen-header-text` on `--screen-header-bg` | 9:1 | 4.5:1 |
| `--screen-rule` on `--screen-bg` | 4.5:1 | 3:1 |

Rule: any text on glass is on a small, large or solid plate from the table above. Nothing is set directly on room art or on the canvas (T50-4). Text planes also never sit on a light shaft or bloom brighter than the level at which these ratios still pass: shafts and bloom are additive meshes capped at the glow ceiling, and the story text is on the opaque card. Disabled keys keep 4.5:1 text and also state the reason in words. The ratios use approximate sRGB luminance; QA verifies by pixel sampling over a 30 s capture of each panel in each room and at peak light during the intro.

### 1.5 Fallbacks

| Preference | Behaviour |
|---|---|
| `prefers-reduced-transparency: reduce`, the viewer's **Solid panels** option, a missing `backdrop-filter`, or `AdaptiveDpr` stepping down | The frontend sets `<html data-glass="solid">`: every surface becomes a solid `#0e1524` fill, no blur, no grain, deco fills solid, scrim 0.92, glow ceiling 0.2. Ratios rise to 11:1 or better. The CSS media queries in the token file are a backstop for the same result |
| `prefers-contrast: more` | Plates `#05070d` opaque, borders white 2 px, text white, muted `#e6eefc`, no glow, focus ring 4 px, screen text white |
| `prefers-reduced-motion: reduce` and Calm | Durations 0 ms; panels appear without translation; no bloom; frozen grain; the flag in code is `displayStore.reducedMotion` |
| `forced-colors: active` | System colours and borders; the focus ring is the system's |
| Colour switch off (Monochrome) | `:root[data-colour='mono']` greys every accent and the canvas gets one grayscale filter; contrast ratios are unchanged |

### 1.6 Colour and flash rules

- The v1 flash rules stand (3 flashes a second, large-area steps under 0.10 and designed under 0.05 per 100 ms per 341 x 256 tile).
- New: no region ever alternates to or from a saturated red (red fraction of the pixel above 0.8 with luminance change above 0.1). The palette has no saturated red; the rose is pastel, static, and used on edges.
- Glows never exceed alpha 0.35 (`--glow-alpha-max`), never pulse above 1.3 Hz, and never bloom over more than 25 per cent of the screen in under 300 ms.
- Colour never carries state alone (labels, bars and text results as in v2).
- The v1 "all pixels are greyscale" test (FR-2) is retired for the site's own art. QA replaces it with: Monochrome mode (Colour off) produces R = G = B within 2 levels in every frame outside the player (the player region is excluded), which reuses the v1 greyscale test (T50-5).

## 2. Typography

Three open-licence families, all SIL Open Font License 1.1, replacing VT323 and Barlow Condensed (they stay on `main`). Self-hosted WOFF2 only (NFR-7). The technical-artist fetches, subsets and ships them. This meets T50-3: a futuristic display face for headings, a highly legible sans for body text, and a monospaced face for the screen grid.

| Role | Family | Weights | Licence and source | File to ship |
|---|---|---|---|---|
| Headings and key labels (display) | **Space Grotesk** (Florian Karsten) | variable 300 to 700, used at 600 (and 400 for large numerals) | SIL OFL 1.1. https://github.com/floriankarsten/space-grotesk (the `fonts/webfonts` or `fonts/otf` folder; also on Google Fonts) | `public/fonts/space-grotesk-latin.woff2` (variable). If only static files are used, ship 400 and 600 as `space-grotesk-400.woff2` and `space-grotesk-600.woff2` and update `fonts-2050.css` |
| Body text: notices, guide rows, info row, privacy page, descriptions | **Atkinson Hyperlegible** (Braille Institute, Applied Design Works) | 400 and 700 | SIL OFL 1.1. https://github.com/googlefonts/atkinson-hyperlegible (also from brailleinstitute.org) | `public/fonts/atkinson-hyperlegible-400.woff2`, `public/fonts/atkinson-hyperlegible-700.woff2` |
| Light-field screen text (the cell grid), channel numbers, the origins table | **Space Mono** (Colophon Foundry) | 400 and 700 | SIL OFL 1.1. https://github.com/googlefonts/spacemono | `public/fonts/space-mono-regular.woff2`, `public/fonts/space-mono-bold.woff2` |

**Why a monospaced face for the screen (ADR 0012):** the grid, wrap, hit-testing and per-glyph effects (`wrap.ts`, `hit.ts`, `effects.ts`) assume a monospaced face. Space Mono keeps them as they are, with an advance of about 0.612 em (near v1's 0.6), so grid maths, columns and bands are unchanged and no proportional-face rewrite (3 to 5 frontend-days) is needed. No proportional face is chosen for the screen.

**Why the other two:** Space Grotesk is geometric and slightly technical, calm at large sizes; Atkinson Hyperlegible was designed so that look-alike characters are distinct, which meets T50-3's l, 1, I and 0, O requirement for body text and keeps long copy (notices, privacy) easy to read at 16 px. They are DOM-only, so they do not touch the rasteriser. The technical-artist confirms at 16 px on a phone that Space Mono's 0 differs from O and l differs from 1 and I in the grid; if not, enable the face's alternate glyphs through `font-feature-settings` or the drawn-cell renderer.

Subsetting: Basic Latin, Latin-1 Supplement, general punctuation, arrows (U+2190 to 2193), the dashes and quotes (U+2013, 2014, 2018 to 201D, 2022, 2026). Keep `kern`. Budget: about 95 kB in total (Space Grotesk variable about 35 kB, Atkinson two files about 30 kB, Space Mono two files about 30 kB) against the 150 kB cap. Remove `vt323-regular.woff2`, `barlow-condensed-*.woff2` and their licence texts, add the three OFL texts, update `public/fonts/LICENCES.md`, and point the `index.html` preload at Space Mono (architect). The canvas rasteriser waits for `document.fonts.load('16px "Space Mono"')` and `document.fonts.load('600 16px "Space Grotesk"')`.

Metrics: derive draw size from `measureText` as in v1 section 14 (the rule is unchanged: `drawPx = cellWidth / advance`, capped by row pitch). The 16 CSS px glyph floor holds in every band because the advance is at most 0.62.

Scale: `--text-sm` 16 px minimum for anything meaningful, `--text-xs` 14 px for hints only. Headings and key labels use Space Grotesk 600 with `--tracking-label` (0.06em). Body uses Atkinson Hyperlegible 400 at 16 px or more with `--leading-normal`. No text on the screen below 16 CSS px.

## 3. The channel 0 "set": the Lumen pane

### 3.1 Concept and form

A free-standing light-field display, in its room, hovering as if it were a window with nobody behind it.

| Part | Description |
|---|---|
| Pane | A frameless 16:9 sheet of glass, 1.2 m wide, 9 mm thick, with a polished bevel and a 6 mm pearl-ceramic border (`--tv-bezel` `#e8eaf0`), hovering 4 cm above its base. A continuous 2 px edge light in `--lumen` runs around the glass edge, flush outside the player rect, steady, with an outward glow of at most 8 px (`--glow-rim`; screen-owned frame dressing under the player layer, section 1.3). Off: smoked glass (`--tv-glass-tint`) with a faint soft reflection of the room |
| Base ("puck") | A low oval ceramic plinth, 0.45 m wide and 0.1 m high, matte graphite (`--tv-knob` `#1a2030`). On its top face are two concentric light rings: the outer is the **channel ring**, the inner the **volume ring**; the centre is a shallow touch dimple, the **power** control. A band of speaker slits runs around the puck's side. Ring light is `--tv-knob-mark` (lumen), low and steady |
| Light cushion and volumetric light | A soft ring of light on the floor under the puck, a faint vertical cone between puck and pane, the overhead ring light's cone and a little room haze. **All volumetric light is additive, camera-facing cone or shell meshes with soft gradient textures, sorted, depth write off** (1 or 2 draw calls). No ray-marching, no post-processing bloom (ADR 0012). Budget for haze, beams and glow together: 2 ms GPU or less on a 2022 mid-range phone at the adapted DPR; particles 2,000 or fewer on mobile and 10,000 or fewer on desktop, instanced. None of it is drawn over the pane's rect |
| Node names (so scene code and tests carry over) | `screen` (pane glass), `knob-power` (dimple), `knob-channel` (outer ring), `knob-volume` (inner ring), `cabinet` (plinth and puck body), `bezel` (ceramic border), `trim` (edge bevel), `control-plate` (puck top face). Pivot at the glass centre, +z towards the viewer, glass edge at z = 0 |
| Room | Deep ink floor with a faint mirrored fade of the pane, a frosted back-lit wall panel behind (it receives the Occupant's shadow), an overhead ring light whose intensity is the `dim` cue, a low pedestal for the puck, soft volumetric dust in the ring light's cone (about 30 sprites drifting at under 4 px/s, outside the pane) |

Materials (colour is default; Monochrome is the canvas grayscale filter): pearl ceramic `#e8eaf0` roughness 0.35; satin bevel `#c9d3e4`; graphite puck `#1a2030` roughness 0.5; ring light `#8fe3ff` emissive low; smoked glass `#070b16`; floor `#0a0f1a` with a reflection quad; wall `#0e1524` with frosted back-light `#17304a`. Budget: procedural geometry as the v1 TV body (0 bytes, under 12,000 triangles), the reflection and wall as simple planes; JS counts against the v1 chunk budget as before. Tone mapping: because colour is allowed, `NeutralToneMapping` is recommended and the v1 greyscale-only rule is retired.

### 3.2 Anchor, framing and the live-channel styling

- Anchor: flat 16:9 at the glass plane (`screen: { aspect: 16/9, fill: 0.60, align: 'centre' }`; the `tv-room` id and folder names stay internal, the user-facing label becomes "Holo room"). The player rect is the whole glass area inset by 1.5 per cent (the ceramic border and edge light are outside it).
- Watch pose: face-on (camera translated parallel to the pane, never rotated), the whole device (pane plus puck) fits within 95 per cent of the viewport width, centred. The glass is about 60 per cent of the viewport width, which reaches 480 px at a viewport of 800 px (below that, focus layout). Channel 0 uses the same pose and keeps the v1 camera creep and orbit behaviour.
- Live channels (replaces the colour-era tint): the pane's glass shows the player rect only; the edge light holds steady in `--lumen`; the room keeps its colour palette (there is no tint rule any more); the overhead ring light and the wall's back-light give a steady cool spill using the shared `spill(t)` (v2 5.0); the bloom-in settles once, at pick time. The Occupant, haunt text and the wall decal do not run on or around live video except the decal at alpha 0.04 at most, static (as in v2 5.1).
- Channel-change cue on the surround (v2 1.10): a 300 ms soft pulse of the pane's edge light and the cone (edge light up to 1.4 x, eased, once per 1000 ms at most, Calm: none).

### 3.3 How the picture forms: the bloom-in and the fold-away

Replaces the CRT warm-up and collapse. Same lengths as v1 so timers and constants carry over (`WARMUP_SECONDS` 2.2, `COLLAPSE_SECONDS` 0.55; the hold of 300 ms after bloom is unchanged).

Bloom-in (full motion), 2.2 s:

| t (ms) | Picture | Luminance rule |
|---|---|---|
| 0 | Glass dark; the puck's power dimple glows; soft click sound only if sound is on | Mean 0 |
| 0 to 400 | A seed of light (radius 6 CSS px, `--lumen-bright`) fades in at the glass centre with a soft glow | Area under 0.1 per cent |
| 400 to 1100 | The seed extends into hairlines (1 to 2 CSS px): first a horizontal and a vertical line growing from the centre to the glass bounds (400 to 800), then an edge light that traces round the panel's perimeter from the line ends and assembles the panel outline (800 to 1100); the inside stays dark. This is the "point of light expands into lines that assemble the panel" of the change document | Line and outline area under 0.6 per cent; mean at most 0.04 |
| 1100 to 1800 | The inside fills with the field: light-field grain (cell at least 2 CSS px) resolves outward from the centre like interference fringes settling, while the calibration field fades in from blur (mip level 4 to 1) | Mean rises monotonically to about 0.10 |
| 1800 to 2200 | The pattern sharpens (mip 1 to 0) and the edge light and the border light up; overshoot none | Mean rises monotonically to the pattern's own mean (about 0.14; the technical-artist measures and reports) |
| 2200 | Bloom ends; the intro starts after a 300 ms hold on the pattern | |

Fold-away (sleep, 550 ms, inside the 0.5 to 1.5 s of FR-1): the picture softens (0 to 200 ms), the field contracts into the outline and the hairlines (200 to 400 ms), the hairlines shrink to the seed of light and fade (400 to 550 ms). Monotonic fall, no step up; the seed's area never exceeds 0.1 per cent. The same Power control wakes and sleeps the display at any time, and the story stops.

Calm and reduced motion: no bloom or fold; power cuts straight to the still calibration field, and sleep cuts to dark. In 2D mode the same timeline runs on the DOM card with a `mask-image` radial reveal (animating `transform` and the mask only, no blur, no `background-position`) on the card, which is the screen and not a player.

Flash safety: all ramps are monotonic, no colour flashes, no saturated red, the seed and ring are small areas. The v1 7.1 limits apply (tile step under 0.10, designed under 0.05 per 100 ms).

### 3.4 Calibration field (the idle and loading graphic; original, no brands)

The "calibration field" (also called the Lumen pattern in this file), drawn in a 1600 x 900 unit space (16:9; for the 4:3 card and portrait it is re-fitted as below). It has no logo, name, clock, face or layout from any broadcaster or maker.

| # | Element | Spec |
|---|---|---|
| 1 | Field | `--tt-0` ink with a 32 x 18 dot grid, 1.5-unit dots at 20 per cent alpha in `--tt-3` |
| 2 | Interference rosette | Two sets of 24 concentric thin rings (1.5-unit stroke), set A centred (780, 450), set B at (820, 450), radii 40 to 385 step 15; A in `--lumen`, B in `--haze`, each at 35 per cent alpha, so moire fringes appear where they overlap |
| 3 | Iris | A disc of radius 120 at (800, 450) with a conic gradient (`--lumen` to `--haze` to `#ffb8dc` and back), softened edge, a pupil disc of radius 36 in ink |
| 4 | Axes | Hairlines through the iris across the whole field, 1 unit, `--tt-4`, ticks every 100 units |
| 5 | Corner marks | Four L-brackets of 60 units at the field corners, 3-unit stroke, `--lumen-bright` |
| 6 | Luminance ladder | A bottom strip (y 820 to 868, x 300 to 1300), 12 equal steps from ink to white (perceptually even) |
| 7 | Spectrum rails | Left and right margins (outside the 4:3 card): 20 vertical level bars each, 6 units wide, heights stepping 5 to 100 per cent like a spectrum, `--lumen` fading to `--haze`; static |
| 8 | Caption | `TRANSMISSION PENDING` in Space Grotesk 600, 56 units tall, letter-spaced, `--tt-7`, centred at (800, 150); `STAND BY` in Space Mono 400, 28 units, `--tt-5`, below it |
| 9 | Loading variant | The sub-caption becomes `TUNING... NN%` (real progress); the pattern at 40 per cent brightness |

The circles must stay circles (equal x and y scale). Portrait and narrow screens: scale to fit the shorter side, put the ladder along the bottom and the rails as two horizontal bands. Mean linear luminance about 0.14. Motion: none in the pattern; in full motion only the grain and a 0.2 Hz, 5 per cent shimmer of the rails; static in Calm.

### 3.5 Text presentation (replaces teletext)

The page and grid concept is kept; only the look changes, so the rasteriser and hit layer keep their maths.

- Canvas: 1280 x 720 logical in 3d-set (the pane is 16:9). The text **card** is a 4:3 region centred in the canvas (x 160 to 1120, 960 x 720), exactly v1's 960 x 720 grid area, so it keeps 40 columns and about 16 rows, `--tt-cell-aspect` 0.612, row pitch 1.1, safe area 0.92. The side margins show the pattern's spectrum rails (static or slow shimmer).
- The card: ink `--screen-bg` with a 1 px edge in `--lumen` at 35 per cent alpha and a 28 px corner radius (drawn). No scanlines, no curvature.
- Column bands: from the card's safe width W exactly as v1 section 5.2 (40 columns at 384 px or more, 32 at 320 to 383, 26 at 250 to 319, 20 at 192 to 249), glyphs at least 16 CSS px (the 3d-set card at a 1024 px viewport is about 460 px wide, so 40 columns at 19 px; at 1440 px it is about 650 px, 40 columns at 27 px).
- Page layout rows: header chip (rounded, `--screen-header-bg`, text `--screen-header-text`), title (Space Mono 700, `--screen-text-strong`), content lines (Space Mono 400, `--screen-text`), fastext row of four rounded chips (`--glass-chip-fill`, a 2 px underline in `--lumen`, text `--tt-7`).
- Verified facts are **lit chips**: a rounded rectangle (6 px radius) of `--screen-fact-bg` behind the fact text in `--screen-fact-text`, replacing the inverse block. The DOM transcript styles `[data-fact]` the same way. The second story page tells the visitor "the bright chips are true".
- Rules, frames and the diary page-100 frame are drawn rectangles and thin lines in `--screen-rule`.
- Text glow: `--glow-text` at most, on `--screen-text-strong` only; body text has no glow, so contrast is not reduced.
- Colour role mapping (all 4.5:1 or more): copy `--tt-5`, strong `--tt-7`, rules `--tt-3`, header chip `--screen-header-*`, chips as above.

### 3.6 Modes

| Mode | Presentation |
|---|---|
| `3d-set` | The device in its room (3.1), watch pose as 3.2, bloom-in and fold-away as 3.3, card and grid as 3.5. Breakpoint and rest as v1 3.1 |
| `3d-screen` | No device model. The pane fills the view: a rounded glass sheet (radius 28 px) with a 2 px edge light and an 8 px dark margin, the dock below as v1. The card is the full screen area (no rails), grid bands by W as v1. The room is replaced by a soft ink gradient with a faint cone of light behind the pane. Bloom-in runs on the sheet; no camera motion |
| `2d` | A DOM glass sheet over a slow conic-gradient field (frozen in Calm), the same frame model rendered as DOM text in Space Mono with lit-chip facts, the bloom-in as a mask reveal (3.3), a real footer. Notice bar as v1 3.4 |

## 4. The haunt, retold for 2050

All v1 limits stand (design-spec 16.7): ramps of at least 2 s, no sudden change, no jump scares, no flashes, text contrast 4.5:1 or better with the ghost at its maximum, and nothing at all under Calm or reduced motion. Cue grammar, scheduling and the hauntStore are unchanged (design-spec 16.3), so the frontend's parser keeps working.

### 4.1 Mapping

| v1 effect (cue) | 2050 equivalent | What changes |
|---|---|---|
| Haunted text: `tremble` | **Glyph drift** | Each glyph drifts on its own parallax depth, with a thin colour fringe: a copy of the glyph offset by up to `--haunt-fringe-max-px` (1.5 px) in `--haze` on one side and `--lumen` on the other, at 35 per cent alpha. Amplitude, duration and envelope unchanged (0.02 to 0.08 em, 1.5 to 5 s). Monochrome: no fringe |
| `rewrite` | **Glyph re-resolve** | The chosen word's letters blur into light (a soft glow bloom, 0.3 s) and re-resolve as the replacement letters one at a time (90 ms apart), hold, then re-resolve back (120 ms apart). Same word rules (letters only, never a fact segment, no digits) |
| `bleed` | **Light smear** | Threads of light fall from every third glyph into the blank row below: 0.25 cell wide, colour `--screen-smear` (lumen, 45 per cent alpha, fading to 0), length easing out from 0 to one row pitch. Same limits as v1 (alpha under 0.45, area under 1 per cent) |
| Ghost on the screen: `ghost`, `ghost-near` | **The Occupant forms out of holographic noise** | New figure, section 4.2. Same uniforms, ceilings, emergence timing and cap over text |
| Picture roll: `roll` | **Display slip** | The picture slips upward by one wrap in 2.4 s (same maths, peak speed under 0.8 screen heights per second), but its depth layers lag: the pattern or card layer moves with the offset, the background field lags 12 per cent behind, so a soft parallax opens and closes. Never rolled on the idle pattern or on a live player (it is not applied to a player at all) |
| Haunted set, knobs: `knob` | **Dial rings turn themselves** | The channel ring (outer) or volume ring (inner) on the puck rotates by `deg` over `over` seconds, ease in-out, with a light dot travelling round it. Never while hovered. 3d-set only |
| Room dim: `dim` | **Room light dims** | The overhead ring light and the wall back-light fall by `1 - dim x 0.65`; the pane's own light is unchanged. In 3d-screen and 2D, an edge vignette |
| Wall decal: `shadow` | **The Occupant's shadow on the frosted wall** | A soft, blurred silhouette of the figure behind the frosted wall panel, alpha at most `shadow x 0.10`, seen as if behind glass. 3d-set only |
| Projector hum: `hum` | **Projector hum** | Audio swell (a low 100 Hz tone with a 150 Hz beat and filtered noise) and a slow breathing of the pane's edge light (at most 0.3 Hz, 6 per cent). Muted under Calm |
| UI flicker (new, proposed): `glitch` | **The display glitches its own UI** | See 4.3 |
| Camera creep: `creep` | Unchanged | 3d-set only, bounded as v1 16.6.4 (the device bounding box must stay in the viewport) |

### 4.2 The Occupant (2050 figure)

Original greyscale-capable design, built from interference rather than from a photograph or a silhouette. It replaces the 1970s bust.

- **Overall:** a pale, translucent figure seen head and shoulders, rendered as if the display were slicing a person into light. It is slightly wrong in small ways, not monstrous.
- **Slice rendering:** the figure is made of 48 horizontal slices of equal height; each slice has a brighter 1.5-unit top line, and the slices are shifted sideways by a slow wave (plus or minus 1.2 per cent of the screen width, 0.2 Hz, never abrupt), with one wider tear at the throat shifted 3 per cent.
- **Head:** a tall egg 1.45 times taller than wide, tilted 6 degrees clockwise (the opposite of the old figure), narrower at the chin; the crown is a smooth darker cap with no parting; no ears, no nose, no mouth.
- **Face:** two hollow voids, tall ellipses, the right a little larger and lower than the left, the darkest tone. A thin vertical **seam of light** runs down the centre of the face from brow to chin (a 2-unit line, the brightest part of the figure). From `ghostNear` 0.8 the seam parts into a narrow slit, widening to 8 units over at least 4 s, so the face seems to open slowly. It never opens wider than that.
- **Neck and shoulders:** a long narrow neck wearing a smooth neck ring (a thin bright ellipse), narrow shoulders sloping about 22 degrees, and a high plain collar line instead of lapels; below the chest the body dissolves into noise. No hands.
- **Tone and colour:** face the palest (about 0.85 of the figure's peak), body 0.6, ring and seam brightest; the figure is `--screen-ghost` (`#cfeaff`) with a `--haze` fringe on its left edge and a `--lumen` fringe on its right (the fringe is a 0.4 to 1.2 px horizontal offset of the red and blue channels at the figure's edges). Monochrome: grey, no fringe.
- **Emergence from holographic noise:** `visible = smoothstep(n - w, n + w, ghost x mask x 1.2)` with `n` a speckle field (two octaves, grain 2 to 4 px, slowly drifting phase, not re-seeded, so the grain does not flicker faster than 12 Hz) so the figure condenses out of the same grain the display already shows: first the seam and the voids, then the head, ring and shoulders.
- **Size, position and ceilings:** exactly as v1 16.5 (height 0.35 to 0.95 of the glass over `ghostNear`, drift plus or minus 6 per cent with a 40 s period, y 0.62 to 0.45, peak luminance 0.30 on blank screen, `uGhostTextCap` x 0.5 over glyph cells, area-mean contribution at most 0.05 and at most 0.02 per 100 ms).
- **Why it is original:** a slice-lit figure with a seam for a face and a neck ring has no long hair over the face, no mask, no suit and tie, no child and no recognisable character from any film, game or book.
- **Modes:** 3d: the shader (`uGhost*`, sprite replaced by a procedural `drawOccupant2050` or the old function changed); 2D: the canvas layer and the same ceilings. Calm: no figure.

### 4.3 The haunted device: the `glitch` cue (new, proposed)

- Meaning: the display's own UI chrome stutters, as if it were struggling to hold its shape. Affects only decorative chrome: the HUD plates, the header chip and the fastext chips on the screen, and the pane's edge light. It never affects the dock keys, the info row, notices, the player or any control, so targets and contrast stay stable.
- Parameters: `amp` 0 to 1 (how deep the dip: opacity goes to `1 - amp x 0.45`, never below `--haunt-glitch-min-dip` 0.55), `dur` 1.0 to 2.0 s. Envelope: smooth in and out; at most one sub-dip, at no more than 1.5 Hz. No hard on/off.
- Rules: an event cue, so it follows the 2 s spacing rule and the one-text-effect-at-a-time rule does not apply (it is not a text effect). Off under Calm.
- Where it is shown in the story: after `staff` and after `diary` (commented in `intro.cues` until the parser supports it).

### 4.4 Safety summary for the 2050 additions

| Item | Limit |
|---|---|
| Colour fringe | At most 1.5 px, 35 per cent alpha, only on text and the Occupant, never red-dominant |
| Glow and bloom | Alpha at most 0.35; no area over 25 per cent bloomed in under 300 ms |
| Glitch | Opacity at least 0.55, at most 1.5 Hz, chrome only |
| Slip | 2.4 to 3 s, peak speed under 0.8 screen heights per second, not on live video |
| Hum edge-light breathing | At most 0.3 Hz and 6 per cent |
| Calm | Everything in this section is off |

## 5. The rewritten intro (`src/content/intro.tmpl`) and cues (`src/content/intro.cues`)

### 5.1 The telling

The Occupant is no longer trapped in a wooden set. It lives in a household light-field display: it is what remains of every picture the display ever showed. The story keeps the same nine pages and line counts as the 1970s version, so the cue anchors carry over unchanged. The facts are the same placeholders: tool, plugin, model, roles (including the tech lead), phases (all and finished), stack, commit count, revision, first-commit date and subject, and the model's co-author count. It never writes a digit (it names no year). The honesty page now says "the bright chips are true".

| Page | What it says (beat) | Cues (2050 meaning) |
|---|---|---|
| `signal` | "Did you just wake the display?" The first light in a long time | hum |
| `waking` | No memory of before; the bright chips are true; "I am the Occupant" | ghost begins to form, glyph drift |
| `makers` | Typed by the tool; the plugin's clipboard; the model's mind "like rain on a glass roof" | creep begins, MIND re-resolves as HOST |
| `staff` | The roles; the tech lead "still assigning" when the lights go out | room dims, light smear, a dial ring turns (glitch proposed) |
| `phases` | Phases "light up" in order, finished as of the commit; the order never drifts | glyph drift, display slip |
| `bones` | The stack; the lockfile as a prayer | figure clear but far, creep, PRAYER re-resolves as CELL |
| `diary` | Commit count, first entry date and subject, the model's signatures; "I can only see the glass" | room dims further, wall shadow, figure nearer, a dial ring turns, light smear, GLASS re-resolves as YOU (glitch proposed) |
| `glass` | "You have been very still"; "closer to the glass"; "everything I told you is true" | closest approach, light smear, strongest glyph drift |
| `settle` | It lets go; "leave the display on a little longer, it is warm"; transmission remains pending | figure fades, everything eases to warm |

### 5.2 Cue meanings

The cue names are unchanged, so the parser, scheduler and `hauntStore` keep working. Their 2050 meanings are the table in 4.1. The file's header comment lists them. One new cue, `glitch`, is proposed (4.3) and is commented out in the file so the shipped file still parses today.

### 5.3 Truthfulness and format checks

- Only existing placeholders: `provenance.tool`, `provenance.plugin`, `provenance.model`, `provenance.modelCoAuthoredCommitCount`, `agents.roles`, `phases.all`, `phases.done`, `source.revision`, `stack.list`, `git.commitCount`, `git.firstCommit.dateDisplay`, `git.firstCommit.subject`. It does not use `phases.current` (null when every phase is done).
- No hand-typed digit; no `!allow-digits` line needed.
- `rewrite` cues: `makers-3` word 6 (MIND to HOST), `bones-2` word 17 (PRAYER to CELL), `diary-5` word 14 (GLASS to YOU). The words and their positions are unchanged from the 1970s file, each is before any fact segment on its line, each replacement is no longer than the original letters.
- The fiction is metaphor and asserts nothing checkable.

### 5.4 Length and timing

The story is within a few per cent of the previous length (about 1,950 characters, 25 lines, 9 pages), so it keeps the same timing profile. The timing constants live in `src/state/timing.ts` (not repeated here); the target remains 45 to 90 s and the frontend re-measures after the facts pipeline runs. Calm: whole pages, manual advance.

## 6. UI chrome restyled

All of it is DOM above the canvas, outside the player rect, with the glass tokens in 1.3.

| Component | Restyle |
|---|---|
| **Dock** | A floating small-chrome glass capsule (`--glass-small-fill`, live blur 12 px at most, no nested blur, `--radius-lg`, `--glass-shadow`, a lit hairline `--glass-edge`). It is more than 24 px from the player rect by the layout rules (info row and gaps sit between); if a layout ever brings it within 24 px it becomes a solid flat plate with no glow. Keys are glass pills (44 px minimum, `--radius-sm`) with a small monoline icon (inline SVG, decorative, 1 kB each, `aria-hidden`) before the text label; the label is always present. The primary action of the moment (Power, Switch on, Play) is a lit pill (`--color-control-bg`, dark text). Toggles show a 3 px lumen underline plus the text result. Groups are separated by hairlines. Phone bar: four keys as v2 2.4 |
| **HUD** | Floating small-chrome glass plates (12 px blur at most) at the top edge (room name, channel readout). Channel readout is Space Mono, `CH 12  NAME`, text only, outside the rect. A faint lumen dot before the readout is static |
| **Info row** | A **solid flat plate** (`--glass-solid-fill`, 1 px border, no blur, no glow, no shadow bleed: it is within 24 px of the player rect): channel name, owner tag chip (outlined pill), "Watch on YouTube" underlined link in `--lumen` (12:1 on the solid plate), Back to controls and Stop as flat pills (no glow, no shadow). Never touches the rect |
| **Guide panel** | A tall tinted-glass panel (`--glass-large-fill` plus grain, no live blur; frosted by tint and grain, not blur), rows as cards (`--radius-md`, 8 px apart, no per-row blur), group headings as small-caps labels with a hairline, numbers in Space Mono in a lit chip, status as text chips (LIVE with a static mint dot and the word, OFF AIR with a rose edge and the word, STALE with an ember edge), STATE MEDIA and VIA YOUTUBE EMBED as outlined chips. Filters are pill toggles. Panel arrives with a 280 ms fade and an 8 px rise (`--ease-glass`; none in Calm) |
| **Room picker** | A grid of tinted-glass cards (large surface, no blur; 3 across on desktop, 1 on phones). Each card: a recoloured schematic, the name, the mood line. The featured card (mountain sky) is larger with an iridescent border (static) and a "Featured" chip. Current room: lumen underline and `aria-checked`. Loading: a thin progress line along the card's lower edge plus text |
| **Notices and dialogs** | A centred tinted-glass dialog (`--glass-large-fill`, no live blur, `--radius-lg`, `--glass-shadow`) over the plain scrim; heading in Space Grotesk 600; body 16 px, line length under 70 characters; buttons as pills (Continue is the lit pill). The first-play notice is shown before any player exists; any dialog opened while a player is visible hides and pauses it first |
| **Error and no-signal cards** | A tinted-glass card (no blur) in the player rect's place (the player is hidden while it shows): a static line icon, heading (Space Grotesk 600), plain reason, action pills. The rose appears on a 3 px left edge and the icon; text stays `--color-text`. Static in every mode |
| **Still card (Calm)** | A tinted-glass card (no blur) in the rect's place: channel name large, owner chip, the sentence "Press play to start the video. It will start muted.", and a lit Play pill. No YouTube image |
| **Focus mode** | Header (48 px) with the room and channel as a small-chrome glass strip (12 px blur at most) or a solid strip when it is within 24 px of the player; the player full width; the info row as the solid flat plate; the backdrop is the room, dimmed on the canvas element only (`filter: brightness(var(--focus-backdrop-brightness))`, plus grayscale when Monochrome), which is a sibling of the player and never an ancestor. No blur on the canvas (ADR 0012: live blur only on small chrome) |
| **Start screen** | The site name large in Space Grotesk, the Power pill as the lit primary, the secondary glass pills (Channel guide, Change the room with the second line "Try the mountain sky"), the content note and the Calm switch on a glass plate. The note text is unchanged in meaning (design-spec section 2, E1) |
| **Privacy page** | Static `privacy.html` on the ink background with one tinted-glass card (large surface, no blur), Space Grotesk headings, Space Mono for the origins table, the same fallbacks (`prefers-*`), real links underlined in `--lumen`. The copy is unchanged |

Motion: panels fade and rise 8 px over 280 ms with `--ease-glass`; hover brightens a pill 6 per cent and adds `--glow-lumen`; no looping animation anywhere in the chrome; everything 0 ms under Calm and reduced motion.

### 6.1 The Colour switch (kept, as the change document T50-5 says; Colour is the default, off is Monochrome)

- Control and keys unchanged (dock key "Colour", key `C`, `aria-pressed`, text result "Colour: on" or "Colour: off"). **Default: Colour on**, on every visit (remembered for the visit only).
- Colour off is **Monochrome**: one `filter: grayscale(1)` on the `<canvas>` element, and `<html data-colour="mono">`, which greys the site's own accents (the token overrides in `tokens-2050.css`). Site chrome, rooms and channel 0 all become greyscale (R = G = B within 2 levels). It never touches the YouTube player, any ancestor of it, or video content.
- It applies to channel 0 too (channel 0 is no longer always B&W; in Monochrome it reads as a pale grey light-field and the Occupant's colour fringe is removed). The v1 greyscale test is reused as the Monochrome check.
- Transition: 600 ms (`--ease-soft`), instant in Calm. Announcement: "Colour on" and "Monochrome".
- The colour-era tint (V2-FR-36) is retired: the Holo room is already in colour and has its own palette.
- The other rooms keep their authored palettes; Monochrome is still the filter.

### 6.2 Other rooms and the chrome

The other eight rooms keep their scenes and ambient motion. They take the 2050 chrome above and the new tokens. The Holo room replaces the earlier TV room; the picker label is "Holo room" and its schematic shows the pane and puck. User-facing and repo-facing copy never calls it a "television" or "set" (T50-12).

### 6.3 Solid panels (T50-6)

A second visible, keyboard-operable switch, "Solid panels" (More sheet and the start screen's plate, `aria-pressed`, key `U`, listed in the Keyboard help), turns every translucent surface opaque: `<html data-glass="solid">`, with no blur, no grain, no glow beyond alpha 0.2, and a 0.92 scrim. It is on automatically when `prefers-reduced-transparency: reduce` applies, when `backdrop-filter` is unsupported, or when `AdaptiveDpr` has stepped down (the viewer may still turn it off if the first two do not apply). `prefers-contrast: more` implies solid panels plus the stronger borders in 1.5. Contrast ratios in solid mode are 11:1 or better. State is announced ("Solid panels on").

## 7. Requests for other agents

Also in `docs/handoffs/ux-ui-designer.md`.

- **technical-artist:** the Lumen pane, puck and Holo room (3.1, same node names); the wake (bloom-in) and sleep (fold-away) shader timelines (3.3: seed, hairlines, panel outline, field fill, sharpen) replacing the CRT warm-up and collapse (`uWarmup` and `uCollapse` drive them, keep 2.2 s and 0.55 s); the calibration field (3.4) as the idle and loading picture, replacing `drawTestCard` with `drawStandby` (same call shape); the 2050 Occupant (4.2) with slice rendering, speckle emergence, colour fringe and seam, same `drawOccupant` API; the display slip with a lagging background layer (4.1); the pane edge light (outward glow at most 8 px) and `hum` breathing; volumetric light only as additive cone and shell meshes with depth write off, 2 ms GPU, particles 2,000 mobile and 10,000 desktop; the coloured environment replacing `GreyEnvironment`; remove scanlines, curvature, CRT vignette and jitter (keep the retired uniforms declared and ignored for one release); fetch, subset and ship the three fonts (Space Grotesk, Atkinson Hyperlegible, Space Mono) and their licences (section 2); bake nothing that carries a brand; re-measure flash, contrast and the red-flash rule for the new sequence.
- **scene-developer:** swap the TV body for the pane and puck (node names unchanged, anchor `{ aspect: 16/9, fill: 0.60, align: 'centre' }`, the player rect inset 1.5 per cent); the overhead ring light and wall back-light for `dim`; the wall decal on the frosted panel (alpha at most 0.10); `ControlRings` for `knob-channel` and `knob-volume` with the light-dot animation (same contract as `KnobLayer`, optional pane lean of at most 2 degrees on a `knob` cue on channel 0 only); the watch pose unchanged mechanically (BUG-1 framing for the whole device); remove the dome logic and the colour-era tint; keep `uKeepOut` and `spill`; nothing frosted or glowing within 24 px of the rect on the 3D side beyond the screen-owned edge light.
- **frontend-developer:**
  - Swap `tokens.css` for `tokens-2050.css` and `fonts.css` for `fonts-2050.css` (same property names).
  - Restyle the dock, HUD, guide, picker, notices, error and still cards, info row and start screen by the glass levels in 1.3: live blur only on small chrome (12 px or less), tinted no-blur glass on large panels, solid flat plates within 24 px of the rect, no blur on the canvas.
  - `data-colour` (`mono` when Colour is off, default Colour on) and `data-glass="solid"` on `<html>`: set it for `prefers-reduced-transparency`, no `backdrop-filter`, an `AdaptiveDpr` step-down, or the viewer's "Solid panels" switch (More sheet and the start plate, key `U`); the grayscale filter on the canvas element only.
  - Lit-chip facts in the rasteriser and the transcript; the canvas 1280 x 720 with the 4:3 card centred (3.5), grid and bands unchanged; `draw.ts`, `palette.ts` and `font.ts` for the new look and Space Mono's measured advance.
  - Glyph drift, re-resolve and smear in the effect layer (4.1); 2D bloom as a mask reveal with no blur.
  - Add the `glitch` cue to the parser and scheduler (4.3), then uncomment the two lines in `intro.cues`.
  - "Build log" and "LOG" labels in place of "page 100" and "P100" (T50-12); no 1970s, CRT, teletext or "television set" wording in any user-facing text.
  - Replace the greyscale pixel test expectations (Monochrome only).
- **architect:** accept ADR 0012 against this spec; confirm the greyscale rule and `NoToneMapping` constraint (architecture 4.5) are retired for site art (`NeutralToneMapping` recommended); `tv-room` stays the internal id; the 16:9 anchor with a centred 4:3 card fits the contract and grid code; the `index.html` font preload points at Space Mono; allow-list the retired token names (`--crt-*`, `--font-teletext`) in the T50-12 grep or rename them in a later cleanup; colour tokens and the inline grain tile must pass the CSP (`img-src data:` is allowed).
- **qa-engineer:** Monochrome test (R = G = B outside the player), the red-flash rule, glass contrast sampling over the brightest room frame per panel (1.4) and at peak light, `prefers-reduced-transparency`, `prefers-contrast` and Solid panels screenshots, the no-`backdrop-filter`-near-the-player test (24 px), the cue file and anchor tests, flash tests for the wake, sleep, ghost and slip.
- **product-manager:** the 1970s wording sweep (T50-12) for copy outside the files I own; the permission email edit.

## 8. Open questions

Settled by the change document and ADR 0012: the Colour switch is kept with Colour as the default (off is Monochrome) and it covers chrome, rooms and channel 0; a "Solid panels" option exists; a monospaced face is used for the screen; live blur only on small chrome; no frosted or glowing element within 24 px of the player; volumetric light as additive meshes only; the copy never writes a year, so `!allow-digits 2050` is not needed.

| # | Question | Default |
|---|---|---|
| Q-50-1 | Rename the internal `tv-room` id to `holo-room`, or keep the id and change only the label? | Keep the id, change the label to "Holo room" |
| Q-50-2 | The pane is 16:9 and the text card is a centred 4:3 region with spectrum rails at the sides, to keep the grid maths. Acceptable, or redesign the grid for 16:9? | Accept |
| Q-50-3 | Three fonts: Space Grotesk (headings), Atkinson Hyperlegible (body, chosen for distinct l, 1, I and 0, O), Space Mono (screen grid). Any preference for a more futuristic display face such as Exo 2 or Rajdhani? | Keep these three |
| Q-50-4 | Add the `glitch` cue (display UI stutter) now, or leave it for a later pass? The shipped cue file parses either way | Add it (small parser change) |
| Q-50-5 | Should the story mention the year (for example "the year of the light")? It does not today. If yes, `!allow-digits <year>` is needed and the copy must not contradict `git.firstCommit.dateDisplay` | No year |
| Q-50-6 | Optional pane lean (at most 2 degrees) on channel 0 when a dial ring turns: include or skip? | Include on channel 0 only, skip if it costs time |
