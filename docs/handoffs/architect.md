# Handoff: architect

## Summary
Chose the stack (Vite 8, React 19.3, R3F 9.8, drei 10.7, three 0.187, zustand 5.1, TypeScript 6.0.3; no backend), wrote `docs/architecture.md` and ADRs 0001 to 0008, and scaffolded the project. Built and verified the build-time fact pipeline (`scripts/facts/`). It reads git history, the package files, handoff notes and project status, renders the intro template, and stops the build on shallow or exported clones, unresolved placeholders, empty facts, hand-written digits or malformed sources. `npm install`, `npm run build`, `lint`, `typecheck`, `test` and `format:check` all pass on the scaffold.

## Files changed
- package.json, package-lock.json: stack, exact pins, npm scripts, `engines` `>=22.18.0`
- .npmrc: public registry, `save-exact`, `engine-strict` (ADR 0006)
- .nvmrc: Node 26
- .gitignore: added `src/generated/`
- .env.example: `BASE_PATH`, `FACTS_STRICT` (build-time only)
- tsconfig.json, tsconfig.app.json, tsconfig.node.json: strict, `@/` alias, `erasableSyntaxOnly`
- vite.config.ts: alias, relative base, copies facts and intro JSON into `dist/`, Vitest config
- eslint.config.js: flat config; tests may not import `scripts/facts/*` (FR-11 independence)
- .prettierrc.json, .prettierignore: Prettier config; `docs/` and `*.md` excluded
- index.html: title "Transmission Pending", `lang="en-AU"`, relative favicon
- scripts/facts/{collect,git,sources,template,config,errors}.ts: fact pipeline
- src/facts/schema.ts, src/facts/index.ts: facts contract and the only import point
- Placeholders for other owners: src/App.tsx, src/main.tsx (frontend-developer); src/content/intro.tmpl, src/styles/tokens.css, public/favicon.svg (ux-ui-designer); playwright.config.ts (qa-engineer)
- Empty folders (`.gitkeep`): src/scene/{objects,lights,cameras,materials,shaders}, src/ui/{components,screens}, src/state, src/hooks, public/{models,textures,env,fonts,audio}, tests/{unit,e2e}, assets/source
- docs/architecture.md, docs/decisions/0001 to 0008: new

## Decisions
- No backend; static bundle (ADR 0002): NFR-8 and NFR-7.
- TypeScript 6.0.3 with ESLint and typescript-eslint, not the Vite template's TS 7 and oxlint (ADR 0001): typescript-eslint supports TypeScript below 6.1 only.
- Build-time fact pipeline, fail closed (ADR 0003). Strict mode in CI also refuses dirty trees, missing doc tables, a `!draft` template and a model with no co-author trailers.
- Roles come from handoff files; phases and provenance from two tables in `docs/project-status.md`; the model is cross-checked against `Co-Authored-By` trailers (ADR 0004).
- One teletext canvas feeds the 3D screen texture. The DOM transcript is the text of record and the 2D presentation. CRT effects live in the screen material, with no post-processing (ADR 0005).
- Public npm registry and exact pins (ADR 0006): the user-level npm config points at a private mirror that CI cannot reach.
- Relative `base: './'` (ADR 0007): the bundle works under any GitHub Pages repo path without knowing the repo name.
- Modes `3d-set`, `3d-screen` and `2d`, with a lazily loaded scene chunk (ADR 0008).

## Assumptions
- `docs/project-status.md` is the tech lead's file. I did not edit it; it needs the two tables below.
- The tech lead appears in the role list only if it writes `docs/handoffs/tech-lead.md`.
- Intro copy is written by the ux-ui-designer in `src/content/intro.tmpl`.
- Publishing commit subjects and short hashes is fine; author names and emails are never emitted.
- Display labels ("three.js", "UX/UI designer") are wording, not facts, and live in `scripts/facts/config.ts`.

## Open questions
- Should the role list include the tech lead (by adding a `tech-lead.md` handoff note)? (tech lead)
- Final repo name. Candidates are in the report; ADR 0007 makes the scaffold independent of it. (user)

## Requests for other agents
- tech lead: add these to `docs/project-status.md` and keep them current in the same commit as each phase change. Until then `phases` and `provenance` are null, and strict builds stop:
  ```markdown
  ## Phases
  | # | Phase | Status |
  |---|---|---|
  | 1 | Requirements | Done |
  | 2 | Architecture | In progress |
  | 3 | Design | Not started |
  | 4 | Build | Not started |
  | 5 | Performance | Not started |
  | 6 | QA | Not started |
  | 7 | Delivery | Not started |

  ## Build provenance
  | Item | Value |
  |---|---|
  | Tool | Claude Code |
  | Plugin | application-builder |
  | Plugin version | 2.0.0 |
  | Model | Claude Opus 5.5 |
  | Model ID | claude-opus-5-5 |
  ```
  Status words must be exactly `Not started`, `In progress` or `Done`. Keep `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` on commits; it is the git-side evidence for the model fact.
