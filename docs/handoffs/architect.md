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

## v2: environment player (ADR 0011, 2026-11-11)

### Summary
The archive and private-relay plan is replaced: ADR 0009 and ADR 0010 are marked "Superseded by 0011", with their text kept for the record. New ADR 0011 (Accepted) specifies v2 as a multi-environment player for official YouTube embeds:
- compositing (a face-on DOM player above the canvas, with no depth hole);
- environments as lazy chunks behind a shared screen-anchor contract, with per-environment budgets;
- a scheduled GitHub Action that resolves live video IDs into a same-origin `guide.json`;
- privacy and CSP;
- bundle impact and a phased plan.

Documents only: no code, config or `docs/architecture.md` changes until v1 is tagged.

### Files changed
- docs/decisions/0011-environment-player.md: new, Accepted
- docs/decisions/0009-live-channels-feasibility.md, docs/decisions/0010-private-relay-backend.md: status set to "Superseded by 0011"
- docs/handoffs/architect.md: this section (replaces the archive and relay v2 section)

### Decisions
- **The iframe sits above the canvas, positioned in plain 2D CSS from the screen anchor's projected corners, only in a static face-on watch pose.** Reason: stacking order guarantees that nothing WebGL covers the player. The depth-mask hole of `CSS3DRenderer` and drei `occlude="blending"` exists only to let WebGL cover parts of the iframe, which YouTube forbids. Both were also rejected for Firefox `matrix3d` iframe problems and, for drei, a global canvas `pointer-events: none`.
- **Focus mode** whenever the in-scene rectangle is under 480 x 270, and always on phones: the player sits in DOM layout at full width, with the environment as backdrop.
- **One `YT.Player` for the visit:** `loadVideoById` for channel changes, never re-parented, destroyed on channel 0, paused in the browse pose and in hidden tabs.
- **Colour/B&W** is a CSS `grayscale(1)` on the canvas element only. No ancestor of the iframe may carry a filter, opacity, blend mode, mask or 3D transform.
- **TV room:** `tv-room` wraps v1 unchanged for channel 0. YouTube channels use the flat bezel opening, with the CRT glass off and the haunting kept away from the screen.
- **Guide:**
  - runs every 30 minutes, built from the latest `v*` tag, deployed to Pages and never committed (it would flood the diary and change `git.commitCount`);
  - cheap re-validation with `videos.list`, `playlistItems.list` before `search.list`, and a daily spend ledger capped at 8,000 units;
  - stale entries are kept on failure and dropped after 30 days;
  - the client re-validates every field.
- **Network:** `youtube-nocookie.com` for the player; `strict-origin-when-cross-origin` referrer; a meta-tag CSP allowing `https://www.youtube.com` (script) and `https://www.youtube-nocookie.com` (frame); no third-party request of any kind before the first pick.
- **v1 facts untouched:** no runtime npm dependency, `STACK_PACKAGES` unchanged, and `guide.json` kept outside the facts pipeline.

### Assumptions
- GitHub Pages is the host, because the guide workflow deploys through Pages with Actions.
- The 8 environments in the approval are the full first-release list.
- The default Data API quota (10,000 units a day) is enough; no quota increase or audit is needed.

### Open questions (user)
- Q1: Calm mode with unfilterable YouTube video: block it, or (recommended) allow it after a per-visit flash warning with environment motion frozen?
- Q2: DD and Sansad channels: go live once the permission emails are sent, or stay disabled until written permission arrives?

### Requests for other agents
- product-manager: v2 requirements must:
  - amend NFR-7 to "no third-party requests before a channel is picked; after a pick, only the YouTube origins in ADR 0011, section 6";
  - require the privacy page and the partial-conformance statement for third-party video;
  - drop the limiter, archive and relay requirements.
- qa-engineer (v2, phase 6): replace the "every request is same-origin" production test with the two-stage test in ADR 0011, section 6. Add the no-overlay hit-test and ancestor-style checks, and the one-iframe and minimum-size checks.
- devops-engineer: plan `guide.yml` (schedule, tag checkout, quota cache, secret masking, the `dist/` key check), and note the 60-day schedule-disable risk in the runbook.
- tech lead: owns `src/content/guide-sources.json` entries (the product manager reviews terms). The user creates the Google Cloud project and API key in phase 7 (manual step).
- backend-developer: no longer needed for v2.

### v2 build plan
See the phased table at the end of ADR 0011: phase 0 freeze v1, phase 1 the product manager, phase 2 the architect, phase 3 the ux-ui-designer, phases 4a to 4e (technical-artist, scene-developer, frontend-developer, devops-engineer, then tech lead integration), phase 5 the performance-optimiser, phase 6 the qa-engineer, phase 7 delivery with the user.
