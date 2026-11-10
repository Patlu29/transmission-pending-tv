# Handoff: ux-ui-designer

## Summary
Wrote the design spec (modes, camera, teletext grid, flows, motion and flash rules, test card, TV body direction, accessibility), the greyscale tokens, the real intro copy (eight pages, no hand-typed digits, `!draft` removed), a new favicon and the font plan. The environment had no shell, so `npm run facts`, `CI=true npm run facts` and the font downloads were NOT run; they are the first requests below.

## Files changed
- docs/design-spec.md: full design spec
- src/styles/tokens.css: greyscale tokens (colour, screen palette, TV body, type, grid, spacing, layers, motion, CRT 2D)
- src/styles/fonts.css: `@font-face` for Bedstead and Barlow Condensed; do not import until the WOFF2 files exist
- src/content/intro.tmpl: real intro, `!draft` removed
- public/favicon.svg: greyscale TV with test-card circle
- public/fonts/LICENCES.md: font choices, licences, download, convert and subset instructions (files not yet added)
- docs/handoffs/ux-ui-designer.md: this note

## Decisions
- 3d-set only for `(min-width: 1024px) and (min-height: 600px) and (min-aspect-ratio: 5/4) and (hover: hover) and (pointer: fine)`; everything else is 3d-screen (tablets in landscape included): touch cannot hover and the knobs are small targets.
- Teletext columns come from the safe screen width W (0.92 of on-screen width): 40 cols at 384 px or more, 32 at 320 to 383, 26 at 250 to 319, 20 at 192 to 249. Cell width is 0.6 x font size, so glyphs are at least 16 CSS px in every band. A 360 px phone gets 26 columns at about 20 px.
- Facts render as inverse blocks (also on `[data-fact]` in the DOM), so the visitor can see which words are verified. The honesty page of the intro says so.
- Intro avoids `{{ phases.current }}` because it is null when every phase is Done and would stop the build.
- Added a Pause control: the intro auto-plays for more than 5 s, so WCAG 2.2.2 needs one.
- Single-key shortcuts only work while focus is in the television region (WCAG 2.1.4).
- Intro timing: reveal 90 characters per second, 250 ms line gap, page hold 800 ms plus 8 ms per character, 1 s end hold. About 43 s for roughly 1,600 characters, 24 lines and 8 pages.
- Fonts: Bedstead (teletext body and mosaic blocks) and Barlow Condensed 400 and 600 (labels and headings). VT323 is the fallback if Bedstead's licence wording cannot be confirmed.
- Skip goes to the diary index (P100), not the last intro page.

## Assumptions
- The licence terms are as I remember them (Barlow Condensed under SIL OFL 1.1; Bedstead free to use). Whoever downloads the files must confirm and paste the licence text.
- Intro duration math assumes roughly the character count resolved from the current facts; the role list grows as agents hand off, which adds characters but stays within the 1,000 to 2,400 band in the spec.
- `agents.roles` will include "UX/UI designer" once this note is committed (ordering is by the commit that first added each note).

## Open questions
- Is a manual "Calm mode" toggle wanted on the start screen, as well as following the OS setting? The spec follows the OS only (tech lead / user).
- Should power be switchable off again? The spec treats power as one way. (tech lead / user)
- Is Bedstead's licence acceptable once checked, or should the team use VT323? (tech lead)

## Requests for other agents
- tech lead (needs a shell): run `npm run facts`, then `CI=true npm run facts`. The template was written to pass; the strict run should fail only on uncommitted changes. If a placeholder errors, tell me the line. Also download and convert the fonts as in `public/fonts/LICENCES.md`, add the licence texts, tick the table, and tell frontend-developer to import `src/styles/fonts.css`.
- frontend-developer: implement the modes and mode query exactly as in design-spec 3.1; the dock, Pause key, focus moves, live region and transcript dialog (9.1 to 9.4); the reveal constants exported as `REVEAL_CPS`, `LINE_GAP_MS`, `PAGE_HOLD_BASE_MS`, `PAGE_HOLD_PER_CHAR_MS`, `END_HOLD_MS`; the grid maths (5.1 and 5.2); diary pages P100 and up (5.4); facts as inverse blocks; shortcuts only in the television region; import `src/styles/tokens.css`; the `<noscript>` text goes in `index.html` via the architect.
- scene-developer: camera poses and limits in design-spec 4 (Idle, Watch, orbit limits, reset, power dolly of 1200 ms); no camera movement under reduced motion; knob picking with hover outlines and anchored tags (4.3); `3d-screen` has no camera motion; mode switching never mid-playback.
- technical-artist: the TV body in design-spec 10 (proportions, materials, node names `screen`, `knob-power`, `knob-channel`, `knob-volume`, budget 1.5 MB); CRT shader effects within the flash rules in section 7 (noise grain at least 2 CSS px and at most 24 Hz, zero-mean; rolling bar and jitter limits; frozen noise for reduced motion; room light low-passed at 2 Hz); keep post-effect text contrast 4.5:1; the test card (section 11) as a drawn or baked greyscale texture.
- architect: add a `<noscript>` message to `index.html`; confirm whether `src/styles/fonts.css` import belongs in `main.tsx`.
- qa-engineer: flash checks per design-spec 7.1; contrast sampling of screen text under scanlines and noise; the three modes with `?mode=`; duration check against the constants in 6.3; reduced-motion live switching; sampling the favicon and every mode for R=G=B within 2 levels.
- performance-optimiser: fonts budget 150 kB total; canvas is 960 x 720 logical in 3d-set, device-pixel-scaled elsewhere.
- devops-engineer: none.
