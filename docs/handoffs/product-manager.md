# Handoff: product-manager

## Summary
Wrote requirements (FR-1 to FR-23, NFR-1 to NFR-14) and 17 user stories in 5 epics for the 1970s TV self-intro site. The central requirement is that intro facts are generated from real repo data at build time and checked by an independent test.

## Files changed
- docs/requirements/requirements.md: new
- docs/requirements/user-stories.md: new
- docs/handoffs/product-manager.md: new

## Decisions
- Fact truthfulness is split into generate (FR-9, FR-10), verify (FR-11) and wording (FR-13): mechanism is left to the architect, but the behaviour is testable.
- Commit count is "as of commit <hash>": a commit cannot contain its own count, so exactness is defined at a named commit.
- Greyscale is testable by pixel sampling (FR-2).
- Flash safety uses WCAG 2.3.1 as the standard (FR-19).
- MVP has more than 10 Musts on purpose: truthfulness, accessibility and the diary are explicit in the brief.
- No backend (NFR-8).

## Assumptions
- Generic 1970s look, not tied to a country or broadcaster.
- Intro is English (Australian), unvoiced, 30 to 60 s, clean humour.
- Facts come from this repo only (git log, package.json, docs, handoff notes).
- Static host chosen by architect and devops.

## Open questions
- Q1: Modelled 3D TV body, or screen-only CRT shader? Default: 3D body on desktop, screen-filling on mobile (user, architect)
- Q2: Exact wording policy for facts when commits happen after the deployed build. Default: "as of commit <hash>" (user)
- Q3: Reveal agents, plugin and model openly in the intro? Default: yes (user)
- Q4: Audio wanted? Default: optional, off, Could (user)
- Q5: Project name, page title and host or URL? Default: placeholder title (user)

## Requests for other agents
- architect: choose the build-time facts mechanism, define the facts schema, and ensure the build reads handoff notes and git history (including in CI with full clone depth).
- architect: decide the 2D fallback approach and the reduced-motion rendering path.
- ux-ui-designer: design teletext typography, greyscale contrast tokens meeting WCAG AA, the start screen flicker note, and Skip/Replay placement.
- technical-artist: original test card and CRT effects within flash limits; record font and asset licences.
- qa-engineer: automate greyscale sampling, facts-vs-repo test, flash analysis and reduced-motion checks.
- devops-engineer: ensure CI checks out full git history and deploys a static bundle.
- tech-lead: keep one commit per step and no history rewriting.
