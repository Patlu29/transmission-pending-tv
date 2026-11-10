# 0007: Build with a relative base path

## Status
Accepted (2026-11-10)

## Context
The host is not chosen yet. The repo is expected to live on GitHub (account Patlu29), where a Pages project site is served from `/<repo-name>/`. An absolute Vite `base` would tie the build to the repo name and break if the repo is renamed or moved to a custom domain.

## Decision
`vite.config.ts` uses `base: './'` by default. `BASE_PATH` can override it with an absolute path that starts and ends with `/`. The app is a single page with no client-side routing, so relative URLs always resolve against the page itself. Runtime asset URLs must be built from `import.meta.env.BASE_URL`.

## Consequences
- The same `dist/` works at a domain root, at `/<repo>/`, or under any sub-path, with no change when the repo name is chosen.
- If client-side routes with nested paths are ever added, switch to an absolute `BASE_PATH`.
- A page served without its trailing slash (`/repo` instead of `/repo/`) would resolve relative URLs wrongly. GitHub Pages redirects to the slash form; other hosts may need a redirect rule (devops).
