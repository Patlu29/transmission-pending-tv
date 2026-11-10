# Project status

- **Current phase:** 6. QA
- **Repository:** https://github.com/Patlu29/transmission-pending-tv (public)
- **Approvals given:**
  - Phase 1 scope approved (2026-11-10). Decisions: 3D TV set on desktop with screen-filling view on mobile; intro names Claude Code, the application-builder plugin, model and agent roles openly; audio optional and off by default; site name "Transmission Pending".
  - Defaults accepted: facts read "as of commit <hash>"; generic static host (to be chosen by devops).
  - Phase 2 architecture approved (2026-11-10).
  - Phase 3 design approved (2026-11-10). Added: Power toggles on/off (power-off shrinks to a dot); manual Calm mode switch on the start screen; Bedstead font if licence checks out, else VT323.
  - Scope change (2026-11-10): the intro becomes a horror ghost story, "Haunted TV tells its build". All four animation types (haunted text, ghost forming from static, haunted set, camera creep). Creepy, no jump scares. Facts stay real.
  - Font decision (2026-11-10): VT323 replaces Bedstead (licence caveat). Ghost stays nameless ("the Occupant").
  - Repository on GitHub account Patlu29, public, name decided with product manager and architect.
- **Open questions:** hosting target (devops will propose; GitHub Pages fits the public repo)
- **Build:** strict CI build, lint, typecheck and 27 unit tests pass (2026-11-10). Bundle: initial JS 96.8 kB gzip, scene chunk 283.7 kB gzip, fonts 60.5 kB.
- **Performance decisions (tech lead):** first-view JS of 380.8 kB gzip accepted (over the 350 kB architecture target, well inside NFR-3's 5 MB); adaptive DPR step-down accepted. Real-device FPS is unmeasured (headless SwiftShader only).
- **Bug count:** not yet tested (QA is Phase 6)

## Phases
| # | Phase | Status |
|---|---|---|
| 1 | Requirements | Done |
| 2 | Architecture | Done |
| 3 | Design | Done |
| 4 | Build | Done |
| 5 | Performance | Done |
| 6 | QA | In progress |
| 7 | Delivery | Not started |

## Build provenance
| Item | Value |
|---|---|
| Tool | Claude Code |
| Plugin | application-builder |
| Plugin version | 2.0.0 |
| Model | Claude Opus 5.5 |
| Model ID | claude-opus-5-5 |
