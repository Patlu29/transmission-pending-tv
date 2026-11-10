# 0006: Pin the public npm registry and save exact versions

## Status
Accepted (2026-11-10)

## Context
The development machine's user-level npm config points at a private corporate registry mirror. A lockfile written through it would record `resolved` URLs that GitHub-hosted CI cannot reach. The intro also reports exact versions (FR-12), and builds should be reproducible (NFR-9).

## Decision
A project `.npmrc` sets `registry=https://registry.npmjs.org/`, `save-exact=true` and `engine-strict=true`. All 331 lockfile entries resolve from registry.npmjs.org. `.nvmrc` pins Node 26 (`engines`: `>=22.18.0`, needed for unflagged type stripping).

## Consequences
- `npm ci` works on any machine with public npm access.
- A machine that can only reach the private mirror must override the registry locally; that must not be committed.
- Upgrades are explicit (`npm install pkg@x.y.z`), and each one changes the intro's stack facts in the same commit.
