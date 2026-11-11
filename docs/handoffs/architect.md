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

---

## v2 Phase 2: architecture, contract, guide scripts, CSP (2026-11-11, branch `v2`)

### Summary
`docs/architecture.md` gains v2 sections 10 to 16; sections 1 to 9 are marked unchanged and still govern channel 0. I added:
- the environment contract, a registry and eight registered stubs;
- the guide pipeline: curated sources, a build-time check, a resolver with a quota ledger and last-good fallback, the `guide.json` schema and a browser validator;
- 48 unit tests with the YouTube API mocked;
- the CSP (build-only meta tag) and the referrer meta tag.

Verification:
- `npm run build`, `lint`, `typecheck` and `test` (99 of 99) all pass, and `format:check` is clean.
- A strict (`CI=true`) build on a clean scratch clone passes.
- Under the CSP, `production.spec.ts` passed 6 of 6 and the `power`, `fallback` and `story` specs 39 of 39 (Chromium).
- v1 facts are unchanged in content: identical stack list, intro copy and fact keys, no lockfile change. Only HEAD-derived facts moved.

### Files changed
- docs/architecture.md: status header, reading guide, v2 sections 10 to 16
- src/scene/environments/contract.ts (new): ids, `EnvironmentModule`, `ScreenAnchorSpec` (aspect, widthM, fill, align), budgets, placement constants, `WatchPoseSolver` and `ScreenProjectorApi` interfaces, `classifyPlacement()`
- src/scene/environments/registry.ts (new; owner scene-developer): lazy import per environment, labels, budgets, `DEFAULT_ENVIRONMENT`
- src/scene/environments/<8 ids>/index.tsx (new stubs; owners scene-developer and technical-artist): `Scene` returns null; aspect, fill and align from design spec v2 §5
- src/guide/schema.ts, src/guide/validate.ts (new): `GuideSources`, `ChannelGuide`, `parseGuide`, `validateGuideSources`, `cleanTitle`
- src/content/guide-sources.json (new): 5 high-confidence channels with recorded IDs (DD News, DD India, DD Kisan, DD Urdu, Sansad TV), all `permission: requested`
- scripts/guide/check-sources.ts, resolve.ts, resolve-core.ts, youtube.ts (new)
- scripts/csp.ts (new): CSP directives and referrer policy
- vite.config.ts: `injectCsp()` build-only plugin. Devops' `sourcemap: false` and `dropGitkeep` reviewed and kept as they are: they are correct, and removing the `.gitkeep` files instead would only work for folders that already hold files.
- index.html: referrer meta tag
- package.json: `guide:check`, `guide:resolve`; `build` now runs `guide:check`
- tsconfig.node.json: `jsx: react-jsx` (tests load the `.tsx` stubs through the registry)
- .gitignore: `.guide-cache/` (resolver ledger)
- eslint.config.js: `react-refresh/only-export-components` off for `src/scene/environments/*/index.tsx` (they export a module object)
- tests/unit/guide-sources.test.ts, guide-validate.test.ts, guide-resolve.test.ts, environment-contract.test.ts (new; written by the architect, handed to qa-engineer)

### Decisions
- **CSP build-only:** Vite's dev server needs inline scripts and styles for HMR. The CSP is prepended as the first `<head>` element; `charset` is still at byte 523, inside the first 1024.
- **`'wasm-unsafe-eval'`** allowed in advance for self-hosted Draco, Meshopt and KTX2 decoders. It permits only WebAssembly compilation, not JS eval.
- **`style-src 'self'`** with no `'unsafe-inline'`: React writes styles through the CSSOM, which CSP allows, and nothing in v1 injects `<style>` elements or style attributes. Verified by the production spec's no-console-error check. Side effect: the `<noscript>` paragraph's inline style is ignored when JavaScript is off (the text still shows).
- **Age is a warning, not an error:** the scheduled guide build rebuilds an old tag, and a 90-day curation age must never stop guide refreshes. `--fail-stale` exists for `main` pushes.
- **Ledger counts quota before each call,** because YouTube charges for failed calls too. Quota, auth and bad-request errors stop all further calls in the run.
- **Guide sources hold only channels whose IDs the research recorded.** I did not guess IDs for the other 54 high-confidence channels.
- **Environment modules use explicit `.ts`/`.tsx` import extensions,** as v1's `src/state/cues.ts` does, because the unit tests compile them under `nodenext`.

