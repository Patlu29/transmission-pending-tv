# 0005: Draw the screen into one canvas, keep the DOM as the text of record, and do CRT effects in the screen material

## Status
Accepted (2026-11-10)

## Context
The intro must look like teletext on a curved CRT (FR-3, FR-4), exist as real DOM text (FR-18), fall back to a 2D presentation without WebGL (FR-20), take over at the current line if the context is lost (US-12), and stay readable on phones (NFR-5). Options for getting text onto the 3D screen: drei `<Html transform>` (DOM, but shader effects cannot apply to it); drei `<Text>` into a render target (an extra scene and font pipeline); or drawing on a 2D canvas used as a texture.

## Decision
- A teletext rasteriser (`src/ui/teletext/`, frontend-developer) draws the current page state from `introStore` onto one `HTMLCanvasElement`, on a character grid with a responsive column count.
- In 3D modes the scene wraps it in a `CanvasTexture`. One screen `ShaderMaterial` (technical artist) applies scanlines, curvature, phosphor glow, vignette, noise and the warm-up collapse.
- The DOM transcript is always present and is the accessible text of record. In 2D mode it is also the visible screen, styled with CSS.
- No `@react-three/postprocessing` for the MVP. If glow must spill onto the bezel, the technical artist may propose it in a new ADR with a measured cost.

## Consequences
- One code path for screen content in both 3D modes; tests can read facts from DOM text in every mode.
- The texture update cost is small: redraw only when the store changes.
- Text in the canvas and in the DOM come from the same resolved intro data, so they cannot disagree on facts.
- Fonts must be fully loaded before the first canvas draw.
