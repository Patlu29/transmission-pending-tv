# 0009: Feasibility of live TV channels with channel changing (v2)

## Status
Proposed (2026-11-11). Feasibility study only; nothing is built. It needs user answers (end of this ADR) and v2 requirements from the product manager before it can be accepted. If accepted, it amends ADR 0002 (no backend), ADR 0005 (one screen source) and the v1 requirements NFR-7 (no runtime third-party requests), NFR-13 and FR-X3 (no real broadcaster marks), as noted per option.

## Context
User request for v2: "telecast the public TV channels from satellite connection and user can change the channels". v1 (the haunted-TV ghost story) is built and in QA, and must not be disturbed.

What v1 gives us today (from the handoffs, `docs/architecture.md` and `docs/performance-report.md`):

| Area | Current state | Relevance to v2 |
|---|---|---|
| Hosting | Static bundle, no backend (ADR 0002), relative `base: './'` (ADR 0007), public repo `Patlu29/transmission-pending-tv`; GitHub Pages is the likely host | Pages is HTTPS-only and cannot run a server |
| Screen | One teletext canvas wrapped in a `CanvasTexture` and fed to the CRT `ShaderMaterial` as `uMap` (ADR 0005) | A `VideoTexture` can take the same slot |
| Shader | `crt.frag.glsl` reads `uMap` as luminance (`dot(rgb, LUMA)`) and writes `vec3(lum)`, so its output is grey by construction. It also samples `uMap` at a mip level for glow (`uGlowLod`) and at LOD 3.5 for the ghost text mask | Video is desaturated for free. A raw `VideoTexture` has no mipmaps, so glow and the text mask would behave differently |
| 2D mode | `Screen2D` with `crt2d.css` (scanlines, vignette, static); no shader | Needs its own greyscale and flash answer |
| Stores | `displayStore` (mode, `reducedMotion`, `audio`, `screenCanvas` and `screenVersion`), `introStore` (story playback, diary, page digits), `hauntStore` (written only by the scheduler, including `knobCue` for `channel` and `volume`) | Channel state needs a new store, and the knob and digit inputs are already taken |
| TV body | Has a `knob-channel` node with picking | Natural channel-change control |
| Flash | Design spec section 7: no more than 3 flashes per second; large-area swing under 10 per cent relative luminance; design margin 5 per cent per 100 ms over about 87,000 px | Live footage is not authored by us, so it can break these limits |
| Audio | Off by default; an `AudioContext` is created only on unmute (FR-22) | Video sound must follow the same rule |
| Budgets | Initial JS 96.8 kB gzip; first view about 1.4 MB (3D) and 0.38 MB (2D) | Video must not count against the first view |
| Facts | Strict CI build; the intro uses `stack.list`, `git.commitCount` and others | A new dependency must not silently change the v1 intro |

## Options compared

Costs are indicative 2026 street prices in USD, not verified; the user should price them locally. Effort is in agent-days, excluding user time.