### Assumptions
- Sansad TV's languages are Hindi and English. The research records the genre but not the language; the entry carries a note.
- The latest-tag guide workflow will pass `--previous` as the live site's `guide.json` URL, and keep `--ledger` in `actions/cache`.

### Open questions
- None new for the user; ADR 0011's Q1 (Calm and YouTube) and Q2 (DD and Sansad launch timing) still stand. `enabled` is `true` for all five today; set it to `false` if the answer to Q2 is "wait for permission".

### Requests for other agents (exact instructions)

**scene-developer**
1. Own `src/scene/environments/registry.ts` and the eight `<id>/index.tsx`. Keep the contract: default export `EnvironmentModule`, exactly one anchor, explicit `.ts`/`.tsx` import extensions.
2. Write `ScreenAnchor.tsx`: an Object3D with local XY as the screen face, centred, +Z towards the viewer, size `widthM` by `widthM / aspect`. It registers itself in `environmentStore`.
3. Write `ScreenProjector.ts`, implementing `WatchPoseSolver` and `ScreenProjectorApi`:
   - The watch pose is the camera translated parallel to the screen plane (no rotation), sized by `screen.fill`, `align` and the height rule in design spec v2 §2.2, and never above `WATCH_MAX_FILL`.
   - Project corners in the order TL, TR, BR, BL, in CSS px relative to the stage.
   - Pass them to `classifyPlacement()` and write the result to `playerStore.placement`, on resize and at the end of a pose tween only.
   - No camera motion while `pose === 'watch'`.
4. TV room: render v1's existing scene unchanged for channel 0 (do not move v1 files; import them). For YouTube channels, place the anchor on the flat bezel opening (4:3), turn the CRT glass off, and zero the haunt uniforms near the screen.
5. Wire `?env=` through `environmentStore`, with the `<Canvas>` kept and the scene swapped inside `Suspense`. Prefetch with `ENVIRONMENTS[id].load()` on picker hover or focus.

**technical-artist**
1. Assets per environment in `public/models/<id>/` and `public/textures/<id>/`, each with a `LICENCES.md` (original or CC0), within the budgets in architecture §12.3. Authored in colour, except the TV room (design spec v2 §5.1).
2. Self-host any Draco, Meshopt or KTX2 decoder under `public/` and point loaders at it; drei's `useGLTF` defaults to a gstatic CDN, which the CSP and the network rule forbid.
3. Light spill: a generic flicker, low-passed at 2 Hz or less, never sampled from the player.
4. TV-room colour-era tints and the bezel channel-change burst (design spec v2 §1.10, on the bezel ring meshes only).

**frontend-developer**
1. Stores in `src/state/`: `environmentStore` (id, pose, focus, anchor), `channelStore` (current, tuning, pending digits), `playerStore` (placement from `classifyPlacement`), `guideStore` (fetch `./guide.json` lazily, `parseGuide`, "unavailable" state). Visit-only; no storage beyond v1's `sessionStorage` for Calm.
2. `src/ui/player/PlayerHost`:
   - one `YT.Player`, created on the first pick with `host: 'https://www.youtube-nocookie.com'`, `origin: location.origin`, `playerVars { autoplay: 1, mute: 1, playsinline: 1 }`, iframe `allow="autoplay; fullscreen; encrypted-media; picture-in-picture"` and `referrerpolicy="strict-origin-when-cross-origin"`;
   - inject `https://www.youtube.com/iframe_api` only at that moment;
   - never re-parent the iframe; position it with plain `left`, `top`, `width` and `height`; no 3D transform, filter or opacity on it or any ancestor;
   - destroy it on channel 0; pause it in the browse pose and in hidden tabs;
   - error codes and the 8 s `onReady` timeout map to the no-signal states (ADR 0011 §4).
