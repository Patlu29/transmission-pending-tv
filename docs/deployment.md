# Deployment

Host: **GitHub Pages**, deployed with GitHub Actions (ADR 0002, ADR 0011). No backend. Expected URL: `https://patlu29.github.io/transmission-pending-tv/`

## Workflows

| File | Triggers | What it does | Deploys? |
|---|---|---|---|
| `.github/workflows/ci.yml` | push to `main`, pull request to `main` | Job `checks`: `npm ci`, strict `npm run build`, lint, format check, typecheck, unit tests, clean-tree check, `dist/` check (no `.map`, no `.gitkeep`). Then `e2e` matrix: chromium, webkit, mobile (3 projects), plus informational `visual (chromium)` and `firefox` | Never |
| `.github/workflows/deploy.yml` | pushed tag `v*`, or manual run (Actions tab, "Run workflow") | Full clone, strict build, lint, typecheck, unit tests, upload `dist/`, deploy to Pages, smoke test | Yes, only on those triggers |

Committing the workflow files deploys nothing.

### Why the pipeline is shaped this way
- `fetch-depth: 0` everywhere: the facts step refuses a shallow clone.
- `CI=true` (set by Actions) makes facts strict: clean tree, no `!draft` template, model trailers present. Nothing in the pipeline may leave unignored files behind; CI checks this.
- The build runs before unit tests because `tests/unit/facts.test.ts` compares `dist/facts.json` with a fresh recomputation.
- Pull requests check out the PR head commit, not GitHub's synthetic merge commit, so the facts describe a real commit.
- Deploys check that the commit is on `main` (`git merge-base --is-ancestor`) and refuse any other ref.
- Pages concurrency group `pages` with `cancel-in-progress: false`: deployments queue and are never cut off part-way. The v2 `guide.yml` should use the same group.
- E2E is split into parallel jobs (about 20 minutes serial locally). Each job builds the test and production builds itself, so it needs only the checkout. Timeout 60 minutes per E2E job, 15 for checks and builds. Playwright browsers are cached by version and browser set; npm is cached by `setup-node`.
- Chromium and mobile projects use SwiftShader through `playwright.config.ts`. WebKit and iOS run with the config defaults.
- Reports and artefacts upload when an E2E job fails or is cancelled (artefact `playwright-<n>`, 7 days). The built `dist/` is uploaded by `checks` (artefact `dist`).

### Known CI risks
- **Visual baselines** in `tests/e2e/__screenshots__/chromium` were captured on macOS. Linux SwiftShader output may differ, so the `visual (chromium)` job is `continue-on-error`. To make it blocking, regenerate baselines on a runner (qa-engineer) and remove `experimental: true` for that matrix entry.
- **Firefox** with software WebGL is unproven on ubuntu runners, so it is informational. Promote it once it passes.
- **Action versions** (`checkout@v5`, `setup-node@v5`, `cache@v4`, `upload-artifact@v4`, `configure-pages@v5`, `upload-pages-artifact@v4`, `deploy-pages@v4`) were not checked against the registry from this environment. If a run reports a deprecation, bump the major version. actionlint was not available; the YAML parses and was reviewed by hand.

## Secrets and variables

| Name | Where | Used by | Needed now? |
|---|---|---|---|
| `GITHUB_TOKEN` | provided by Actions | all jobs, permissions set per workflow (`contents: read`; deploy adds `pages: write`, `id-token: write`) | automatic |
| `YOUTUBE_API_KEY` | repo secret (v2) | future `guide.yml` (YouTube Data API v3) | **No, v2 only** |

No other secrets or variables. `BASE_PATH` and `FACTS_STRICT` (see `.env.example`) are not set in CI: the base path stays `./` (ADR 0007) and `CI=true` already makes facts strict. Never use a `VITE_` variable for a secret.

## Manual steps for the user (nothing here has been done)

1. Commit and push the workflow files (Tech Lead or user). CI starts on the push to `main`. Nothing deploys.
2. In GitHub: repo **Settings, Pages, Build and deployment, Source: GitHub Actions**.
3. Check CI is green on `main`.
4. Release: create and push the tag on a commit that is on `main`:
   ```sh
   git tag v1.0.0
   git push origin v1.0.0
   ```
   or: **Actions, Deploy to GitHub Pages, Run workflow** on branch `main`.
5. Open `https://patlu29.github.io/transmission-pending-tv/` (the first deployment can take a minute or two; the first approval of the `github-pages` environment is automatic unless protection rules were added).
6. Optional: Settings, Environments, `github-pages`: tags matching `v*` and `main` should be allowed to deploy. The default rule allows only `main`, so a tag deploy can be rejected; if so, add the `v*` tag rule.
7. Optional: Settings, Branches: protect `main`, require the `Build, lint, types, unit tests`, `E2E chromium`, `E2E webkit` and `E2E mobile` checks.

