# Font licences

Owner: ux-ui-designer. Self-hosted only; no font CDN (NFR-7). Every font must be listed here before it ships (NFR-13).

## Status: font files NOT yet added

The designer's environment had no shell or network, so the WOFF2 files could not be downloaded. The files below are specified exactly; whoever has a shell (tech lead or frontend-developer) should fetch them, then tick the boxes. Until the files exist, the CSS stacks in `src/styles/tokens.css` fall back to system monospace and an Arial-style narrow sans, and the layout still works (the teletext grid is measured, not assumed).

| Role | Family | Licence | Source | File to ship | Added |
|---|---|---|---|---|---|
| Screen body, teletext blocks | Bedstead (Ben Harris) | Public domain / free (the author's licence file ships with the font; confirm wording in `LICENSE` when downloading and paste it below) | https://bjh21.me.uk/bedstead/ (also packaged on GitHub: https://github.com/bjh21/bedstead) | `bedstead-regular.woff2` | [ ] |
| Labels, buttons, headings | Barlow Condensed, weights 400 and 600 | SIL Open Font License 1.1 | https://github.com/jpt/barlow (releases) or https://fonts.google.com/specimen/Barlow+Condensed (download family, not CDN) | `barlow-condensed-400.woff2`, `barlow-condensed-600.woff2` | [ ] |

## How to produce the files

1. Download the sources from the URLs above (the repository or release archive, not a CDN link).
2. Bedstead ships as OTF/TTF (and a "bedstead.otf"). Convert to WOFF2 with `woff2_compress` (Google `woff2` tool) or `fonttools`: `pip install fonttools brotli` then `fonttools ttLib.woff2 compress bedstead.otf`.
3. Subset to keep each file small (budget in architecture section 6: fonts 150 kB in total). Keep Basic Latin, Latin-1 Supplement, punctuation, and for Bedstead the Symbols for Legacy Computing block (`U+1FB00-1FBFF`) and Block Elements (`U+2580-259F`) used by the mosaic graphics. Example:
   `pyftsubset bedstead.otf --unicodes="U+0020-007E,U+00A0-00FF,U+2018-201D,U+2026,U+2580-259F,U+1FB00-1FBFF" --flavor=woff2 --output-file=bedstead-regular.woff2`
   Barlow Condensed: Basic Latin, Latin-1, punctuation only.
4. Place the files in this folder, tick the boxes above, and paste each upstream licence text into `licences/` (for example `licences/OFL-Barlow.txt`, `licences/Bedstead-LICENSE.txt`).
5. Import `src/styles/fonts.css` once the files exist (frontend-developer: from `src/main.tsx`). The canvas rasteriser must `await document.fonts.load('16px Bedstead')` before the first draw (architecture section 8).

## Fallback if Bedstead's licence cannot be confirmed

Use "VT323" (SIL Open Font License 1.1, https://github.com/phoikoi/VT323 or Google Fonts download), and draw the mosaic block characters in the rasteriser as filled rectangles (2 by 3 sextant cells) instead of relying on font glyphs. Update this file and the `--font-teletext` token if the swap is made.

## Not allowed

- Fonts with a non-commercial or no-redistribution licence.
- Any font loaded from a third-party host at runtime.
- Trademarked typefaces (for example named broadcaster or network faces).