3. Stacking: stage, then `<canvas>` (the Colour/B&W filter goes here only), then the player layer above it. The dock, notices and info row stay outside the player rectangle.
4. Paste-a-link: accept `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/live/` and `youtube.com/embed/` only, and extract `^[A-Za-z0-9_-]{11}$`. Everything else is rejected with the design-spec message.
5. If you add `@types/youtube`, make it a devDependency and say so in your handoff. No runtime dependency.
6. Keyboard contexts and digits as in design spec v2 §3; v1's diary digits apply only in the diary context.

**devops-engineer**
1. `.github/workflows/guide.yml`:
   - `schedule: '*/30 * * * *'`, plus `workflow_dispatch` and a `workflow_run` after deploy. Never on `pull_request`.
   - Check out the latest `v*` tag with `fetch-depth: 0`, then `npm ci`, then `CI=true npm run build`.
   - Restore `.guide-cache/` with `actions/cache` (a rolling key with a restore-keys prefix), then run:
     ```text
     YOUTUBE_API_KEY=${{ secrets.YOUTUBE_API_KEY }} npm run guide:resolve -- --out dist/guide.json --release <tag> --previous https://<pages-url>/guide.json --ledger .guide-cache/ledger.json
     ```
   - Fail the job if `grep -rF "$YOUTUBE_API_KEY" dist` matches.
   - Then `upload-pages-artifact` and `deploy-pages` in the shared `pages` concurrency group.
   - Exit code 1 means a configuration error: fail the job. Exit code 0 with "degraded" in the log is still a deploy.
2. `ci.yml`: add `npm run guide:check -- --fail-stale` on pushes to `main` only. `build` already runs the plain check.
3. `docs/deployment.md`: create the Google Cloud project and key (restricted to YouTube Data API v3), add the `YOUTUBE_API_KEY` secret, and explain re-enabling the schedule after 60 days of inactivity.

**qa-engineer**
1. Take ownership of the four new unit test files.
2. **Required production-spec change:** with the CSP alone, `production.spec.ts` still passes, because v1 makes no third-party requests and v2 makes none before a pick. Once the player exists, replace "every request is same-origin" with the two-stage test (ADR 0011 §6, architecture §14):
   - before a pick, every request from every frame is same-origin;
   - after a pick, main-frame requests go to self or `https://www.youtube.com` only, and the only child frame is on `https://www.youtube-nocookie.com`; do not assert the player frame's own requests;
   - no cookies or storage on our origin at any time;
   - no CSP violations (Chromium logs them as console errors, which the existing check already catches).
3. Add:
   - a test that the built `index.html` has the CSP meta tag as its first `<head>` element, and that the dev server has none;
   - the no-overlay checks (`elementsFromPoint` grid over the player rectangle; ancestor computed styles);
   - the one-iframe and minimum-size checks;
   - Firefox with Enhanced Tracking Protection strict, when a host allows.