## The tag commit is counted in the facts

The facts are read from git at build time. A tag deploy builds the tagged commit, so the commit count, "as of commit" hash and diary include everything up to and including that commit, and nothing after it. If you commit after tagging (for example a docs fix), the deployed site is one or more commits behind; the wording "as of commit <hash>" stays true (FR-13). The tag itself adds no commit. Do not create the release by a GitHub "merge" or a separate "release" commit unless you want it counted. A manual dispatch counts everything up to the current `main` head.

## Hosting check

GitHub Pages cannot set custom headers, so there is no `_headers` or `vercel.json`. What Pages gives, and what we do about it:

| Concern | Result |
|---|---|
| MIME types | `.woff2` `font/woff2`, `.png` `image/png`, `.json` `application/json`, `.js` `text/javascript`, `.css` `text/css`, `.svg` `image/svg+xml`. All present in the build output. The deploy smoke test prints the headers for three of them. |
| `.glsl`, `.glb`, `.ktx2`, `.wasm` | None emitted. Shaders are bundled in the JS. If a model or `.wasm` is added later, check Pages' type for it (unknown extensions get `application/octet-stream`; `.glb` may need a loader that ignores the type). |
| Compression | Pages gzips text types (JS, CSS, HTML, JSON). No brotli. Performance figure of about 380 kB gzip holds. |
| Caching | Fixed by Pages: `Cache-Control: max-age=600`. We cannot make `assets/` immutable. Hashed file names still make deploys safe; the cost is a revalidation about every 10 minutes. |
| Trailing slash | Pages redirects `/transmission-pending-tv` to `/transmission-pending-tv/`. The relative base needs the slash (ADR 0007); the smoke test checks `/` returns 200. Always share the slash URL. |
| Source maps, `.gitkeep` | Removed (BUG-6, below). Licence files in `public/**/LICENCES.md` and `fonts/licences/` ship on purpose (attribution). |
| Jekyll | Actions deployments do not run Jekyll. No `.nojekyll` needed. |

### Meta-tag needs for v2 (headers are not available)
Add to `index.html` (architect/frontend) when the YouTube player lands:
- `<meta name="referrer" content="strict-origin-when-cross-origin">` (ADR 0011).
- A CSP meta tag: `script-src 'self' https://www.youtube.com`, `frame-src https://www.youtube-nocookie.com`, `img-src 'self' data: blob:`, `connect-src 'self'`, `font-src 'self'`, `style-src 'self' 'unsafe-inline'` (check what R3F and inline styles need), `object-src 'none'`, `base-uri 'self'`.
- A meta CSP cannot do `frame-ancestors`, `report-uri` or `sandbox`. If those matter, put Cloudflare or similar in front, or accept the limit.
- v1 makes no third-party requests, so a v1 CSP is optional.

## BUG-6 result
`vite.config.ts`: `build.sourcemap` is now `false`, and a small `dropGitkeep` plugin deletes `.gitkeep` from the output after the bundle is written. `dist/` is 1.5 MB with no `.map` files, no `.gitkeep` and no `sourceMappingURL` comments. CI fails if either returns.

## Rolling back
Pages has no one-click rollback. Choose one:
1. **Redeploy an older release:** Actions, Deploy to GitHub Pages, Run workflow, choose the old tag in the "Use workflow from" selector (manual runs accept tags). The facts then describe that tag's commit. Note the guard requires the commit to be on `main`, which old tags are.
2. **Revert and re-tag:** `git revert <bad-commit>`, push to `main`, tag `v1.0.1`, push the tag.
3. **Take the site down:** Settings, Pages, Unpublish site.

Never delete and re-push a tag to "redo" a release; use a new tag.

## v2 notes (not built)
- `guide.yml` (ADR 0011) will run on a 30-minute schedule, check out the latest `v*` tag with full history, build strict, write `dist/guide.json`, and deploy to Pages. It will use the same `pages` concurrency group and the same permissions as `deploy.yml`. Nothing in v1 blocks that.
- It needs a repo secret **`YOUTUBE_API_KEY`** (Google Cloud, YouTube Data API v3, restricted to that API). Never on `pull_request` events, so forks never see it. Add a secret scan and a `dist/` key check there.
- GitHub disables scheduled workflows after 60 days without repository activity on a public repo; re-enable by hand or push a commit. Put this in the runbook.
- The guide is never committed (it would change `git.commitCount`).
