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
- **v2 decisions (2026-11-11), live channels:**
  - Sequencing: finish v1 first (QA fixes, delivery, tag v1.0), then build v2 on a branch.
  - Shape: public site = channel 0 (the Occupant's story) + openly licensed archive channels; plus a private, login-only backend for the user's household that relays the user's own SAT>IP / PC tuner (DD Free Dish, India) for personal viewing. Live channels are never streamed from the public site.
  - Colour: both. A Colour/B&W switch on the set, default B&W.
  - Flash: runtime brightness-change limiter accepted; Calm and 2D modes play pre-checked clips only.
- **v2 pivot (2026-11-11), replaces the archive + private relay plan:** v2 is a multi-environment player for streams from other sites. No hosting, relaying or re-encoding of any stream; play only through official embeds/players or openly published streams. Sources: a curated guide of verified official streams plus paste-a-link. Environments: 1970s TV (v1, channel 0 stays the Occupant), cinema theatre, car, open space, plus more from research into where people like to watch. Colour/B&W is a viewer option in every environment. ADR 0009 and 0010 to be superseded.
- **v2 direction approved (2026-11-11):** Colour/B&W changes the environment only (YouTube video is never filtered or overlaid; channel 0 keeps full B&W CRT). DD/Sansad channels included via official YouTube embeds, with a permission email for the user to send to Prasar Bharati and Sansad TV. First v2 release has 8 environments: 1970s TV, cinema, car/drive-in, open air, rainy-night bedroom, chai stall with cricket, train window seat, space deck.
- **v2 architecture decisions (2026-11-11, ADR 0011 accepted):** Calm mode plays YouTube channels after a once-per-visit flash warning (environment motion frozen). DD/Sansad channels go live once the user has sent the permission email; removed at once on objection. The user will create the YouTube Data API key and add it as a GitHub secret; guide refreshes every 30 minutes.
- **Open questions:** none (hosting: GitHub Pages per ADR 0011)
- **Build:** strict CI build, lint, typecheck and 27 unit tests pass (2026-11-10). Bundle: initial JS 96.8 kB gzip, scene chunk 283.7 kB gzip, fonts 60.5 kB.
- **Performance decisions (tech lead):** first-view JS of 380.8 kB gzip accepted (over the 350 kB architecture target, well inside NFR-3's 5 MB); adaptive DPR step-down accepted. Real-device FPS is unmeasured (headless SwiftShader only).
- **Bug count:** 6 open after QA round 0 (2 major: BUG-1 framing, BUG-2 Calm persistence; 4 minor). Fix round 1 in progress.

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