| | (A) Real satellite on the user's network | (B) Official broadcaster internet streams | (C) Openly licensed archive "channels" | (D) Hybrid: C by default, A as an opt-in local input |
|---|---|---|---|---|
| **Signal path** | Dish and LNB, then a DVB-S/S2 tuner (a SAT>IP server, or a USB tuner on a small PC running Tvheadend), then a relay that turns MPEG-TS into HLS or fMP4, then hls.js in the browser | The broadcaster's published HLS URL, played with hls.js (Safari plays HLS natively), or the broadcaster's own embed player | Public-domain or CC-licensed footage (for example from the Internet Archive), re-encoded to small greyscale H.264 MP4 and served from our own origin; a wall-clock schedule makes it feel "on air" | C as channels 2 to n on the public site; A shown only when the user configures a local relay address |
| **Hardware and cost** | Dish and LNB (if none) USD 50 to 200; SAT>IP box USD 100 to 300, or USB DVB-S2 tuner USD 50 to 150 plus a mini PC with a hardware H.264 encoder (for example Intel Quick Sync) USD 150 to 300. A Raspberry Pi 5 has no hardware H.264 encoder, so it cannot transcode MPEG-2 channels in real time reliably. Optional domain for HTTPS about USD 15 a year | None | None. Media stays within GitHub Pages limits (1 GB site; about 100 GB a month bandwidth, soft) | As C, plus A's hardware only for users who want it |
| **Backend need** | Yes, but on the user's hardware, not on the host: Tvheadend (or the SAT>IP box) plus ffmpeg or a media server (for example MediaMTX) to transcode MPEG-2 video and MP2 or AC-3 audio to H.264 and AAC, package HLS, and send CORS headers | No, unless the stream lacks CORS headers. A CORS proxy would make us a redistributor (rejected) | No | No for the public site; A's relay for opt-in users |
| **Hosting impact** | Pages is HTTPS: a page there cannot load `http://192.168.x.x` media (mixed content is blocked), and Chrome's Local Network Access asks permission before a public site reaches a private address. Either the relay gets real HTTPS (own domain or a tunnel) plus that permission, or a "local edition" of `dist/` is served from the relay box (ADR 0007's relative base makes that a copy, not a rebuild). It only works on that network unless the stream is exposed publicly | Static site unchanged, but every view makes runtime requests to third-party origins: breaks NFR-7 as written | Static site unchanged; media on the same origin. Large binaries need Git LFS plus an Actions-based Pages deploy (Pages does not serve LFS files from a branch), or a separate first-party media bucket | As C; the A path is unchanged |
| **Legal or rights exposure** | Receiving free-to-air channels for personal viewing is usually lawful. Streaming them beyond the home is retransmission, which needs rights in nearly every jurisdiction. Decrypting encrypted services is unlawful. Live channels show broadcaster logos and idents, which conflicts with FR-X3 and NFR-13 | Set by each broadcaster's terms. Many allow only their own player, forbid altering the picture (greyscale and CRT effects are alterations), geo-block, or use DRM. Aggregated "free IPTV" lists have unclear rights: do not use. Needs written permission or terms checked per channel | Low, if every item has a verified licence (CC0, Public Domain Mark, CC BY with attribution). Public-domain status varies by country, so record the evidence per item. Avoid footage containing broadcaster idents (FR-X3) | Low for the public site (C). A stays personal-use, on the user's network |
| **Latency** | Glass to glass: standard HLS 6 to 15 s, low-latency HLS 2 to 5 s, WebRTC under 1 s. Channel change 2 to 6 s (retune, lock, keyframe, first segment) | 10 to 40 s behind broadcast; channel change 1 to 5 s | Not live (scheduled playout). Channel change 0.5 to 1.5 s (seek to the nearest keyframe) | Per path |
| **Flash control** | Unknown content: runtime limiter only (see Rendering) | Unknown content: runtime limiter only, and DRM streams cannot be processed at all | Known content: analysed offline at build time, plus the runtime limiter. Strongest guarantee | C strong; A as A |
| **Captions (WCAG 2.2 AA, NFR-6)** | 1.2.4 needs live captions. DVB subtitles are often bitmaps or missing, so AA conformance is unlikely | Depends on the stream (WebVTT sometimes present) | Achievable: pick silent films (intertitles) and give each a text description (1.2.1), or add WebVTT captions we write | C conformant; A flagged as non-conformant opt-in |
| **New dependencies** | `hls.js` 1.7.4 (released 2026-10-28), lazy-loaded; maybe `mpegts.js` 1.8.2 instead of server-side HLS packaging | `hls.js` | None: `<video>` plays MP4 H.264 in every target browser | As C; `hls.js` only in the lazy local-input chunk |
| **Effort** | 8 to 12 agent-days plus a user hardware and setup weekend; ongoing support for one home network | 3 to 5 agent-days, plus open-ended rights work; fragile, because URLs and terms change without notice | 5 to 7 agent-days, plus curation time | 7 to 9 agent-days for C plus the local-input hook; full A is later work |

