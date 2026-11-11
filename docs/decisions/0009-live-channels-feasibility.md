# 0009: Channels for v2: public archive channels and a private satellite relay

## Status
Superseded by 0011 (2026-11-11). The user replaced the archive and private-relay plan with a multi-environment player for official YouTube embeds; see `0011-environment-player.md`. Nothing in this ADR was built. Kept for the record.

Previously: Accepted (2026-11-11). It replaces the Proposed feasibility version of the same date.

It amends three earlier decisions:
- ADR 0002 (no backend): adds a separate private deployment target, specified in ADR 0010. The public site stays static.
- ADR 0005 (one screen source): adds a second source, video, through a pre-pass.
- v1 FR-2 (everything greyscale): colour is allowed only inside the video picture, and only when the visitor turns the Colour switch on.

## Context
User request for v2: "telecast the public TV channels from satellite connection and user can change the channels".

The user's decisions (final, 2026-11-11):

| Topic | Decision |
|---|---|
| Sequencing | v1 ships first: QA fixes, delivery and a `v1.0` tag. v2 is then built on a branch |
| Shape | "Public archive + private backend" (option D of the feasibility study). (a) The public static site gets channel 0 (the Occupant, unchanged) plus 3 to 5 openly licensed archive channels played out on a clock schedule. (b) A private, login-only backend for the household, on the user's own always-on machine next to their existing SAT>IP box or PC tuner, relays DD Free Dish free-to-air channels as HLS for personal viewing. It is reachable only on the home network or over a private VPN, and is never exposed to the public internet |
| Separation | The public build contains no relay code paths. The private build is a separate deployment target |
| Colour | A Colour/B&W switch, default B&W. Only the video can be colour, through the pre-pass; the chrome stays greyscale |
| Flash | The runtime limiter is accepted. Calm and 2D modes play pre-checked clips only |
| Channel 0 | The Occupant |

What v1 provides (from the handoffs, `docs/architecture.md` and `docs/performance-report.md`):
- **Screen:** one teletext `CanvasTexture` drives `uMap` of the CRT `ShaderMaterial`. The shader reads `uMap` as luminance, writes `vec3(lum)`, and samples mip levels for glow (`uGlowLod`) and for the ghost text mask (LOD 3.5).
- **2D mode:** `Screen2D` with `crt2d.css`, and no shader.
- **Stores:** `displayStore`, `introStore`, `hauntStore` (whose `knobCue` already turns `knob-channel`).
- **Budgets:** initial JS 96.8 kB gzip; first view about 1.4 MB.
- **Flash rules:** design spec section 7.
- **Facts:** strict CI build, with an intro that uses `stack.list` and `agents.roles`.

## Decision

### 1. Two deployment targets from one repo

| | Public site | Private relay (ADR 0010) |
|---|---|---|
| Built by | `npm run build` (no `VITE_RELAY`) | `VITE_RELAY=1` build, packaged with `server/` |
| Hosted on | The static host (GitHub Pages expected), relative base (ADR 0007) | The household's always-on machine, behind Tailscale HTTPS |
| Channels | 0 (the Occupant) and 1 to 5 (archive) | 0 to 5 as public, plus live channels from 10 upward |
| Backend | None | Fastify relay fronting Tvheadend and MediaMTX |
| Relay code | Absent, and CI proves it (ADR 0010) | Present |

Live channels start at 10, so archive channel numbers stay the same in both builds.

### 2. Archive channels (public and private)
- **Sources:** 3 to 5 channels of footage with a verified open licence: CC0, Public Domain Mark, or CC BY with attribution, for example items from the Internet Archive. Each clip has evidence recorded (source URL, licence URL, date checked, jurisdiction note). No footage that shows broadcaster idents or logos (FR-X3 stays in force).
- **Encoding:** H.264 Main in MP4 with `faststart`, 640 x 480 (4:3) or source aspect, about 400 kbps. Colour is kept when the source has it (the switch decides what is shown). Audio is optional: AAC 64 kbps mono, or none for silent films. About 0.18 GB per hour.
- **Playout:** wall-clock scheduling. `position = (now - epoch) mod loopLength` per channel, so every visitor sees the same "broadcast" with no backend. A channel change seeks to that position. GitHub Pages answers byte-range requests (checked: `206`, `accept-ranges: bytes`), so plain MP4 seeking works and the public site needs no HLS library.
- **Lineup:** `src/content/channels.json` (technical-artist, with labels from the ux-ui-designer). It holds number, label, clip file, sha256, size, duration, licence, evidence URL, attribution, captions or description file, and the flash-analysis result.
- **Accessibility:** each clip has a text description (WCAG 1.2.1), or WebVTT captions if it has speech (1.2.2). Both are shown in the DOM transcript.

### 3. Media hosting: Git LFS with an Actions deploy to Pages

