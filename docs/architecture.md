# Architecture: Transmission Pending

Owner: architect. Status: v1 approved (2026-11-10) and shipped as `v1.0`. v2 sections 10 to 16 added 2026-11-11 (branch `v2`, ADR 0011).

**How to read this document in v2:**
- Sections 1 to 9 describe v1 and are **unchanged**. They still govern channel 0 (the Occupant) and the TV room.
- Where v2 amends a v1 rule, the v1 text stays and the amendment is in sections 10 to 16. The amended points are:
  - section 4.4: a second screen source, the YouTube DOM player;
  - section 4.5: the Colour option is a canvas filter;
  - section 6: environment chunks;
  - section 8: privacy, a CSP is now enforced;
  - NFR-7: no third-party request before a channel is picked.
- ADR 0009 and ADR 0010 are superseded and describe nothing that exists.

## 1. Summary

A static, front-end-only single page. A React DOM layer owns the intro, its controls and the accessible text. A lazily loaded React Three Fiber scene shows a greyscale 1970s TV (desktop) or a full-view CRT screen (mobile), with the teletext screen drawn into a canvas texture. Every factual claim in the intro comes from a build-time **fact pipeline** (`scripts/facts/`), which reads git history and repo documents, renders the intro templates, and stops the build if anything cannot be proven.

There is **no backend** (NFR-8, ADR 0002).

## 2. Stack and versions

Installed 2026-11-10. Versions are exact pins (`save-exact`, ADR 0006).

| Concern | Package | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | `>=22.18.0` (`.nvmrc`: 26) | Runs `scripts/` `.ts` files directly with built-in type stripping; no `tsx` needed |
| Build tool | `vite` | 8.3.7 | With `@vitejs/plugin-react` 6.3.0 |
| Language | `typescript` | 6.0.3 | Not 7.x: typescript-eslint supports `<6.1` (ADR 0001) |
| UI | `react`, `react-dom` | 19.3.1 | |
| 3D | `three` | 0.187.0 | `@types/three` 0.187.0 |
| 3D in React | `@react-three/fiber` | 9.8.2 | Peer `react >=19 <19.4`: compatible with 19.3.1 |
| 3D helpers | `@react-three/drei` | 10.7.9 | Peer fiber `^9` |
| State | `zustand` | 5.1.0 | |
| Debug panel (dev only) | `leva` | 0.10.1 | devDependency; import only behind `import.meta.env.DEV` |
| Perf overlay (dev only) | `r3f-perf` | 7.2.3 | devDependency; import only behind `import.meta.env.DEV` |
| Unit tests | `vitest` | 5.1.0 | Node environment by default |
| E2E tests | `@playwright/test` | 1.65.0 | Browsers not yet installed (`npx playwright install`) |
| Lint | `eslint` 10.14.0, `typescript-eslint` 8.72.2, `eslint-plugin-react-hooks` 7.1.1, `eslint-plugin-react-refresh` 0.5.7, `@eslint/js` 10.0.1, `globals` 17.14.0 | | Flat config |
| Format | `prettier` 3.9.10, `eslint-config-prettier` 10.1.8 | | `docs/` and `*.md` excluded so prose and tables are not reflowed |
| Node types | `@types/node` | 26.6.6 | Matches `.nvmrc` |

**Not installed (on purpose):** `@react-three/postprocessing` (CRT effects live in the screen material, ADR 0005), `@react-three/rapier` (no physics), `jsdom` or Testing Library (add when the first component test needs them, recording why), any font, audio or analytics package.

## 3. Folder structure and ownership

```text
assets/source/            user (read only)
docs/
  architecture.md         architect
  decisions/              architect
  design-spec.md          ux-ui-designer
  performance.md          performance-optimiser
  qa-report.md            qa-engineer
  deployment.md           devops-engineer
  project-status.md       tech lead (also a fact source, §5.4)
  handoffs/<agent>.md     each agent (also a fact source, §5.4)
public/
  favicon.svg             ux-ui-designer (placeholder, greyscale)
  fonts/                  ux-ui-designer: self-hosted WOFF2 plus LICENCES.md
  models/ textures/ env/  technical-artist (+ LICENCES.md per folder)
  audio/                  technical-artist (prefer synthesised audio, §8)
scripts/facts/            architect: build-time fact pipeline
src/
  facts/                  architect: schema.ts (contract) and index.ts (only import point)
  generated/              GENERATED, gitignored. Never edit.
  content/intro.tmpl      ux-ui-designer: intro copy (template)
  scene/                  scene-developer (Experience, objects/, lights/, cameras/)
  scene/materials/, scene/shaders/   technical-artist
  ui/                     frontend-developer (components/, screens/, teletext/)
  state/                  frontend-developer (zustand stores)
  hooks/                  frontend-developer
  styles/                 ux-ui-designer (tokens.css)
  App.tsx, main.tsx       frontend-developer (placeholders today)
tests/unit/, tests/e2e/   qa-engineer
playwright.config.ts      qa-engineer (placeholder today)
Root config               architect: package.json, package-lock.json, tsconfig*.json, vite.config.ts,
                          eslint.config.js, .prettierrc.json, .prettierignore, .npmrc, .nvmrc,
                          .gitignore, .env.example, index.html
```

