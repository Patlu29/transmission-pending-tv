# Texture licences

All textures are original work made for this project, in greyscale only (R = G = B). Nothing is copied from a real
broadcaster, test card, logo or photograph.

| File | What | Made by | Size | Licence |
|---|---|---|---|---|
| `test-card-960x720.png` | The original test card (design-spec section 11) baked at 4:3, 8-bit greyscale. Drawn by `src/scene/materials/testcard/drawTestCard.ts`. For the 2D mode and as a fallback image; the 3D screen draws the card live | technical-artist, generated from code | 33.1 kB | Project's own, same as the repository |
| `noise-tile-64.png` | 64 by 64 uniform grey noise, seeded (Python `random`, seed 1974), for the 2D CSS static layer (`src/scene/materials/crt2d/crt2d.css`) | technical-artist, generated | 4.2 kB | Project's own |

Fonts used inside the card caption are listed in `public/fonts/LICENCES.md` (Barlow Condensed under SIL OFL 1.1,
VT323 under SIL OFL 1.1). The baked PNG contains rendered glyphs only, not font files.

Procedural textures built at run time (nothing to download): the grey walnut grain and the control plate with etched
labels and grille, in `src/scene/materials/tv/tvTextures.ts`.

## v2 rooms (added 2026-11-11)
No texture files are added for the nine v2 rooms. Every room texture is drawn at run time on a canvas or computed in a
shader (cloud puffs, Earth, rain and bokeh, parallax strips, the "CHAI" and "EXIT" signs, the wall paper and dust
tiles). Original work, no photographs, no real mountain, no NASA or other imagery, no brand marks. The sign text is
generic and set in Barlow Condensed (SIL OFL 1.1, see `public/fonts/LICENCES.md`).

## 2050 retheme (added 2026-11-11)
No new texture files. The calibration field (`src/scene/materials/standby/drawStandby.ts`), the Occupant figure
(`src/scene/materials/holo/occupant2050.ts`) and the room textures are drawn at run time. Original work, no brand marks.
`test-card-960x720.png` is the 1970s test card and is not used by the 2050 build (see the handoff's removal list);
`noise-tile-64.png` is still used for the light-field grain in `holo2d.css`. Caption fonts: Space Grotesk and Space Mono
(SIL OFL 1.1, see `public/fonts/LICENCES.md`).