## Rendering (applies to every option)

### Video into the CRT shader
- Create a hidden `<video>` element (`playsinline`, `muted`, `crossOrigin="anonymous"`), kept in the DOM, and wrap it in `THREE.VideoTexture` (three 0.187 updates it through `requestVideoFrameCallback`).
- **Add a pre-pass rather than feeding video straight into `uMap`.** Video goes into a small luminance render target at source resolution (for example 640 x 480, `R8`, mipmaps on), and `uMap` points at that target's texture. This gives:
  1. Greyscale at the source, so the shader's luminance read stays exact.
  2. Mipmaps, so `uGlowLod` and the LOD 3.5 ghost text mask keep working unchanged.
  3. A place for the flash limiter (below).
  4. A place to composite an on-screen channel number from the teletext canvas.
- **Desaturation.** The pre-pass and the shader both reduce to luminance, so FR-2 holds by construction in 3D. In 2D, use CSS `filter: grayscale(1)` on the `<video>`. Each output channel is the same weighted sum, so R = G = B (QA re-samples as today).
- **CORS.** WebGL refuses cross-origin video without CORS: the media and every HLS segment need `Access-Control-Allow-Origin`. Same-origin media (option C) avoids the issue.
- **DRM.** Encrypted (EME) video cannot be uploaded to WebGL at all, and on some platforms CSS filters are not applied to it. DRM channels can never go through the CRT shader or be desaturated reliably, so they are out of scope.
- **Frame loop.** Video needs continuous frames while a video channel is on. Cap rendering at the video frame rate (25 or 30 FPS), keep `AdaptiveDpr`, and pause when the tab is hidden.
- **Haunt effects.** The ghost, roll and haunt vignette must be zeroed on video channels. The haunt scheduler only runs during the story on channel 1.

### Flash limiter (WCAG 2.3.1)
- **Feasible, and cheap.** In the pre-pass, keep the previous displayed luminance in a ping-pong render target and clamp each texel's change per frame: `out = prev + clamp(cur - prev, -r * dt, +r * dt)`, using real frame time. Choose the rate `r` so a 10 per cent relative-luminance swing takes at least about 0.35 s. Then a flash (a rise and a fall) needs at least 0.7 s, which caps the output well under 3 flashes per second for every pixel, so also for every region. The design-spec margin (5 per cent per 100 ms over large areas) is met as a by-product. Cost: two extra fetches at 640 x 480, negligible next to the CRT pass.
- **Visible cost.** Hard cuts become soft fades of about 0.3 s, and fast bright motion leaves short trails. On a "1970s CRT" this reads as phosphor persistence, so it suits the look, but the ux-ui-designer should approve it.
- **How strong the guarantee is.** It is a mathematical bound on the luminance the screen shader outputs, which is stronger than a heuristic detector. It is **not** a certified test (such as a Harding or PEAT pass) and does not cover:
  - the 3D room light driven by screen luminance (already low-passed at 2 Hz, so it should be bounded too, but it must be measured);
  - the 2D path, where the `<video>` element is shown by the browser and our shader never runs;
  - spatial-pattern risk (high-contrast stripes), which 2.3.1 does not cover but broadcast guidelines do;
  - pauses: after a dropped or paused stretch, the limiter must continue from its last state and must not jump.
- **Recommended policy:**
  - In 3D, live sources (A and B) play only through the limiter.
  - In 2D, only content cleared offline (C) may play. Live sources show a "no signal" card.
  - Under Calm, video does not auto-start; the visitor presses Play, and the limiter rate is halved.
  - C clips are also analysed at build time: a per-frame luminance pass with ffmpeg over a block grid, and any failure stops the build.

