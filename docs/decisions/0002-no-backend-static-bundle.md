# 0002: No backend; ship a static bundle

## Status
Accepted (2026-11-10)

## Context
NFR-8 requires a static deployable bundle with facts baked in at build time. FR-X1 rules out accounts, comments and saved state. NFR-7 rules out cookies, trackers and runtime third-party requests. The user chose a generic static host, to be picked later by devops.

## Decision
No server, API or managed backend. Everything the page needs is produced by `npm run build` into `dist/`: HTML, JS, CSS, fonts, models, textures, `facts.json` and `intro.json`. There is no `server/` folder and no `docs/api.md`.

## Consequences
- Hosting is any static file host; no secrets, no runtime cost, nothing to patch at run time.
- Facts are only as fresh as the last build, which the "as of commit <hash>" wording (FR-13) makes explicit.
- The build machine must have git and full history (ADR 0003); this moves complexity from run time to CI.
