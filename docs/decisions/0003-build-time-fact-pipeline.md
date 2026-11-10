# 0003: Generate intro facts at build time and fail closed

## Status
Accepted (2026-11-10)

## Context
Every factual claim in the intro must come from real repo data (FR-9). Unresolved placeholders, missing sources and empty facts must fail the build (FR-10). An independent test must recompute the facts (FR-11). Builds must be reproducible (NFR-9). Many CI systems and static hosts check out shallow clones, or upload files without `.git`, which makes `git rev-list --count` silently wrong.

Options considered:
1. Runtime fetch of repo data: rejected, because there is no backend (ADR 0002) and runtime third-party requests are not allowed (NFR-7).
2. A Vite plugin that resolves facts during bundling: rejected as the only mechanism, because `tsc` and Vitest need the generated types before Vite runs, and a separate CLI is easier to test and to run with `--check`.
3. **A standalone Node script, run before every dev, build, typecheck and test, emitting typed modules: chosen.**

## Decision
- `scripts/facts/collect.ts` (run by `npm run facts`; Node type stripping, no extra dependency) collects facts from git, `package.json`, `package-lock.json`, `docs/handoffs/*.md` and `docs/project-status.md` (ADR 0004). It renders `src/content/intro.tmpl` and writes `src/generated/{facts,intro}.{json,ts}` (gitignored). A small Vite plugin copies the JSON into `dist/`.
- The contract is `src/facts/schema.ts`. Generated `.ts` modules are typed as `Facts` and `ResolvedIntro`, so `tsc` checks the collector's output shape.
- **Fail loudly rather than lie:** stop the build when git is missing, the tree is not a work tree, the clone is shallow, HEAD is missing, or log and count disagree. Every git call sets `GIT_NO_REPLACE_OBJECTS=1`.
- **Fail closed at the point of use:** a doc group that is absent becomes `null` with a reason; any placeholder that reaches it stops the build. Malformed sources always stop the build.
- **Strict mode** (`CI=true`, `FACTS_STRICT=1` or `--strict`) also refuses uncommitted changes, any unavailable group, a `!draft` template, and a provenance model with no matching `Co-Authored-By` trailer.
- **Dirty local builds are allowed but disclosed:** `source.revision` becomes `<hash>-dirty`, and the intro's "as of commit" line uses `revision`.
- **Template rules:** placeholders must resolve to non-empty printable values. Hand-written digits fail unless allow-listed (FR-14). A non-draft intro must cover the facts FR-12 and FR-13 require, plus the tool, plugin and model.
- **Determinism:** no wall-clock time; 7-character short hashes; dates in each commit's own offset; files written only when content changes.
- **Independence:** the facts test may import `src/facts/schema.ts` but not `scripts/facts/*` (ESLint `no-restricted-imports` on `tests/**`), and must recompute each fact by a different git or file route (architecture §5.7).

## Consequences
- The intro cannot ship a stale or invented number without a red build.
- Local `npm run build` works on uncommitted work, so the tech lead can build before committing; CI is the release gate.
- CI must check out full history (`fetch-depth: 0`); hosts that build from shallow clones must not be used to build.
- Templates are a small custom format; the copywriter has to learn the four line types.
