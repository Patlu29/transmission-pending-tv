# Texture licences

All textures are original work made for this project, in greyscale only (R = G = B). Nothing is copied from a real
broadcaster, test card, logo or photograph.

| File | What | Made by | Size | Licence |
|---|---|---|---|---|
| `test-card-960x720.png` | The original test card (design-spec section 11) baked at 4:3, 8-bit greyscale. Drawn by `src/scene/materials/testcard/drawTestCard.ts`. For the 2D mode and as a fallback image; the 3D screen draws the card live | technical-artist, generated from code | 33.1 kB | Project's own, same as the repository |
| `noise-tile-64.png` | 64 by 64 uniform grey noise, seeded (Python `random`, seed 1974), for the 2D CSS static layer (`src/scene/materials/crt2d/crt2d.css`) | technical-artist, generated | 4.2 kB | Project's own |

Fonts used inside the card caption are listed in `public/fonts/LICENCES.md` (Barlow Condensed under SIL OFL 1.1,
Bedstead under CC0). The baked PNG contains rendered glyphs only, not font files.

Procedural textures built at run time (nothing to download): the grey walnut grain and the control plate with etched
labels and grille, in `src/scene/materials/tv/tvTextures.ts`.