New paths compared with the team template: `scripts/facts/` and `src/facts/` (architect), `src/content/` (ux-ui-designer), `src/generated/` (generated), `public/fonts/` (ux-ui-designer), `public/audio/` (technical-artist).

Path alias: `@/` maps to `src/` in `tsconfig.app.json`, `tsconfig.node.json` and `vite.config.ts`.

## 4. Runtime architecture

### 4.1 Modules and data flow

```text
 build time                                   run time (browser)
 ----------                                   ------------------
 git history ─┐                               src/facts (facts, intro: plain data)
 package*.json├─> scripts/facts/collect.ts ──>      │
 docs/...     │     + src/content/intro.tmpl        ▼
              │   src/generated/*.ts|json     src/state  introStore  ◄── src/hooks/useIntroClock
              └─> dist/facts.json, intro.json      │       displayStore ◄── useRenderMode, useMotionPreference
                                                    │
                     ┌──────────────────────────────┼───────────────────────────┐
                     ▼                              ▼                           ▼
           src/ui DOM layer               src/ui/teletext rasteriser     src/scene (lazy chunk)
           start screen, Skip/Replay,     draws the current page into    TV set or screen quad;
           transcript with data-fact,     one <canvas> on a teletext     screen material samples the
           2D presentation (FR-20)        grid                           canvas as a CanvasTexture
```

Rules:
- **One source of playback truth.** `introStore` holds status, page, line and reveal progress. The DOM layer, the 2D presentation and the 3D screen all read it. None of them keeps its own copy. This is what lets the 2D presentation take over "at the current line" when WebGL is lost (US-12).
- **The clock lives outside the scene.** `useIntroClock` (in `src/hooks/`) advances playback with `requestAnimationFrame` and pauses when the tab is hidden. The intro must run with no `<Canvas>` (2D mode), so playback must never depend on `useFrame`.
- **The scene is a consumer.** `src/scene` reads stores and the screen canvas. It never writes intro state, except reporting `webglLost` and asset load progress to `displayStore`.
- **Facts are plain data.** UI code imports `facts` and `intro` from `@/facts` only. The resolved intro is already final text; there is no templating at run time.

### 4.2 Stores (contract; frontend-developer implements)

```ts
// src/state/introStore.ts
status: 'off' | 'loading' | 'ready' | 'warming' | 'playing' | 'ended'
pageIndex: number; lineIndex: number; revealedChars: number
power(): void; skip(): void; replay(): void; nextPage(): void; prevPage(): void

// src/state/displayStore.ts
renderMode: '3d-set' | '3d-screen' | '2d'
motion: 'full' | 'reduced'          // live from prefers-reduced-motion (US-9)
audio: 'off' | 'on'                 // always starts 'off' (FR-22)
loadProgress: number; webglLost: boolean
```

### 4.3 Presentation modes (ADR 0008)

| Mode | When | What renders |
|---|---|---|
| `3d-set` | WebGL2 OK, wide viewport, fine pointer (breakpoint set in design spec) | TV model in a dark room, screen material on the curved CRT |
| `3d-screen` | WebGL2 OK, narrow or touch-first viewport | Full-view curved screen quad with the same material; no TV model downloaded |
| `2d` | No WebGL2, context creation fails, or context lost | DOM teletext screen with CSS scanlines and vignette; notice shown (FR-20) |

`?mode=2d|3d-screen|3d-set` in the URL forces a mode, for QA and debugging. Motion (`full` or `reduced`) applies on top of every mode.

**Reduced motion (FR-17):** same mode, but no warm-up animation, a fixed camera, no roll or jitter, static noise (shader uniform `uTime` frozen), and pages advanced by the visitor or a slow timer. `motion` updates live when the OS setting changes.