### Autoplay and sound
- Start playback inside the Power or channel-change click handler (user activation), not with the `autoplay` attribute. All target browsers then allow it, including iOS Low Power Mode, which blocks even muted autoplay.
- Video is **muted by default**. The existing Sound key (`displayStore.audio`) unmutes the video and the synthesised hum together, as FR-22 requires.
- Chrome may pause muted media that is off-screen. Keep the video element attached, sized 1 px with zero opacity, not `display: none`, and re-call `play()` on `visibilitychange`.

### Channel state (new store; frontend-developer)
A new `channelStore` leaves `introStore`, `displayStore` and `hauntStore` unchanged:

```ts
channels: ChannelDef[]            // from the generated lineup (see Facts)
current: number                   // 1 = the v1 haunted story, unchanged
tuning: 'locked' | 'tuning' | 'no-signal' | 'error' | 'blocked'   // blocked = policy (2D, Calm, DRM)
pendingDigits: string             // channel-number entry
setChannel(n), channelUp(), channelDown(), typeChannelDigit(d)
```

- `displayStore` gains `screenSource: 'teletext' | 'video'`. The scene swaps `uMap` between the teletext texture and the video pre-pass when it changes.
- Leaving channel 1 calls the existing `power`/`skip` paths and pauses the story. Returning resumes, or replays, as the ux-ui-designer decides.
- The tuning wait shows the FR-23 static burst (250 ms, flash-rule compliant), then the test card with `TUNING...` until the first decoded frame (`loadeddata`), then the picture.

Input conflicts to resolve in design:
- Digits already enter teletext page numbers (P100 diary), so channel entry needs its own mode or key (for example `C` then digits, or PageUp and PageDown).
- `hauntStore.knobCue` turns the `knob-channel` during the story. That turn must stay cosmetic, and channel changes stay locked while the story plays on channel 1.

### Fact pipeline and strict CI
- **The v1 intro stays byte-for-byte the same** unless we choose otherwise:
  - Do not add `hls.js` to `STACK_PACKAGES`; `stack.list` is in the intro.
  - Do not upgrade the seven listed packages on the v2 branch without accepting an intro change.
  - `git.commitCount` changes with every commit by design ("as of commit").
- **New, build-validated lineup** (`src/content/channels.json`, ux-ui-designer and tech lead):
  - Each entry has a number, name, kind (`story`, `archive`, `local`), source, licence (allow-list: CC0, Public Domain Mark, CC BY), evidence URL, attribution, file checksum, duration and flash-analysis result.
  - `scripts/facts/` (architect) validates the lineup the same way it validates the template, and emits `src/generated/channels.ts`.
  - Strict CI stops on a missing licence, a failed or missing flash analysis, a checksum mismatch, or a `local` channel with a hard-coded private address.
- **No network at build.** Strict CI must stay reproducible (NFR-9), so it never fetches streams or archive items. Media is fetched once, checksummed and committed (LFS) or uploaded to the first-party bucket. CI only verifies checksums.
- **New facts** (for example the channel count, or total archive minutes) come from the lineup and use the same `{{ }}` rules. They appear only if v2 copy uses them.
- **First-view budget:** the channel UI and the video pre-pass are a lazy chunk loaded on the first channel change, so v1's 96.8 kB initial JS and 5 MB first view are unchanged.

## Recommendation
**Option D, delivered in phases, starting with C.**

- C gives the user what is actually achievable on a public static site: a 1970s set whose channel knob really changes channels, showing real black-and-white broadcast-era footage, legally, with a strong flash guarantee, and with no backend or running cost.
- A is the only way to get the literal "from satellite connection". It is feasible, but only on the user's own network and for personal viewing. It needs hardware, a relay and HTTPS work, and it cannot meet the captions requirement. So it should be an opt-in local input, not the public product.
- B is not recommended. Its rights and CORS position must be re-checked per channel, DRM blocks the shader, and the URLs break without notice. Revisit only if the user has written permission from a specific broadcaster.

