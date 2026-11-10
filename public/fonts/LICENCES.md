# Font licences

Owner: ux-ui-designer (files and licence texts added by technical-artist, 2026-11-10). Self-hosted only; no font CDN (NFR-7). Every font must be listed here before it ships (NFR-13).

## Shipped files

| Role | Family | Licence | Source (downloaded 2026-11-10) | File | Size | Licence text |
|---|---|---|---|---|---|---|
| Screen body, teletext blocks | Bedstead 3.261 (Ben Harris, Simon Tatham, Marnanel Thurman, Neil Williamson) | CC0 1.0 Universal (public domain dedication) for the generator and all newly designed glyphs. See the caveat below about the SAA5050 glyph shapes | https://bjh21.me.uk/bedstead/bedstead-3.261.zip (file `bedstead.otf`) | `bedstead-regular.woff2` | 6.2 kB | `licences/Bedstead-CC0-COPYING.txt` (the `COPYING` file from the zip) and `licences/Bedstead-source-notice.txt` (the header of `bedstead.c`, which states the dedication) |
| Labels, buttons, headings | Barlow Condensed Regular (400) | SIL Open Font License 1.1, "Copyright 2017 The Barlow Project Authors" | https://github.com/jpt/barlow (`fonts/ttf/BarlowCondensed-Regular.ttf`) | `barlow-condensed-400.woff2` | 21.6 kB | `licences/OFL-Barlow-Condensed.txt` |
| Labels, buttons, headings | Barlow Condensed SemiBold (600) | SIL Open Font License 1.1 | same repository (`BarlowCondensed-SemiBold.ttf`) | `barlow-condensed-600.woff2` | 22.9 kB | same file |

Total: about 50.7 kB of the 150 kB budget (architecture section 6).

## Licence check (done from the downloaded text, not from memory)

- **Barlow Condensed:** `OFL.txt` from the upstream repository is the SIL OFL 1.1. It declares no Reserved Font Name, and the subset keeps the family name. The OFL allows bundling, subsetting and format conversion as long as the licence text travels with the files and the fonts are not sold on their own. Both are met (`licences/OFL-Barlow-Condensed.txt`).
- **Bedstead:** the `COPYING` file in the release zip is the CC0 1.0 text. `bedstead.c` states that Ben Harris, Simon Tatham, Marnanel Thurman and Neil Williamson "have dedicated all copyright and related and neighboring rights to this software and the embodied typeface to the public domain worldwide". That covers the generator and every newly designed glyph.
- **Caveat the maintainers should know about:** the same header says many of the bitmaps come from the Mullard SAA5050 typeface, whose copyright "will still be owned by Mullard's corporate successors". The authors rely on section 55 of the UK Copyright, Designs and Patents Act 1988, under which use of articles designed for producing material in that typeface does not infringe. The author's own web page says "I'm not a lawyer, though, so this may well be wrong." So the CC0 dedication is clear for the new work, and the SAA5050 letter shapes rest on a UK statutory argument rather than a licence grant. The font is distributed this way by the upstream project and widely repackaged. If the owner wants zero residual doubt, the documented swap is VT323 (SIL OFL 1.1): change `--font-teletext`, `src/styles/fonts.css`, and draw the sextant mosaic blocks in the rasteriser as rectangles.

## What was changed from upstream

| File | Change |
|---|---|
| `bedstead-regular.woff2` | Subset with fontTools `pyftsubset` to U+0020-007E, U+00A0-00FF, U+2013-2014, U+2018-201D, U+2022, U+2026, U+2190-2193, U+2580-259F (Block Elements), U+25A0-25A1 and U+1FB00-1FBFF (Symbols for Legacy Computing, the sextant mosaics), all layout features dropped, WOFF2. 302 glyphs. Outlines unchanged |
| `barlow-condensed-400.woff2`, `barlow-condensed-600.woff2` | Subset to U+0020-007E, U+00A0-00FF, U+2013-2014, U+2018-201D, U+2022, U+2026, U+2190-2193, features `kern` and `liga` kept, WOFF2. Outlines unchanged |

To redo it: `pip install fonttools brotli`, then `pyftsubset <source> --unicodes="<the ranges above>" --flavor=woff2 --output-file=<name>.woff2`.

## Usage notes

- Import `src/styles/fonts.css` once (frontend-developer: from `src/main.tsx`). The files now exist, so the 404 warning in that file no longer applies.
- The canvas rasteriser must `await document.fonts.load('16px Bedstead')` (and `600 16px "Barlow Condensed"` for the test card caption) before the first draw (architecture section 8).
- Bedstead advance width is 600 units on a 1000 unit em (0.6 em), matching `--tt-cell-aspect`.

## Not allowed

- Fonts with a non-commercial or no-redistribution licence.
- Any font loaded from a third-party host at runtime.
- Trademarked typefaces (for example named broadcaster or network faces).