**Screen-reader text (FR-18):** the DOM transcript (`src/ui`) always holds the full resolved intro in reading order. In 3D modes it is visually hidden, the canvas is `aria-hidden`, and a "Read full text" control shows it. In 2D mode the same component is the visible screen. Lines are not announced one by one (US-10).

### 4.4 Screen content: one rasteriser, two outputs (ADR 0005)

- `src/ui/teletext/` draws the current page state onto one `HTMLCanvasElement` laid out on a teletext character grid. Columns are responsive: 40 on desktop, fewer on phones, so glyphs stay at least 16 CSS px (NFR-5). Templates hold logical lines; the rasteriser wraps them.
- The scene wraps that canvas in a `CanvasTexture` and sets `needsUpdate` only when the store changes.
- CRT effects (scanlines, curvature, phosphor glow, vignette, noise, warm-up collapse) are uniforms of one screen `ShaderMaterial` in `src/scene/materials/` and `src/scene/shaders/` (technical artist). No full-screen post-processing.

### 4.5 Greyscale guarantee (FR-2)

- Colour values only as greys (`#rrggbb` with r = g = b) in tokens, materials and lights.
- Textures authored greyscale (single-channel where possible).
- Tone mapping: `NoToneMapping` or `NeutralToneMapping`. **Avoid ACES and AgX**: they mix channels through matrices and can push greys off neutral.
- QA samples screenshots in every mode (R, G and B within 2 levels).

## 5. The fact pipeline (ADR 0003, ADR 0004)

### 5.1 Flow

```text
npm run facts  ->  node scripts/facts/collect.ts [--strict] [--check]
  1. collectGit()        trust checks, then HEAD, count, commits, dates
  2. collectStack()      package.json + package-lock.json
  3. collectAgents()     docs/handoffs/*.md
  4. collectPhases()     docs/project-status.md  "## Phases" table
  5. collectProvenance() docs/project-status.md  "## Build provenance" table + git trailers
  6. strict checks       (CI=true, FACTS_STRICT=1 or --strict)
  7. renderIntro()       src/content/intro.tmpl -> resolved pages, lines, segments
  8. write               src/generated/{facts,intro}.{json,ts} (only if changed)
vite build             copies facts.json and intro.json into dist/
```

`dev`, `build`, `typecheck` and `test` all run `facts` first. Output is deterministic: no wall-clock time, fixed 7-character short hashes, dates from git in each commit's own offset, stable key order. Building the same commit twice gives identical files (NFR-9). `--check` regenerates in memory and fails if `src/generated/` differs.

### 5.2 Trust checks: fail loudly rather than lie

| Condition | Detection | Result |
|---|---|---|
| git not installed | `ENOENT` | Stop: "git is not installed" |
| Not a work tree (tarball, `git archive`, host upload without `.git`) | `rev-parse --is-inside-work-tree` | Stop |
| Shallow clone (default in many CI checkouts) | `rev-parse --is-shallow-repository` | Stop, with the `fetch-depth: 0` fix |
| No commits | `rev-parse --verify HEAD^{commit}` | Stop |
| Replace refs or grafts altering history | `GIT_NO_REPLACE_OBJECTS=1` on every call | Ignored, so history is the real one |
| Log or count disagree, or newest commit is not HEAD | `log` length vs `rev-list --count` | Stop: "Refusing to guess" |
| Uncommitted changes | `status --porcelain` | Local: `revision` becomes `<hash>-dirty` and the intro says so. Strict: stop |
| Doc source table missing (`phases`, `provenance`) | Section not found | Group is `null` with a reason. Any placeholder using it stops the build. Strict: stop |
| Doc source table malformed (bad status, bad numbering, wrong cell count, missing row) | Parser | Always stop, with `file:line` |
| Package missing from `package.json` or lockfile | Lookup | Always stop |
| Model in provenance has no `Co-Authored-By` trailer in history | Trailer count is 0 | Strict: stop |

Verified on 2026-11-10 with scratch clones: shallow (`--depth 1`) and `git archive` exports both stop the build; a clean, complete tree passes `--strict`.

### 5.3 Facts schema

Defined in `src/facts/schema.ts` (types only). Groups:

