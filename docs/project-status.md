# Project status

- **Current phase:** v2 on branch `v2`: Phase 2 and 3 done; Phase 4 (build) starting. v1 on `main` awaits the user's release steps.
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
- **v2 design approved (2026-11-11):** warm "colour era" tint for the TV room on live channels (channel 0 stays B&W); optional synthesised room sound included, off by default; no rooms cut. New 9th headline room: **Mountain sky**, where the viewer stands on a summit and the video plays on a giant flat screen floating in the sky (flat and head-on per YouTube rules; scenery frames it, never covers it). DD/Sansad entries stay disabled until the user confirms the permission email has been sent.
- **Blocked (user action):** GitHub Actions cannot run. The first CI run (42991865167, 2026-11-11) was not started because the Patlu29 account is locked due to a billing issue. CI, the Pages deploy and the v2 guide Action all wait on this.
- **Open questions:** none (hosting: GitHub Pages per ADR 0011)
- **Build:** strict CI build, lint, typecheck and 27 unit tests pass (2026-11-10). Bundle: initial JS 96.8 kB gzip, scene chunk 283.7 kB gzip, fonts 60.5 kB.
- **Performance decisions (tech lead):** first-view JS of 380.8 kB gzip accepted (over the 350 kB architecture target, well inside NFR-3's 5 MB); adaptive DPR step-down accepted. Real-device FPS is unmeasured (headless SwiftShader only).
- **Bug count:** QA done after two fix rounds (305/311 pass, 4 deliberate skips). 0 major open. 3 minor open: BUG-4 2D collapse step 0.070 and BUG-7 Replay-start step 0.0535 (both over the 0.05 design margin, under the 0.10 hard limit, 0 flashes); BUG-6 source maps in dist (devops, Phase 7). Not verified: 3D shader collapse, real-device FPS, Firefox.

## Phases
| # | Phase | Status |
|---|---|---|
| 1 | Requirements | Done |
| 2 | Architecture | Done |
| 3 | Design | Done |
| 4 | Build | Done |
| 5 | Performance | Done |
| 6 | QA | Done |
| 7 | Delivery | Done |

## Build provenance
| Item | Value |
|---|---|
| Tool | Claude Code |
| Plugin | application-builder |
| Plugin version | 2.0.0 |
| Model | Claude Opus 5.5 |
| Model ID | claude-opus-5-5 |

## Diary corrections
History is never rewritten (NFR-12), so mistakes are recorded here instead.
- Commit 909df52 ("Record v2 architecture decisions…") also contains most of the BUG-1 camera-framing fix: `src/scene/cameras/poses.ts`, `SetCameraRig.tsx`, `KnobLayer.tsx` and `useCrtMaterial.ts`. The tech lead committed with `git commit -a` while the scene developer's work was still uncommitted. Commit b4ec64e completes the fix with the test hook and the handoff note. From now on the tech lead stages explicit paths only.
