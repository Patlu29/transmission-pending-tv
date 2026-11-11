# Font licences

Owner: ux-ui-designer (files and licence texts added by technical-artist, 2050 retheme, 2026-11-11). Self-hosted only; no font CDN (NFR-7). Every font must be listed here before it ships (NFR-13). VT323 and Barlow Condensed left `v2` (they stay on `main`).

## Shipped files

| Role | Family | Licence | Source (downloaded 2026-11-11) | File | Size | Licence text |
|---|---|---|---|---|---|---|
| Headings and key labels | Space Grotesk (variable, weight axis 300 to 700) | SIL Open Font License 1.1, "Copyright 2020 The Space Grotesk Project Authors" | https://github.com/floriankarsten/space-grotesk (`fonts/ttf/SpaceGrotesk[wght].ttf`, `OFL.txt`) | `space-grotesk-latin.woff2` | 18.4 kB | `licences/OFL-Space-Grotesk.txt` |
| Body text (DOM) | Atkinson Hyperlegible Regular (400) | SIL OFL 1.1, "Copyright 2020 Braille Institute of America, Inc." | https://github.com/googlefonts/atkinson-hyperlegible (`fonts/ttf/AtkinsonHyperlegible-Regular.ttf`, `OFL.txt`) | `atkinson-hyperlegible-400.woff2` | 14.6 kB | `licences/OFL-Atkinson-Hyperlegible.txt` |
| Body text (DOM) | Atkinson Hyperlegible Bold (700) | SIL OFL 1.1 | same repository (`AtkinsonHyperlegible-Bold.ttf`) | `atkinson-hyperlegible-700.woff2` | 14.9 kB | same file |
| Screen grid, channel numbers | Space Mono Regular (400) | SIL OFL 1.1, "Copyright 2016 The Space Mono Project Authors" | https://github.com/googlefonts/spacemono (`fonts/ttf/SpaceMono-Regular.ttf`, `OFL.txt`) | `space-mono-regular.woff2` | 13.9 kB | `licences/OFL-Space-Mono.txt` |
| Screen grid, channel numbers | Space Mono Bold (700) | SIL OFL 1.1 | same repository (`SpaceMono-Bold.ttf`) | `space-mono-bold.woff2` | 14.1 kB | same file |

Total: 75.9 kB of WOFF2 against the 150 kB budget (design-spec-2050 section 2 expected about 95 kB).

## Licence check (from the downloaded text)

- All three families ship the SIL OFL 1.1 as `OFL.txt` upstream. None declares a Reserved Font Name, and the subsets keep the family names. The OFL allows bundling, subsetting and format conversion provided the licence text travels with the files and the fonts are not sold on their own. The three texts are in `licences/`.
- No file is loaded from a third-party host.

## Measured metrics (Space Mono, for the rasteriser)

- Units per em 1000. Advance width of every glyph tested (A, M, i, space, 0, O, 1, l, I) is **612, so cell width = 0.612 em** in both weights, matching `--tt-cell-aspect` 0.612.
- hhea and OS/2 ascent 1120, descent 361 (line box 1.481 em, taller than the 1.1 row pitch): size the draw from `measureText`, cap it by the row pitch, and position glyphs by the baseline, not the line box.
- Look-alikes at 16 CSS px (checked at 3x zoom): `1`, `l` and `I` differ clearly (flag on 1, curved tail on l, serifs on I). Zero is a dotted zero and is narrower than `O`; it is distinct but the dot is faint below about 18 px, so numerals in tables should use weight 700. The face has `ss01` and `ss02` alternates (both change the 1 and the I) if a stronger difference is wanted; it has no `zero` feature.
- Atkinson Hyperlegible has a slashed zero (clear at 16 px). Space Grotesk's weight axis is kept (300 to 700).

## What was changed from upstream

| File | Change |
|---|---|
| all five | fontTools `pyftsubset` to U+0020-007E, U+00A0-00FF, U+2013-2014, U+2018-201D, U+2022, U+2026, U+2190-2193, WOFF2. Outlines unchanged. Space Grotesk: kept `kern liga calt ss01-ss04 zero` where present and the variable axis. Space Mono: kept `kern ss01-ss07 zero` where present (only `ss01` and `ss02` exist). Atkinson: `kern liga` |

To redo it: `pip install fonttools brotli`, then `pyftsubset <source> --unicodes="<the ranges above>" --flavor=woff2 --output-file=<name>.woff2`.

## Usage notes

- `src/styles/fonts-2050.css` points at these files (the frontend swaps it in for `fonts.css`). Await `document.fonts.load('16px "Space Mono"')` and `document.fonts.load('600 16px "Space Grotesk"')` before the first canvas draw (architecture section 8). `index.html`'s preload should point at `space-mono-regular.woff2` (architect).

## Not allowed

- Fonts with a non-commercial or no-redistribution licence.
- Any font loaded from a third-party host at runtime.
- Trademarked typefaces.
