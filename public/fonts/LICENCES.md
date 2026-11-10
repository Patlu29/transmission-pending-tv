# Font licences

Owner: ux-ui-designer (files and licence texts added by technical-artist; Bedstead replaced by VT323 in round 2, 2026-11-10). Self-hosted only; no font CDN (NFR-7). Every font must be listed here before it ships (NFR-13).

## Shipped files

| Role | Family | Licence | Source (downloaded 2026-11-10) | File | Size | Licence text |
|---|---|---|---|---|---|---|
| Screen body (teletext) | VT323 Regular | SIL Open Font License 1.1, "Copyright 2011, The VT323 Project Authors" | https://github.com/phoikoi/VT323 (`fonts/ttf/VT323-Regular.ttf`, `OFL.txt`) | `vt323-regular.woff2` | 16.0 kB | `licences/OFL-VT323.txt` |
| Labels, buttons, headings | Barlow Condensed Regular (400) | SIL OFL 1.1, "Copyright 2017 The Barlow Project Authors" | https://github.com/jpt/barlow (`fonts/ttf/BarlowCondensed-Regular.ttf`) | `barlow-condensed-400.woff2` | 21.6 kB | `licences/OFL-Barlow-Condensed.txt` |
| Labels, buttons, headings | Barlow Condensed SemiBold (600) | SIL OFL 1.1 | same repository (`BarlowCondensed-SemiBold.ttf`) | `barlow-condensed-600.woff2` | 22.9 kB | same file |

Total: 60.5 kB of WOFF2 against the 150 kB budget (architecture section 6).

## Licence check (from the downloaded text)

- Both families ship the SIL OFL 1.1 text as `OFL.txt` upstream. Neither declares a Reserved Font Name, and the subsets keep the family names. The OFL allows bundling, subsetting and format conversion provided the licence text travels with the files and the fonts are not sold on their own. Both texts are in `licences/`.
- Bedstead was removed on the project owner's decision (its SAA5050 glyph shapes rest on a UK statutory argument, not a licence grant). Its file and licence texts are deleted.

## Measured metrics (VT323, for the rasteriser)

- Units per em 1000, advance width of every tested glyph (A, M, i, space, 0) is 400, so **cell width = 0.4 em**. The design token `--tt-cell-aspect` (0.6) assumed Bedstead and no longer matches this font: draw size must come from `measureText`, as the frontend plans.
- hhea ascent 800, descent 200 (line box 1.0 em).
- No sextant mosaic glyphs (U+1FB00 block): draw mosaics, rules and bleed streaks as rectangles. Block Elements (U+2580-259F) are not in the subset either.

## What was changed from upstream

| File | Change |
|---|---|
| `vt323-regular.woff2` | fontTools `pyftsubset` to U+0020-007E, U+00A0-00FF, U+2013-2014, U+2018-201D, U+2022, U+2026, U+2190-2193, feature `kern` only, WOFF2. 200 glyphs. Outlines unchanged |
| `barlow-condensed-400.woff2`, `barlow-condensed-600.woff2` | Subset to the same ranges, features `kern` and `liga`, WOFF2. Outlines unchanged |

To redo it: `pip install fonttools brotli`, then `pyftsubset <source> --unicodes="<the ranges above>" --flavor=woff2 --output-file=<name>.woff2`.

## Usage notes

- `src/styles/fonts.css` points at these files. Await `document.fonts.load('16px VT323')` and `document.fonts.load('600 16px "Barlow Condensed"')` before the first canvas draw (architecture section 8).

## Not allowed

- Fonts with a non-commercial or no-redistribution licence.
- Any font loaded from a third-party host at runtime.
- Trademarked typefaces (for example named broadcaster or network faces).