| | Git LFS plus Actions Pages deploy (chosen) | Media bucket on a separate origin |
|---|---|---|
| Origin | Same as the site, so there is no CORS setup, no NFR-7 change and the relative base works | Second origin: CORS rules needed for WebGL, and a NFR-7 amendment plus disclosure |
| Versioning | Media is pinned to the commit, consistent with "as of commit" | Outside git; needs content-addressed names to stay reproducible |
| Limits (GitHub docs, checked 2026-11-11) | GitHub Free: LFS 10 GiB storage and 10 GiB bandwidth a month. Pages: published site at most 1 GB, soft 100 GB a month, deploys time out after 10 minutes | Effectively none at this size |
| Cost | USD 0 a month within the budget below | Provider fees plus a custom domain (about USD 10 to 15 a year); not needed now |

- **Budget:** archive media at most **600 MB in total**, which is about 3.3 hours across all channels (for example 5 x 40-minute loops). That leaves the Pages 1 GB site limit with room for the app and new versions. Every pushed version of an LFS file counts towards storage, so re-encodes must be deliberate: at most 5 full catalogue versions within 10 GiB.
- **Bandwidth control:**
  - CI caches LFS objects (`actions/cache`, keyed on the LFS object ids), so a deploy normally downloads nothing.
  - Developers clone with `GIT_LFS_SKIP_SMUDGE=1` unless they work on media.
  - Visitors download from Pages, not LFS, so their viewing never touches the LFS quota.
- **Fail loudly:** with no payment method on file, exceeding the LFS bandwidth quota disables LFS for the month, and checkouts get pointer files. The build checks every clip's size and sha256 against the lineup and refuses LFS pointer text, so a pointer is never published as an `.mp4`.
- **Cost recorded:** USD 0 a month at the planned size. Revisit, and move to a bucket under a domain we own, if the catalogue grows past 600 MB or Pages traffic nears 100 GB a month (about 2,500 ten-minute viewing sessions).

### 4. Rendering

**Video pre-pass (technical-artist).** A hidden `<video>` (`playsinline`, `muted`, kept in the DOM at 1 px with zero opacity, never `display: none`) feeds a `THREE.VideoTexture`. One pre-pass renders it into a small ping-pong render target at source resolution (about 640 x 480, RGBA8, mipmaps on), and the CRT material's `uMap` points at that output. The pre-pass:
1. applies the Colour/B&W choice (B&W writes luminance to all three channels);
2. runs the flash limiter;
3. composites the on-screen channel number from the teletext canvas;
4. provides the mipmaps that `uGlowLod` and the ghost text mask need.

**CRT shader change (technical-artist).**
- A new uniform `uColour` (0 or 1): `picRGB = mix(vec3(pic), rgb, uColour)`, and the existing effects (grain, glow, bar, vignette) stay grey and additive.
- `uColour` is forced to 0 whenever the screen shows the teletext canvas (channel 0, guide, test card, "no signal"), and the ghost, roll and haunt vignette are forced to 0 on video.
- Bezel, room, dock and every UI element stay greyscale in all states.

**Greyscale test (qa-engineer).** In B&W (the default) the whole frame stays R = G = B within 2 levels, exactly as v1. With Colour on, the same holds everywhere outside the screen picture.

**2D mode.** The archive `<video>` is shown directly with `crt2d.css`, plus CSS `filter: grayscale(1)` unless Colour is on. Every output channel is then the same weighted sum, so B&W is exact. Live channels are not available in 2D (see Flash).

**Frame loop.** Render continuously only while a video channel plays, capped at the video frame rate (25 or 30 FPS). Keep `AdaptiveDpr`. Pause when the tab is hidden. V2-NFR-2's order applies: drop video resolution before removing effects.

**Same-origin media.** Archive clips are on the site's own origin; live HLS is on the relay's own origin. WebGL therefore never meets cross-origin video, and no DRM content exists in either build.

### 5. Flash safety (WCAG 2.3.1)
- **Limiter (accepted).** For each texel, in linear RGB, the limiter clamps the change per frame: `out = prev + clamp(cur - prev, -r * dt, +r * dt)`.
  - It uses real frame time and carries its state across dropped or paused frames, never jumping.
  - Each channel is limited separately, so the bound covers relative luminance (a weighted sum of the channels) and the saturated-red rule that colour mode brings in.
  - `r` is chosen so a 10 per cent relative-luminance swing takes at least 0.35 s. Any flash pair then takes at least 0.7 s, which keeps every pixel, and so every region, under 3 flashes a second and inside the design-spec margin.
  - On a channel change the limiter is reset to the static frame, so the picture fades in under the same limit.
- **Guarantee statement for v2 documents:** "a computed upper bound on the screen's output, not a certified flash test". It does not cover:
  - the room light (already 2 Hz low-passed; QA measures it with video);
  - the 2D `<video>` path;
  - spatial patterns.