| Group | Key facts | Source |
|---|---|---|
| `source` | `commitHash`, `shortHash`, `revision` (`abc1234` or `abc1234-dirty`), `dirty`, `commitDate` | `git rev-parse HEAD`, `git show -s --format=%cI`, `git status` |
| `git` | `commitCount`, `firstCommit`, `latestCommit`, `commits[]` (oldest first), `activeDays` | `git rev-list --count HEAD`, `git log --reverse` |
| `stack` | `list` ("React 19.3.1", ...), `versions.<id>`, `packages[]`, `directDependencyCount`, `installedPackageCount` | `package-lock.json` (installed versions), `package.json` (direct deps) |
| `agents` | `ids`, `roles` (display names), `count` | `docs/handoffs/*.md`, ordered by the commit that first added each note |
| `phases` (nullable) | `all`, `done`, `current`, `doneCount`, `totalCount` | `## Phases` table in `docs/project-status.md` |
| `provenance` (nullable) | `tool`, `plugin`, `pluginVersion`, `model`, `modelId`, `modelCoAuthoredCommitCount` | `## Build provenance` table, cross-checked against `Co-Authored-By:` trailers in git |
| `unavailable` | reason per null group | collector |

Display labels (`three.js`, `UX/UI designer`) live in `scripts/facts/config.ts`. They are wording, not facts; every number, date, version and name list comes from a source. Commit subjects and hashes are published; author names and emails are not (NFR-7).

### 5.4 Document sources (real data, not hard-coded)

- **Agent roles:** one `docs/handoffs/<agent-id>.md` per agent that has actually worked. The first line must be `# Handoff: <agent-id>`, matching the file name, or the build stops. The intro's role list therefore grows as agents hand off, and its order is the order of first commits. If the tech lead should appear, it writes `docs/handoffs/tech-lead.md`.
- **Phases:** a table in `docs/project-status.md`, kept by the tech lead:

  ```markdown
  ## Phases
  | # | Phase | Status |
  |---|---|---|
  | 1 | Requirements | Done |
  | 2 | Architecture | In progress |
  | 3 | Design | Not started |
  ```
  Status must be exactly `Not started`, `In progress` or `Done`. Rows are numbered 1 to n in order, with at most one `In progress`.
- **Provenance:** a second table in the same file:

  ```markdown
  ## Build provenance
  | Item | Value |
  |---|---|
  | Tool | Claude Code |
  | Plugin | application-builder |
  | Plugin version | 2.0.0 |
  | Model | Claude Opus 5.5 |
  | Model ID | claude-opus-5-5 |
  ```
  The model name is cross-checked against git: `modelCoAuthoredCommitCount` counts commits with a `Co-Authored-By: Claude Opus 5.5 <...>` trailer.

### 5.5 Intro template format (`src/content/intro.tmpl`)

```text
# comment
!draft                      coverage check off; refused in strict builds
!allow-digits 1970s 100     digit-bearing tokens allowed in hand-written copy (FR-14)
== page-id                  starts a page (kebab-case)
AS OF COMMIT {{ source.revision }}, {{ git.commitCount }} COMMITS.   one logical line
```