- ux-ui-designer: write the real intro in `src/content/intro.tmpl` (format in architecture §5.5) and remove `!draft`. Set the teletext column count and breakpoints so glyphs stay at least 16 CSS px. Choose the `3d-set` versus `3d-screen` breakpoint. Add fonts to `public/fonts/` with `LICENCES.md`. Replace the placeholder favicon and tokens.
- frontend-developer: implement `introStore` and `displayStore` (architecture §4.2), `useIntroClock` (rAF, outside R3F), mode detection with `?mode=` and context-loss fallback, the teletext canvas rasteriser in `src/ui/teletext/`, and the DOM transcript rendering each fact as `<span data-fact="{key}">`. Import facts only from `@/facts`. Export the reveal rate for the FR-8 duration check.
- scene-developer: create `src/scene/Experience.tsx` as a `React.lazy` default export; read stores only; report `webglLost` and load progress; use `frameloop` `"always"` only while animating; build asset URLs from `import.meta.env.BASE_URL`.
- technical-artist: one screen `ShaderMaterial` sampling the canvas texture (scanlines, curvature, glow, vignette, noise, warm-up), with a frozen-noise path for reduced motion. Greyscale-only textures; `NoToneMapping` or `NeutralToneMapping`, not ACES or AgX. TV model within 1.5 MB, compressed. `LICENCES.md` per asset folder.
- qa-engineer: write `tests/unit/facts.test.ts`, recomputing each fact by the alternative routes in architecture §5.7 and checking `dist/facts.json`. Write E2E tests comparing every `[data-fact]` element with recomputed values in each `?mode=`. Own `playwright.config.ts` (placeholder) and run `npx playwright install` (browsers not installed yet).
- devops-engineer: in CI use `fetch-depth: 0`, Node from `.nvmrc`, `npm ci`, and `CI=true` (strict facts). Deploy only from default-branch pushes, never from PR merge commits. Make sure the host serves the site with a trailing slash. Do not let the host build from a shallow clone.
- performance-optimiser: budgets in architecture §6 (initial JS is 69 kB gzip today).

---

## v2 feasibility: live channels (2026-11-11)

### Summary
Feasibility study only, with no code or config changes: `docs/decisions/0009-live-channels-feasibility.md` (Proposed). It compares four signal sources: (A) a real satellite tuner on the user's network, (B) official broadcaster streams, (C) openly licensed archive channels, and (D) a hybrid. It covers rendering, flash safety, autoplay, store changes and fact pipeline impact. It recommends D, delivered in phases starting with C, with A as an opt-in local input and B excluded.

### Files changed
- docs/decisions/0009-live-channels-feasibility.md: new (Proposed)
- docs/handoffs/architect.md: this section

### Decisions (proposed, pending user answers)
- Public site stays static. Archive channels are same-origin, licence-checked and flash-analysed at build time.
- Real satellite (A) is possible only on the user's own network: dish, DVB-S2 tuner (SAT>IP or USB with Tvheadend), and a transcode/HLS relay with HTTPS and CORS. It is never re-streamed publicly (retransmission rights).
- Video goes through a luminance pre-pass render target, which gives greyscale, mipmaps for `uGlowLod` and the ghost mask, a slew-rate flash limiter and an OSD composite. The pre-pass output becomes `uMap`, so the CRT shader barely changes.
- The flash limiter gives a computed per-pixel bound, not a certification. In 2D, only pre-analysed content plays.
- New `channelStore`. Channel 1 is the unchanged v1 story; the v1 stores keep their shapes.
- `hls.js` (1.7.4) only if a live path is built, lazy-loaded, and never added to `STACK_PACKAGES`, so the v1 intro text does not change.

### Assumptions
- v1 is tagged before v2 work starts, and v2 lives on a branch.
- GitHub Pages remains the host (HTTPS only, 1 GB site, no Git LFS serving from a branch).
- The +05:30 commit timestamps suggest India, so DD Free Dish is the relevant free-to-air platform. The user must confirm.

### Open questions (user)
- The eight questions at the end of ADR 0009. The key one is whether a literal satellite feed is required, or whether real archive channels on the public site meet the intent.

### Requests for other agents (only if ADR 0009 is accepted)
- product-manager: v2 requirements must decide whether to amend NFR-7 (third-party requests), FR-X3 and NFR-13 (broadcaster marks), and the captions or description policy (WCAG 1.2.1, 1.2.2, 1.2.4).
- tech lead: tag the QA-passed v1 commit; create the v2 branch; keep all v1 tests in v2 CI.
- devops-engineer: plan for media storage (Git LFS with an Actions Pages deploy, or a first-party bucket) and range-request and caching headers.
- ux-ui-designer: channel input model without the P100 digit clash; whether the haunt knob cue stays cosmetic; sign-off on the limiter's soft cuts.
- technical-artist and scene-developer: no work until accepted. The pre-pass design is in ADR 0009, Rendering.