| Phase | Work | Agents |
|---|---|---|
| 0. Freeze v1 | Tag the QA-passed v1 commit and build v2 on a branch. All v1 tests stay green in v2 CI | tech lead, qa-engineer |
| 1. Requirements | v2 requirements and stories: lineup size, schedule, captions and description policy, flash policy, channel inputs, amendments to NFR-7, FR-X3, NFR-13 and ADR 0002 | product-manager (with these user answers) |
| 2. Architecture | Accept this ADR; amend ADR 0005 (two screen sources) and add a lineup schema and validator to `scripts/facts/`; LFS or media-bucket decision with devops | architect, devops-engineer |
| 3. Design | Channel input model (knob, keys, touch, digits without the P100 clash), OSD, tuning states, story-to-channel transitions, limiter look sign-off | ux-ui-designer |
| 4a. Content | Curate 3 to 5 archive items, verify licences, encode greyscale 480p H.264 (about 300 to 500 kbps), write descriptions or captions, run the offline flash analysis | technical-artist (encode and analysis), ux-ui-designer (descriptions), user (licence sign-off) |
| 4b. Build | `channelStore`, input wiring, scheduled playout, Sound integration | frontend-developer |
| 4c. Build | Video pre-pass (luminance, mipmaps, limiter, OSD composite), `uMap` switching, haunt zeroing on video | technical-artist (pass and shader), scene-developer (texture lifecycle, frame cap, knob) |
| 5. Performance | Video plus pre-pass on a real mid-range phone (30 FPS), memory, battery | performance-optimiser |
| 6. QA | Greyscale sampling on video frames, flash frame analysis with deliberately flashing test clips through the limiter, autoplay on iOS and Android, v1 regression | qa-engineer |
| 7. Delivery | LFS-aware Actions deploy or media bucket, range-request and caching headers | devops-engineer |
| 8. Optional: local satellite input (A) | Relay recipe (Tvheadend, ffmpeg or MediaMTX, HTTPS, CORS), a `local` lineup entry configured at run time, Local Network Access handling, a "local edition" build. User sets up the hardware | architect (recipe), devops-engineer, frontend-developer, user |

## Consequences
- If accepted: the site stays static on the public host. A user-run relay appears only in option A, and only on the user's network. ADR 0002 gains that exception.
- The screen gets a second source and a pre-pass. The CRT shader itself barely changes.
- New legal duties: licence evidence per clip, and no broadcaster marks.
- Media storage moves the deploy to Actions with LFS (or a bucket), which devops must set up.
- The flash guarantee for video is a computed bound, not a certification. It must be stated that way in v2 docs.

## Questions only the user can answer
1. **Literal satellite or the feeling of it?** Is "from satellite connection" a hard requirement (option A, hardware on your network, works only there), or is a convincing set of channels on the public site enough (option C)?
2. **If satellite:** do you have a dish, and which satellite or service do you receive? Your commit timestamps are +05:30, so if you are in India, DD Free Dish is the free-to-air platform to check. Will you buy and run a tuner box and a small always-on PC, and is personal, home-network-only viewing acceptable?
3. **Public exposure:** do you accept that live satellite channels must never be streamed from the public site (retransmission rights), and that the public site would show archive channels only?
4. **Broadcaster streams (B):** do you have, or want to seek, written permission from a specific broadcaster? Without it, B is excluded.
5. **Rules v1 set:** may v2 relax "no runtime third-party requests" (NFR-7) and "no real broadcaster marks" (FR-X3, NFR-13)? Live channels cannot meet the second.
6. **Accessibility:** is an opt-in local live input acceptable even though it cannot meet WCAG 2.2 AA live captions, provided the public channels do?
7. **Look and safety:** do you accept the flash limiter's soft cuts and motion trails on video, and that 2D mode and Calm mode play only pre-checked archive content (Calm only on request)?
8. **Content and budget:** how many channels, and how many minutes of footage are you willing to host? Are you willing to approve licence evidence per clip yourself?
