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

## v2: channels (decisions accepted 2026-11-11)

### Summary
The user's v2 decisions are recorded. ADR 0009 is now Accepted: public archive channels plus a private satellite relay, a Colour/B&W switch defaulting to B&W, the runtime flash limiter, and Git LFS media hosting at USD 0 a month. New ADR 0010 specifies the private, login-only relay backend: Tvheadend, MediaMTX with ffmpeg, Fastify, household accounts, Tailscale HTTPS, a `VITE_RELAY=1` private build, Docker Compose, and CI checks that keep relay code and private network data out of the public site. Documents only: no code, config or architecture.md changes until v1 is tagged.

### Files changed
- docs/decisions/0009-live-channels-feasibility.md: rewritten, status Accepted
- docs/decisions/0010-private-relay-backend.md: new, Accepted
- docs/handoffs/architect.md: this section (replaces the Proposed-era v2 section)

### Decisions
- Two deployment targets from one repo: the public static site (channels 0 to 5) and the private relay (adds live channels from 10). Reason: the user's "public archive + private backend" shape; live retransmission can never be public.
- Archive media on Git LFS with an Actions deploy to Pages, capped at 600 MB. Cost: USD 0 a month (GitHub Free LFS is 10 GiB storage and 10 GiB bandwidth; Pages allows a 1 GB site, about 100 GB a month soft, checked 2026-11-11). Reason: same origin (no CORS, no NFR-7 change), media versioned with the commit. The build refuses LFS pointer files. Move to a bucket under a domain we own only past 600 MB or near 100 GB a month.
- Plain MP4 with clock-scheduled seeking for archive channels: Pages answers byte-range requests (checked, `206`), so the public build needs no HLS library.
- Video pre-pass (luminance or colour, flash limiter, on-screen channel number, mipmaps) feeding `uMap`; `uColour` is forced to 0 for all teletext content; the chrome is always greyscale.
- The limiter clamps each linear RGB channel, so it covers the general flash rule and, in colour mode, the red-flash rule. It is stated as a computed bound, not a certification. Live content plays only in 3D, never in Calm or 2D.
- Relay: Tvheadend (tuner manager, DVR off), MediaMTX with on-demand ffmpeg (deinterlace, H.264 and AAC, low-latency HLS, RAM-only segments), Node and Fastify API and proxy, SQLite, Argon2id, admin-provisioned accounts, `__Host-` session cookies. Every service is on loopback, and the only way in is `tailscale serve` (Funnel never enabled).
- The private frontend is served by the relay itself on the same origin, so no relay URL exists in the repo, the build or run-time config.
- `server/` is a separate npm project (not a workspace), and `hls.js` is never in `STACK_PACKAGES`: the channel 0 intro template and stack facts are untouched.

### Assumptions
- The relay box runs Linux with Docker Engine (ADR 0010, section 7). Host networking is required for SAT>IP discovery and RTP over UDP.
- Household devices can install Tailscale. The LAN fallback through a local CA is opt-in.
- GitHub Pages stays the public host (devops proposal pending).
- Free-to-air channel codecs are confirmed by the user's first Tvheadend scan.

### Open questions (user)
- Q1: Does the relay box run Linux, and does it have an Intel or AMD GPU for hardware transcoding? (A Windows or macOS box needs a different Compose setup; a CPU without hardware encoding handles about one or two SD channels.)
- Q2: Will every household device run Tailscale, or does one (for example a smart TV) need the local-CA LAN fallback?
- Q3: How many tuners does the SAT>IP box or PC tuner have? This sets how many people can watch different live channels at once.

### v2 build plan (starts after the v1.0 tag)