The build stops, listing every problem with `file:line`, when:
- a placeholder is unknown, points at a null group, or resolves to an empty string or empty list (FR-10)
- a placeholder points at something that is not printable (an object, a boolean, or `git.commits`)
- hand-written copy contains a digit not on the allow-list (FR-14)
- a brace is stray, text appears before the first page, a page id is invalid or duplicated, or a page is empty
- the template is not `!draft` and lacks any required fact: `source.revision`, `git.commitCount`, a first-commit date, `agents.roles`, `phases.all` or `phases.done`, `stack.list`, `provenance.tool`, `provenance.plugin` and `provenance.model` (FR-12, FR-13, and the user's decision to name the tool, plugin and model)

Formatting: lists join as "a, b and c"; numbers print plainly; dates use `dateDisplay` ("10 November 2026"). Case is the copy's choice; teletext upper-casing should be done with CSS or the rasteriser, not by changing fact text.

### 5.6 Output contract for UI and tests

- `ResolvedIntro.pages[].lines[].segments[]` is either `{ kind: 'copy', text }` or `{ kind: 'fact', key, text }`.
- The DOM transcript **must** render each fact segment as `<span data-fact="{key}">{text}</span>`. QA reads these from the rendered page (FR-11, US-12: the same in every mode).
- `dist/facts.json` and `dist/intro.json` ship with the build, so tests check the built artefact, not a regenerated copy. A stale `dist/` fails the test.
- `intro.characterCount` feeds the 30 to 60 s duration check (FR-8). The frontend exports its reveal rate so QA can compute duration.

### 5.7 Independent verification (FR-11; qa-engineer implements)

`tests/unit/facts.test.ts` must recompute each fact by a **different route** from the collector, and must not import `scripts/facts/*`. ESLint enforces this with `no-restricted-imports` on `tests/**`. Suggested routes:

| Fact | Collector uses | Test should use |
|---|---|---|
| `source.commitHash` | `rev-parse HEAD` | `git log -1 --format=%H`; also assert it equals the current HEAD, which catches stale builds |
| `git.commitCount` | `rev-list --count HEAD` | count lines of `git log --format=%H <hash>` |
| `git.firstCommit` | first entry of `log --reverse` | `git rev-list --max-parents=0 <hash>`, then `git show -s --format=%aI` |
| `stack.versions` | `package-lock.json` | `node_modules/<pkg>/package.json` `version`, and equality with the exact pin in `package.json` |
| `agents.ids` | handoff headings | directory listing of `docs/handoffs/*.md` (set equality) |
| `phases.*`, `provenance.*` | collector's table parser | the test's own parser |
| `provenance.modelCoAuthoredCommitCount` | regex over message bodies | `git log --format=%(trailers:key=Co-authored-by,valueonly)` |

The E2E test compares every `[data-fact]` element on the rendered page, in each mode (`?mode=...`), with the recomputed value.

## 6. Loading and performance strategy

- **Initial chunk:** React, DOM UI, stores and facts only (today 69 kB gzip). The start screen and power control are interactive before three.js arrives (NFR-2).
- **Lazy chunk:** `src/scene/Experience.tsx` via `React.lazy`, prefetched after first paint. Not loaded at all in `2d` mode. The TV model is fetched only in `3d-set` mode.
- **Power control** stays disabled until the active presentation reports ready (US-1).
- **Budgets:** first view under 5 MB (target 2 MB): JS 350 kB gzip, TV model 1.5 MB (Draco or Meshopt, KTX2 textures), fonts 150 kB.
- **Frame loop:** `frameloop="always"` only while warming up or playing with full motion; `"demand"` otherwise; paused when hidden (NFR-10). DPR capped at `[1, 2]`.
- Asset URLs must be built from `import.meta.env.BASE_URL` (for example `` `${import.meta.env.BASE_URL}models/tv.glb` ``), never from a leading `/` (ADR 0007).

## 7. Build, scripts and CI requirements

| Script | Does |
|---|---|
| `facts` | Collect facts and render the intro into `src/generated/` |
| `facts:strict` | Same, with strict checks (what CI does automatically) |
| `facts:check` | Fail if `src/generated/` is stale; writes nothing |
| `dev` | `facts`, then Vite dev server (rerun `facts` after new commits) |
| `build` | `facts`, `tsc -b`, `vite build` |
| `preview` | Serve `dist/` |
| `lint` | ESLint over `src`, `scripts`, `tests` and config |
| `format`, `format:check` | Prettier |
| `typecheck` | `facts`, then `tsc -b` |
| `test` | `facts`, then Vitest once |
| `test:e2e` | Playwright (builds and previews via `playwright.config.ts`) |

**CI requirements (devops-engineer):**
1. Check out the full history: `actions/checkout` with `fetch-depth: 0`. Otherwise the build stops by design.
2. Use the Node version from `.nvmrc`, and install with `npm ci`, which must not modify the lockfile.
3. `CI=true` makes the facts strict: a clean tree, both doc tables present, no `!draft` template, and model trailers present.
4. Deploy only from builds of pushed commits on the default branch. Pull-request builds check out a synthetic merge commit, whose hash does not exist on the branch.
5. Base path: the default `./` works on GitHub Pages project sites and at a domain root (ADR 0007).

## 8. Other decisions

- **Fonts:** self-hosted WOFF2 in `public/fonts/`, open licence, listed in `public/fonts/LICENCES.md`; no font CDN (NFR-7). The canvas rasteriser must wait for `document.fonts.load(...)` before the first draw.
- **Audio (Could):** prefer Web Audio synthesis (filtered noise for static, a 50 or 60 Hz hum, a click envelope), with no audio files, no licensing and almost no bytes. It starts only after an explicit unmute (FR-22).
- **Privacy:** no runtime third-party requests, no cookies, no storage needed.
- **Environment:** only build-time variables (`BASE_PATH`, `FACTS_STRICT`, `CI`); no `VITE_` client variables yet. See `.env.example`.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Phase and provenance tables are kept by hand by the tech lead | Strict parser, cross-check of the model name against git trailers, and QA's independent parser. Tables must be updated in the same commit as each phase change |
| Hosts that build from shallow clones or uploads without `.git` (some managed static hosts) | Build stops loudly. Build in CI with full history and upload `dist/` |
| A late commit makes deployed facts "old" | Wording is "as of commit <hash>" (FR-13), which stays true |
| Phone readability versus the 40-column teletext look | Responsive column count (§4.4); design spec to fix the breakpoints |
| Tone mapping or textures introduce colour | §4.5 rules plus QA pixel sampling |
| TypeScript held at 6.0 while 7 is current | Revisit when typescript-eslint supports TS 7 (ADR 0001) |
| `npm audit`: 10 moderate findings, all one `minimatch` advisory inside ESLint tooling | Dev-only, not in the bundle; the suggested "fix" is a downgrade. Re-check at each phase |


---

# v2: the environment player (ADR 0011)

## 10. v2 summary
v2 turns the site into a player for official YouTube embeds, shown inside one of nine 3D viewing environments (Mountain sky is the headline room). Channel 0 stays the Occupant (v1, unchanged). Channels 1 upward come from a curated guide, resolved by a scheduled GitHub Action into a same-origin `guide.json`, or from a pasted YouTube link. There is still **no backend** (ADR 0002 stands). No new runtime npm dependency is added; the YouTube IFrame API is loaded from YouTube after the first pick.

| Concern | v2 choice | Where |
|---|---|---|
| Player | One `YT.Player` for the visit, host `www.youtube-nocookie.com` | `src/ui/player/` (frontend-developer) |
| Compositing | DOM iframe **above** the canvas, positioned from the screen anchor's projected corners, only in a static face-on watch pose. No `CSS3DRenderer`, no drei `Html`, no depth hole | ADR 0011 section 1; `src/scene/environments/contract.ts` |
| Environments | 9 lazy chunks behind one contract and a registry | `src/scene/environments/` |
| Guide | Curated `src/content/guide-sources.json`, resolved by `scripts/guide/resolve.ts` in a scheduled Action into `dist/guide.json` | section 13 |
| Colour/B&W | `filter: grayscale(1)` on the `<canvas>` element only; default B&W | section 12 |
| Privacy | No third-party request before a pick; CSP and referrer meta tags | section 14 |

## 11. v2 folder structure and ownership (additions to section 3)

```text
src/scene/environments/
  contract.ts                  architect: types, placement constants, classifyPlacement()
  registry.ts                  scene-developer (scaffolded by the architect): id -> lazy import
  ScreenAnchor.tsx             scene-developer (to write): registers the anchor Object3D
  ScreenProjector.ts           scene-developer (to write): WatchPoseSolver, ScreenProjectorApi
  <id>/index.tsx               scene-developer (scene) and technical-artist (materials, assets); stubs today
src/guide/
  schema.ts, validate.ts       architect: guide contract and validators (browser and Node)
src/ui/player/, src/ui/guide/  frontend-developer (to write)
src/state/ (new stores)        frontend-developer: environmentStore, channelStore, playerStore, guideStore
src/content/guide-sources.json tech lead (entries), product-manager (terms review), architect (schema)
scripts/guide/                 architect: check-sources.ts, resolve.ts, resolve-core.ts, youtube.ts
scripts/csp.ts                 architect: CSP and referrer policy
public/models/<env>/, public/textures/<env>/   technical-artist, LICENCES.md per folder
.github/workflows/guide.yml    devops-engineer (to write)
tests/unit/guide-*.test.ts, environment-contract.test.ts   written by the architect, owned by qa-engineer
```

**Environment ids:** `tv-room`, `cinema`, `drive-in`, `open-air`, `bedroom`, `chai-stall`, `train`, `space-deck`, `mountain-sky` (added 2026-11-11: a summit above a sea of clouds, with a giant flat 16:9 screen floating head-on in the sky; provisional anchor `fill` 0.72, `align: 'centre'`, `vAlign: 'upper'`, final values in design spec v2 §5). They are selected with `?env=<id>`, a query string rather than a route, so ADR 0007's relative base still holds.

## 12. v2 runtime architecture

### 12.1 Data flow

```text
guide.json (same origin, lazy) --parseGuide--> guideStore --.
pasted link --frontend parser (video id only)---------------+--> channelStore (current, tuning)
                                                            |          |
environmentStore (id, pose: browse|watch, focus) <----------'          v
        |                                                     PlayerHost (one YT.Player)
        v                                                              ^
lazy environment chunk --> <ScreenAnchor> --> ScreenProjector --> classifyPlacement() --> playerStore.placement
                                               (on resize and when a pose tween ends; never per frame)
```

### 12.2 Player placement rules (implemented once, in `classifyPlacement`)

| Condition | Placement |
|---|---|
| 2D mode, or the user chose Focus, or a phone-class viewport | `focus` (player in DOM flow, environment dimmed behind) |
| Browse pose | `hidden` (player paused) |
| Projected quad not axis-aligned within 1 CSS px | `hidden` |
| Any part outside the viewport | `hidden` |
| Rectangle under 480 x 270 CSS px | `focus` |
| Otherwise | `inline` at the rectangle |

Guarantees:
- The player layer is stacked above the canvas.
- No ancestor of the iframe has `filter`, `opacity` below 1, `mix-blend-mode`, `mask`, `clip-path` or a 3D transform.
- The iframe is never re-parented.
- Channel 0 destroys the player.

### 12.3 Environments
- Each `<id>/index.tsx` default-exports an `EnvironmentModule`: `id`, `Scene`, and `screen` (`aspect`, `widthM`, `fill`, `align` and optional `vAlign` from design spec v2 section 5). The TV room also sets `hostsChannel0`.
- Static metadata (label, budget, loader) lives in `registry.ts`, so pickers never load chunks.
- Scenes receive `{ calm, pose, colour, channel }`, render exactly one anchor, and place nothing between the watch-pose camera and the screen.
- The TV room keeps v1's code path for channel 0. For YouTube channels its anchor is the flat bezel opening (4:3), the CRT glass is off, and haunting stays off the screen.

**Budget per environment** (declared in the registry, checked in CI by the performance-optimiser's scripts):

| | Mobile | Desktop |
|---|---|---|
| JS (gzip, excluding the shared core) | 60 kB | 60 kB |
| Assets on first entry | 1.5 MB | 2 MB |
| Draw calls | 50 | 100 |
| Triangles | 150,000 | 500,000 |
| Largest texture | 1024² | 2048² |

The TV room is measured against v1's budget.

### 12.4 Colour/B&W (amends section 4.5 for v2)
- `filter: grayscale(1)` on the `<canvas>` element, on by default. Each channel is the same weighted sum, so R = G = B exactly in B&W.
- The player, info row, dock and all site text stay as they are and remain greyscale by design.
- Channel 0 always stays B&W (v1). In focus layout the canvas filter may add `brightness(0.6)` (design spec v2 section 2.4), on the canvas only.

## 13. The channel guide pipeline

### 13.1 Inputs and checks
- `src/content/guide-sources.json` (schema `GuideSources` in `src/guide/schema.ts`) holds the curated, high-confidence channels: channel ID, languages, genre, country, region tested, attribution, terms, `permission` (`not-required`, `requested`, `granted`), `confidence`, `checked` date, `enabled`, and an optional `preferTitle`.
- `npm run guide:check` (`scripts/guide/check-sources.ts`) runs inside `npm run build`.
  - **Errors stop the build:** bad channel ID, duplicate number or ID, channel 0, low confidence, non-https or credentialled URLs, an invalid regex, a future date.
  - **Age over 90 days** is only a warning, so the scheduled rebuild of an old tag never breaks. `--fail-stale` turns it into an error, for use on pushes to `main`.

### 13.2 Resolver (`npm run guide:resolve`, run by `.github/workflows/guide.yml`)

```text
YOUTUBE_API_KEY=<secret> node scripts/guide/resolve.ts \
  --out dist/guide.json --release <tag> \
  [--previous https://<site>/guide.json] [--ledger <cache>/ledger.json] [--sources src/content/guide-sources.json]
```

- **Exit 0:** the guide was written, possibly degraded (stale or unresolved entries; see the log).
- **Exit 1:** configuration error (no key, invalid sources, bad arguments). Nothing is written.
- **Order of calls:**
  1. Re-validate the previous guide's IDs with `videos.list`: 1 unit per 50 IDs.
  2. For channels with nothing usable, read the uploads playlist with `playlistItems.list` (1 unit each), then validate.
  3. Only then `search.list eventType=live`: 100 units, at most 40 a day.
- **Ledger:** keyed by Pacific day; refuses any call over 8,000 units a day.
- **Usable** means: same channel, `liveBroadcastContent=live`, started and not ended, public, `status.embeddable`, not age-restricted. Among several, `preferTitle` wins, then most viewers, then the earliest start.
- **Failure:** a quota or auth error stops further calls for the run. The last good entry is kept as `stale` for up to 30 days, then the channel becomes `unresolved`.
- **Self-checks before writing:** the output must not contain the key, and must pass `parseGuide`.
- `--lookup @handle` resolves a handle to a channel ID (1 unit), for curation.

### 13.3 Output and browser use
- `dist/guide.json` (schema `ChannelGuide`) is about 5 kB gzip. It is fetched lazily when the guide first opens and parsed with `parseGuide`, which drops malformed entries and cleans titles.
- Local builds have no guide; the UI shows "guide unavailable" plus paste-a-link.

### 13.4 Interaction with the facts pipeline and strict CI
- `guide.json` is never committed, never in `src/generated/`, never read by `scripts/facts/`, and excluded from NFR-9 and `facts:check`.
- The guide workflow rebuilds the latest `v*` tag strictly. That build is deterministic, so its app files and facts equal the release.
- No runtime dependency was added and `STACK_PACKAGES` is unchanged. Checked on 2026-11-11: the stack list, the intro copy and the fact keys are identical to before v2 Phase 2; only HEAD-derived facts moved.

## 14. Privacy, CSP and network (amends section 8 and NFR-7 for v2)
- **Referrer:** `<meta name="referrer" content="strict-origin-when-cross-origin">` is static in `index.html`. The iframe also gets `referrerpolicy="strict-origin-when-cross-origin"` (frontend).
- **CSP:** `scripts/csp.ts` is the single source. A build-only Vite plugin (`injectCsp` in `vite.config.ts`) prepends it as a `<meta http-equiv>` to every built page. The dev server has none, because HMR needs inline scripts and styles.

  ```text
  default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://www.youtube.com;
  frame-src https://www.youtube-nocookie.com; connect-src 'self'; img-src 'self' data: blob:;
  media-src 'self' blob:; font-src 'self'; style-src 'self'; worker-src 'self' blob:;
  object-src 'none'; base-uri 'self'; form-action 'none'
  ```

  `'wasm-unsafe-eval'` is for self-hosted Draco, Meshopt and KTX2 decoders. Decoders must never load from a CDN; for example, drei's `useGLTF` default Draco path is gstatic, so pass a local path.
- **Verified under the CSP** on 2026-11-11 (strict clean-clone build, Chromium): `production.spec.ts` 6 of 6 passed, including "no console errors"; `power`, `fallback` and `story` specs 39 of 39 passed.
- **Network rule (replaces v1 NFR-7 for v2):** no third-party request of any kind before a channel is picked. After a pick, the main frame may request only `https://www.youtube.com`, and the only child frame is `https://www.youtube-nocookie.com`. Our origin never stores cookies or anything else.
- **`privacy.html`** (design spec v2 section 6.3) is the second Vite HTML input (`build.rolldownOptions.input`: `main` and `privacy`). It is a placeholder today; the frontend-developer writes the content. The CSP plugin and `dropGitkeep` apply to both pages. Like `index.html`, it carries the static referrer meta tag, and it may use no inline styles or scripts.

## 15. v2 bundle impact

| Item | Target | Today (2026-11-11) |
|---|---|---|
| Initial JS | v1 plus 10 kB gzip or less | 99.38 kB (v1 99.31 kB; the difference is the embedded facts). Nothing new is imported yet |
| Shared 3D core plus TV room | v1 (284 kB gzip) | 284.06 kB, unchanged |
| Each other environment | 60 kB gzip plus 1.5 or 2 MB of assets, on choosing it | Stubs, not imported yet |
| `guide.json` | about 5 kB gzip, lazy | Not built locally |
| YouTube scripts | Outside our budget, after the first pick | none |

## 16. v2 risks

| Risk | Mitigation |
|---|---|
| Only 5 curated channels have recorded IDs (the research lists 54 more high-confidence channels by name only) | Look the IDs up with `guide:resolve --lookup @handle` (1 unit each) or from each channel's About page, then add entries. Never guess IDs |
| GitHub disables scheduled workflows after 60 days with no commits | The UI shows `stale` and `checkedAt`; the runbook explains how to re-enable |
| YouTube changes its embed rules (as with the 2025 referrer requirement) | Error mapping (ADR 0011 section 4); `guide.json` drops non-embeddable entries |
| Third-party video can flash | Disclosure and the partial-conformance statement (ADR 0011 section 5) |
| A meta CSP cannot set `frame-ancestors` | Accepted for a static site (ADR 0011 section 6) |