- **Policy (accepted):**
  - Live channels play only in 3D modes, through the limiter.
  - Calm mode and 2D mode play pre-checked archive clips only, and under Calm only after the visitor presses "tune in" (V2-FR-11). A live channel in Calm or 2D shows a "no signal" page with the reason and a one-action way back.
  - Archive clips are analysed offline when curated: ffmpeg frame luminance and red-ratio over the 87,000 px block grid of the design spec, section 7. The result is recorded against the clip's sha256. CI checks that the record matches the file, and re-runs the analysis only for clips whose sha256 changed.
- **Look:** cuts become soft fades of about 0.3 s, and fast bright motion leaves short trails, read as phosphor persistence. The ux-ui-designer sets `r` within the bound.

### 6. Autoplay and sound
- Playback starts inside the Power or channel-change click handler (user activation), not with the `autoplay` attribute. This works in every target browser, including iOS Low Power Mode.
- Video is muted by default. The existing Sound key (`displayStore.audio`) unmutes video and the synthesised hum together (FR-22, V2-FR-7).
- `play()` is called again on `visibilitychange`, because Chrome may pause muted media it considers off-screen.

### 7. State (frontend-developer)

```ts
// src/state/channelStore.ts (new)
channels: ChannelDef[]      // archive lineup from src/generated; live entries added at run time (private build only)
current: number             // 0 = the Occupant; default on power-on (V2-FR-4)
tuning: 'locked' | 'tuning' | 'no-signal' | 'blocked' | 'busy' | 'signed-out' | 'error'
                            // blocked: Calm, 2D or policy; busy: no free tuner; signed-out: relay session expired
pendingDigits: string
setChannel(n), channelUp(), channelDown(), typeChannelDigit(d), backToZero()
```

- `displayStore` gains:
  - `screenSource: 'teletext' | 'video'`. The scene swaps `uMap` between the teletext texture and the pre-pass output when it changes.
  - `colour: 'bw' | 'colour'`, default `'bw'`, kept for the visit only, with no storage.
- `introStore` and `hauntStore` keep their shapes. Leaving channel 0 pauses the story; returning resumes or replays it, as the ux-ui-designer decides.
- During a channel change the screen shows the FR-23 static burst (within the flash rules), then the test card with `TUNING...` until `loadeddata`, then the picture.

Input rules:
- Channel digits must not collide with P100 page digits (the ux-ui-designer chooses a channel-entry key or mode).
- Channel changes are locked while the story plays on channel 0.
- The haunt `knobCue` on `knob-channel` stays cosmetic.

### 8. Fact pipeline and strict CI
- **Channel 0 stays truthful, and its template does not change.**
  - `hls.js` (private build only) is never added to `STACK_PACKAGES`.
  - `server/` is a separate npm project with its own lockfile, not a workspace, so root stack facts are untouched.
  - `agents.roles` will truthfully gain "backend developer" once that agent writes a handoff; v1's duration model already allows for 10 roles (71.1 s worst case).
- **Lineup validator** (`scripts/facts/`, architect):
  - Checks every archive entry against an allowed licence list, with evidence fields present.
  - Checks file size and sha256, and refuses an LFS pointer.
  - Checks a flash record exists, matches the sha256 and is a pass.
  - Checks a description or captions file exists.
  - Emits `src/generated/channels.ts`. In strict mode any failure stops the build.
  - Any new facts (for example the channel count) follow the existing `{{ }}` rules.
- **No network at build** (NFR-9): CI never fetches clips or streams; it only verifies them.
- **Budget:** the channel UI and video pre-pass are a lazy chunk loaded on the first channel change. v1's initial JS and first view are unchanged, and no media is requested before the visitor tunes (V2-NFR-3).

### 9. Options considered

| Option | Outcome |
|---|---|
| (A) Real satellite path | Adopted, but private only, as the relay backend (ADR 0010). It can never be public: retransmission rights, broadcaster marks, and live captions not achievable |
| (B) Broadcaster internet streams | Rejected: per-channel terms usually forbid altering the picture; frequent DRM, CORS and geo-blocking; URLs that break without notice |
| (C) Openly licensed archive | Adopted for both builds |
| (D) Hybrid | Adopted as the shape above |

## Consequences
- The public site stays static, free and same-origin. Archive channels make the channel knob real for every visitor without legal exposure.
- The satellite feature exists only inside the household, through a separately deployed relay (ADR 0010). The public bundle provably contains none of it.
- The CRT shader gains a colour path and a pre-pass. Greyscale remains the default and is enforced everywhere outside the video picture.
- Deploys move to an Actions workflow with LFS and a cache. Media size is capped at 600 MB, and over-quota situations fail the build instead of publishing pointers.
- The flash guarantee for live video is a computed bound and is documented as such. Calm and 2D never show live content.
- v1 is untouched until it is tagged. v2 work happens on a branch, with the v1 test suite kept green.
