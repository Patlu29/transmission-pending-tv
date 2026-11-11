# Handoff: product-manager

## Change 2026-11-11: v2 design approved (Mountain sky and review of design-spec-v2 copy)
- v2-environments.md updated with a changelog: ninth room Mountain sky (V2-FR-35), all nine rooms kept (cut-to-four fallback superseded), TV colour-era tint for live channels (V2-FR-36), optional room sound (V2-FR-37), 24 px keep-out (V2-FR-38), site-drawn Calm card with no YouTube thumbnails (V2-FR-29), playlist links rejected (V2-FR-7), DD and Sansad TV disabled until the user confirms the email is sent (V2-FR-11, Q-V2-1 resolved), US-15 added.
- Review of docs/design-spec-v2.md (Q-D6). I did not edit that file; the owner is the ux-ui-designer. Requested changes:
  1. Privacy copy 6.3 and 6.2 table: remove the i.ytimg.com row and the "thumbnails" wording, since no thumbnails are requested. Keep only youtube.com and youtube-nocookie.com as contacted origins.
  2. Privacy copy: add one line, "This site is not affiliated with or endorsed by YouTube, Prasar Bharati, Doordarshan, Sansad TV or any channel listed." Add a line that room sound is made in your browser and downloads nothing.
  3. Privacy copy "Channels" paragraph and the OFFICIAL EMBED tag (guide 1.4, Credits): the sentence about Doordarshan and Sansad TV must appear only while those entries are enabled. "OFFICIAL EMBED" could read as an official partnership, so rename the tag to "VIA YOUTUBE EMBED" (or drop it), and keep the tooltip "shown through the channel's official YouTube embed, not endorsed by the broadcaster".
  4. Guide help text and validation (1.5): the help text is correct for the playlist decision; keep "Watch, live, youtu.be or embed links only" and the playlist/channel message. Note V2-FR-7 now says single videos only, which matches the spec (Q-D3 can close).
  5. Session storage: privacy copy says choices are kept in session storage for the visit; this fits V2-FR-24 (no cookies). Keep.
  6. Calm card: spec already uses a site-drawn card; confirm no ytimg request in Calm, and the note on ytimg in 6.2 can go.
  7. "Sets no cookies" in the privacy copy refers to this site; keep the next sentences that say YouTube may set cookies.
  8. Mountain sky and the TV tint need entries in the design spec (room table, 24 px keep-out, tint rule: Colour on only, live channels only, not channel 0).

## v2 pivot: environments and YouTube (2026-11-11, earlier)
- New file docs/requirements/v2-environments.md is the v2 source of truth. docs/requirements/v2-live-channels.md is marked SUPERSEDED. v1 files untouched.
- Content: decisions D1 to D9; 12 conflicts (C1 to C12); V2-FR-1 to V2-FR-34; 15 YouTube compliance rules (V2-YT-1 to V2-YT-15); V2-NFR-1 to V2-NFR-9; legal L1 to L8; stories V2-US-1 to V2-US-14; Appendix A is the draft permission email (not sent).
- Amendments: NFR-7 becomes an allow-list (youtube.com, youtube-nocookie.com, ytimg.com) loaded only after the viewer picks a channel and accepts the notice. FR-2 and FR-3 apply to channel 0, the UI and the 1970s TV surround; video is never filtered. NFR-8 kept for the runtime site; the scheduled Action is build-time only.
- Dropped: archive channels, private login backend, tuner relay, runtime brightness limiter.
- Open questions: Q-V2-1 DD/Sansad TV before or after the permission reply; Q-V2-2 who creates the Data API key and the accepted refresh schedule given quota.
- Requests: architect, CSS3D placement with no overlay, youtube-nocookie host option, Referrer-Policy on the chosen host, quota-safe refresh job, per-environment size caps, supersede ADR 0009 and 0010; ux-ui-designer, eight environments with the player clear, focus mode, error pages, notice, privacy and credits pages; technical-artist, environment art with fake light spill that never flashes; frontend-developer, paste-a-link parsing, error handling for 100, 101/150 and 153; qa-engineer, no-overlap and no-filter checks per environment; devops-engineer, scheduled Action, secret scan, header or meta tag.
- Risks: eight environments is a lot for one release (cut to four if needed); YouTube terms and Prasar Bharati permission are outside the team's control.