| Step | Work | Agents |
|---|---|---|
| 0. Freeze v1 | Finish v1 QA fixes and delivery; tag `v1.0`; create the v2 branch; keep the whole v1 suite in v2 CI | tech lead, qa-engineer, devops-engineer |
| 1. Requirements | Revise `v2-live-channels.md` to the user's decisions: two targets, archive only on the public site, Colour/B&W, limiter policy, NFR-7 unchanged for the public site, FR-2 amended for video in colour mode, captions and description policy | product-manager |
| 2. Architecture | Update `docs/architecture.md` (targets, pre-pass, `channelStore`, ownership of `server/`, `src/relay/`, `infra/relay/`); channel lineup schema and validator in `scripts/facts/`; `check-private-data.ts` and `check-public-bundle.ts`; `.gitignore` entries; `.gitattributes` for LFS. Checkpoint: user approves | architect |
| 3. Design | Channel input (knob, keys, touch, digits without the P100 clash), channel guide page, on-screen channel number, tuning, busy, no-signal and signed-out pages, Colour/B&W switch placement, sign-in screen in teletext style, limiter rate within the bound. Checkpoint: user approves | ux-ui-designer |
| 4a. Content | Curate 3 to 5 openly licensed clips, record licence evidence, encode (H.264, 640 x 480, about 400 kbps, 600 MB total), offline flash analysis, descriptions or captions, write `src/content/channels.json`. User signs off each licence | technical-artist, ux-ui-designer (labels, descriptions), user |
| 4b. Rendering | Video pre-pass (colour or B&W, per-channel limiter, on-screen number, mipmaps); `uColour` path in the CRT shader; 2D `grayscale(1)` class | technical-artist |
| 4c. Scene | `VideoTexture` lifecycle, `uMap` switching on `screenSource`, frame cap while video plays, the channel knob as a real control, haunt zeroing on video | scene-developer |
| 4d. Frontend | `channelStore`, `displayStore.screenSource` and `colour`, clock-scheduled archive playout, autoplay and unmute rules, Calm and 2D blocking for live, `src/relay/` (sign-in, live adapter, lazy hls.js, session expiry) | frontend-developer |
| 4e. Backend | `server/`: Fastify app, accounts and sessions, rate limits, CSRF and origin checks, Tvheadend client, tuner arbitration, HLS proxy, admin CLI, auth-matrix tests, `docs/api.md` | backend-developer |
| 4f. Relay box | `infra/relay/` Compose (tvheadend, mediamtx with ffmpeg, relay), `Dockerfile.relay`, `mediamtx.yml`, `doctor.sh`, `update.sh`, runbook in `docs/deployment.md`; CI: LFS cache and Actions Pages deploy, gitleaks, the two bundle checks, server jobs | devops-engineer |
| 4g. Integration | `npm run build` and `build:relay` pass; route every handoff request | tech lead |
| 5. Performance | Archive video plus pre-pass at 30 FPS on a real mid-range phone and 60 FPS on desktop; relay transcode CPU on the box; channel-change times (V2-NFR-1) | performance-optimiser |
| 6. QA | Greyscale sampling in B&W and outside the picture in Colour; flash and red-flash tests with deliberately flashing clips through the limiter; Calm and 2D blocking; iOS and Android autoplay; the public-bundle check (with the sentinel); auth matrix end to end over Tailscale; v1 regression | qa-engineer, backend-developer (fixes) |
| 7. Delivery | Public deploy to Pages from the v2 tag; the user installs the relay box with the runbook, creates accounts and runs `doctor.sh` | devops-engineer, user |

### Requests for other agents
- tech lead: create the v2 branch only after `v1.0` is tagged; keep v1 documents unchanged on main until then. Add backend-developer to the v2 delegation list.
- product-manager: align `docs/requirements/v2-live-channels.md` with ADR 0009 and 0010. In particular, the public list holds archive clips only (V2-FR-3 and V2-FR-20 become a licence allow-list); "third-party live streams" (V2-FR-8, V2-NFR-5) no longer apply to the public site; and FR-2 is amended for video in colour mode.
- devops-engineer: confirm that Pages through an Actions deploy accepts a 600 MB artefact within the 10-minute deploy limit; set an LFS budget of USD 0 (no overage) so exceeding the quota fails rather than bills.
- backend-developer: before implementation, check `node:sqlite` stability and `crypto.argon2` availability on the pinned Node (ADR 0010, section 2).