**tech lead**
- Look up channel IDs for the other high-confidence channels (`npm run guide:resolve -- --lookup @handle` with a key, 1 unit each, or the channel's About page). Add them to `guide-sources.json` with `checked` dates; the product manager reviews terms.
- When `privacy.html` exists, ask the architect to add it as a Vite input (architecture §14).
- Rebuild after committing: handoff notes are fact sources.

**ux-ui-designer**
- Confirm the TV room's `fill` (0.55, `align: 'left'`) and the 4:3 bezel opening, which are now in the stub. Keep design spec v2 §5 and the stubs in sync; the stubs cite the spec.

### v2 Phase 2 addendum (2026-11-11): Mountain sky and privacy page
- Added a 9th environment, `mountain-sky` (the headline room), to `ENVIRONMENT_IDS`, the registry (label "Mountain sky", default budget, lazy chunk) and a stub. Provisional anchor: 16:9, `fill` 0.72, `align: 'centre'`, plus a new optional `vAlign: 'upper'` in `ScreenAnchorSpec`, which sits the rect high in the view.
- `privacy.html` (placeholder, root) is now the second Vite input (`build.rolldownOptions.input`). The CSP is injected into both built pages.
- Updated `tests/unit/environment-contract.test.ts` (9 ids) and architecture §10, §11, §12.3 and §14.
- User answers recorded: Q1, Calm plays YouTube after a once-per-visit flash warning; Q2, DD and Sansad stay `enabled: false` until the user confirms the permission email was sent (the research agent edits `guide-sources.json`).
- Requests:
  - ux-ui-designer: finalise `fill`, `align` and `vAlign` for `mountain-sky` in design spec v2 §5.
  - scene-developer: honour `vAlign` in `WatchPoseSolver`, and keep clouds, peaks and birds out of the camera-to-screen volume.
  - frontend-developer: write `privacy.html` with no inline style or script. Implement Q1: the once-per-visit flash warning before YouTube plays in Calm.

### v2 Phase 2 addendum 2 (2026-11-11): `stateMedia`
- New field **`stateMedia`**:
  - `GuideSource.stateMedia?: boolean` in `src/content/guide-sources.json`; omitted means false.
  - `GuideChannel.stateMedia: boolean` in `dist/guide.json`; **always present**.
- `validateGuideSources` rejects a non-boolean value. `parseGuide` reads a missing value as false (so older published guides still parse) and drops a channel whose value is not a boolean. The resolver passes it through.
- Data: only TRT World and CGTN have `"stateMedia": true`. That is the only edit made to `guide-sources.json`.
- Tests: 4 new (103 of 103 pass).
- **frontend-developer:** show the STATE MEDIA tag when `channel.stateMedia === true` on a `GuideChannel` from `parseGuide`/`guideStore`. Do not parse `note`: notes are curation text and are not published.

---

## v2 2050 retheme: impact assessment (2026-11-11)

### Summary
Wrote `docs/decisions/0012-theme-2050.md` (Proposed): module fate, facts impact, invalid tests, glass and volumetric performance, and a phased plan. Documents only; no code changed.

### Key points for other agents
- Reused unchanged:
  - the teletext frame model, pagination, wrap, effects, hit-testing and the canvas hand-off;
  - the haunt scheduler and cues;
  - the facts pipeline;
  - the modes and their ids;
  - the camera rig mechanism;
  - all nine room contracts.
- Replaced:
  - CRT shader → holo shader, keeping the same uniform contract;
  - `TvBody` → `HoloDisplay`;
  - `KnobLayer` → `ControlRings`, with the same contract;
  - test card → standby pattern, with the same call shape;
  - `crt2d.css` → `holo2d.css`;
  - `GreyEnvironment`, tokens (values only) and fonts.
- **Monospaced 2050 face recommended:** a proportional face costs about 3 to 5 extra frontend-days (`wrap.ts`, `hit.ts`, `effects.ts`).
- `intro.tmpl` needs `!allow-digits 2050`; `intro.cues` must be re-anchored to the new copy.
- **Glass:**
  - live blur only on small chrome, with a minimum tint so text reaches 4.5:1 against any backdrop;
  - `data-glass="solid"` on reduced transparency, missing support or a DPR step-down;
  - nothing frosted or glowing overlaps the player, and no ancestor of the player has `backdrop-filter`.
- **Volumetrics:** additive cones and halos only; no ray-marching or full-screen post-processing on phones; 2 ms GPU budget.
- **QA:** the invalid-test list is in ADR 0012 §3. Add red-flash detection to `tests/helpers/flash.ts`.

### Open questions
- None for the user. The face choice (monospaced or proportional) and whether the Colour/B&W option survives belong to the designer.