## v2 finalised (earlier plan, superseded)
- docs/requirements/v2-live-channels.md rewritten as final scope: "Public archive + private backend". Public: channel 0 plus 3 to 5 openly licensed archive channels on a clock schedule. Private: login-only household relay of the user's own tuner (DD Free Dish), never on the public site.
- Resolved Q-V2-1 to Q-V2-4. Colour/B&W switch (V2-FR-12) amends FR-2 for v2 video only. Runtime limiter accepted; Calm and 2D play only pre-checked clips. Channel 0 is the Occupant.
- Conflicts C1 to C10 updated: NFR-7 and NFR-8 apply to the public build; the private build is a separate deployment target.
- New: V2-FR-1 to V2-FR-38, V2-NFR-1 to V2-NFR-8, L1 to L6, stories V2-US-1 to V2-US-11.
- Remaining open questions: Q-V2-5 archive footage themes (user approves each clip), Q-V2-6 private hosting and VPN.
- Requests: architect, relay, auth, limiter, clock-schedule design, CI check that the public bundle holds no relay trace; devops-engineer, secret scan and two deployment targets; technical-artist, colour switch look and per-clip flash check.

## v2 planning (live channels, earlier draft, superseded)
- New file: docs/requirements/v2-live-channels.md. v1 requirement files were not touched.
- Content: goals, fit with v1 (Occupant's story as channel 0), 10 listed conflicts with v1 requirements (C1 to C10), legal constraints (L1 to L7), V2-FR-1 to V2-FR-20, V2-NFR-1 to V2-NFR-7, stories V2-US-1 to V2-US-8, story map.
- Blocking open questions: Q-V2-1 signal source, Q-V2-2 public site or local build, Q-V2-3 region, Q-V2-4 greyscale video.
- Requests: architect, say whether a flash-reduction filter is feasible (V2-FR-12) and whether any source needs a backend (C1); devops-engineer, CI check for credentials and for channel-list fields (V2-NFR-4, V2-NFR-6).
- Risk: rights. The team gives no legal advice; the user must confirm each source.

## Change 2026-11-10: ghost story
- Scope: the intro is now a horror ghost story, "Haunted TV tells its build". The ghost narrates its own making; the real-facts pipeline (FR-9 to FR-14) and "as of commit" wording are unchanged.
- Changed: FR-1 (power off with CRT collapse), FR-4 (Bedstead, VT323 fallback), FR-7 (now Must: 3D set desktop, screen-filling mobile), FR-8, FR-12 (adds tool, plugin, model), FR-17 (Calm mode), FR-19, NFR-1, US-1, US-4, US-9.
- New: FR-24 to FR-35 (content note, haunted text, ghost figure, haunted set, camera creep, no jump scares, Calm switch, DOM transcript with `data-fact` spans, story structure, mobile scaling, audio); US-18 to US-23 in epic E6; FR-X7, FR-X8 out of scope.
- Resolved: Q1, Q3, Q4, Q5. Remaining open: Q2 (kept as "as of commit"), Q6 host or URL, Q7 ghost name (default nameless).
- Requests: architect, define an effects budget and a Calm-mode render path; technical-artist, design an original ghost and slow, flash-safe effects; scene-developer, knobs, light dim, camera creep; frontend-developer, DOM transcript with `data-fact` spans and a Calm switch that persists for the visit; qa-engineer, check that settled text equals resolved facts, flash limits, and no-jump-scare timing (300 ms).
- Risk: ten-plus Musts including four animation types. FR-28 and FR-29 are the first to drop to Should if performance (NFR-1) is at risk.

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
