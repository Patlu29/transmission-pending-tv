# Handoff: devops-engineer

## Summary
Wrote the CI and GitHub Pages deploy workflows, fixed BUG-6 (no source maps or `.gitkeep` in `dist/`), checked what Pages can and cannot do for headers, and wrote `docs/deployment.md`. Nothing was committed, pushed, tagged or deployed. actionlint is not installed; the YAML parses (js-yaml) and was reviewed by hand.

## Files changed
- .github/workflows/ci.yml: push/PR to main. `checks` (strict build, lint, format, typecheck, unit tests, clean-tree and dist checks) then an E2E matrix (chromium, webkit, mobile; visual and firefox informational)
- .github/workflows/deploy.yml: tag `v*` and manual dispatch only. Strict build from a full clone, on-main guard, configure-pages, upload-pages-artifact, deploy-pages, smoke test
- vite.config.ts (architect-owned, minimal): `sourcemap: false`; new `dropGitkeep` plugin (about 20 lines)
- docs/deployment.md: manual steps, secrets, hosting check, rollback, v2 notes
- docs/handoffs/devops-engineer.md: this note

## Decisions
- PR jobs check out the PR head SHA, not the merge commit: facts then describe a real commit (architect request).
- E2E split into parallel jobs, 60 minute timeout each. Visual and Firefox are `continue-on-error`: baselines are macOS-made and Firefox WebGL is unproven.
- Deploy refuses commits not on `main`; one `pages` concurrency group with no cancel, to be shared by the v2 `guide.yml`.
- Source maps disabled outright rather than hidden: no error-reporting service consumes them.
- Licence files under `public/` still ship (attribution).

## Assumptions
- Action majors (checkout 5, setup-node 5, cache 4, upload-artifact 4, configure-pages 5, upload-pages-artifact 4, deploy-pages 4) are current; not verifiable offline.
- The repo's default branch is `main`.
- Verified locally: `npm run build` (non-strict, because my edit made the tree dirty), lint, format:check and unit tests (51 of 51) pass. The strict build was not run on a clean tree; it will run on the first CI push. The E2E suite was not run.

## Open questions
- Is the first CI run green on Linux? Unknown: SwiftShader on ubuntu, WebKit on ubuntu and facts strictness (clean tree, trailers) are untested until it runs (Tech Lead).
- Does the `github-pages` environment allow `v*` tags? The default rule allows only the default branch; add a tag rule if the first deploy is rejected (user).

## Requests for other agents
- architect: review the two-part change to `vite.config.ts` (`sourcemap: false`, `dropGitkeep`). Alternative if preferred: delete the `.gitkeep` files from folders that already hold files (fonts, textures, models, env).
- architect/frontend-developer: for v2, add the referrer meta tag and CSP meta tag listed in docs/deployment.md.
- qa-engineer: regenerate visual baselines on Linux so the visual job can become blocking; consider adding the platform to `snapshotPathTemplate`.
- performance-optimiser: Pages fixes `max-age=600` and gzip only; the "long-cache `assets/`" request cannot be met on this host.
- tech-lead: commit the files, then follow the manual steps in docs/deployment.md.
