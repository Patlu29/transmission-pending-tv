# 0011: v2 as a multi-environment player for official YouTube embeds

## Status
Accepted (2026-11-11). Supersedes ADR 0009 and ADR 0010.

Amends:
- ADR 0005 (screen content): channel 0 keeps the teletext/CRT pipeline, and other channels use a DOM player.
- ADR 0008 (presentation modes): adds environments and a focus mode.
- v1 NFR-7 (no third-party requests): now applies until a channel is picked; see section 6.

Implementation starts after the `v1.0` tag, on the v2 branch.

## Context
The user replaced the archive and private-relay plan (`docs/project-status.md`, v2 pivot and approval, 2026-11-11). v2 is a player for **official third-party embeds**: in practice the **YouTube IFrame Player only** (`docs/research/embeddable-channels.md`).
- **Sources:** a curated guide of channels stored by channel ID, plus paste-a-link.
- **Eight environments:**
  1. the 1970s TV room (channel 0 is the Occupant, unchanged)
  2. cinema
  3. car or drive-in
  4. open air
  5. rainy-night bedroom
  6. chai stall with cricket
  7. train window seat
  8. space deck
- **Colour/B&W** changes the environment only. The YouTube player is never filtered or overlaid.
- **Live video IDs** are resolved by a scheduled GitHub Action that holds a YouTube Data API key as a secret, and the channel-guide JSON is published with the static site. There is no backend.

Hard constraints from the research:
- **Nothing may be drawn over the player**, and the player may not be modified: no CSS filter, no scanlines.
- **Size:** at least 200 x 200 px (480 x 270 or larger recommended), with controls visible.
- **Autoplay:** only when more than 50 per cent of the player is visible, and only one autoplaying player per page.
- **Referer:** must be sent (`strict-origin-when-cross-origin`). Errors 100, 101/150 and 153 must be handled.
- **Pixels:** a cross-origin iframe can never be a WebGL texture.
- `embed/live_stream?channel=` is unreliable. Resolve video IDs with the Data API (`search.list` costs 100 units) and check `status.embeddable`.
- **Geography:** availability was tested from India only, so errors must be detected at run time.

## Decision

### 1. Compositing: a face-on DOM player above the canvas, with no hole

| Approach | How it works | Verdict |
|---|---|---|
| `CSS3DRenderer` plus a depth-mask hole | A second renderer places the iframe with `matrix3d` behind a transparent WebGL canvas. An invisible "hole" mesh writes alpha 0, so the iframe shows through, and closer WebGL geometry hides parts of it | Rejected. The hole exists so WebGL can cover parts of the iframe, which is exactly what the no-overlay rule forbids. Other problems: an alpha canvas; any later transparent object or post-effect paints over the player; oblique `matrix3d` iframes render blurry and hit-test badly in Firefox; and a perspective skew is arguably a modification of the player |
| drei `<Html transform occlude="blending">` | The same hole technique. drei also sets the whole canvas to `pointer-events: none` with a high `z-index`, and rewrites the iframe's `matrix3d` every frame | Rejected, for the same reasons. It also breaks v1's canvas input (knobs, orbit) globally |
| **Projected 2D overlay (chosen)** | When a channel plays, the camera settles into a **watch pose** that faces the screen anchor head-on. The anchor's four corners are projected to an axis-aligned CSS rectangle. One iframe is positioned with plain `left`, `top`, `width` and `height` in a DOM layer **above** the canvas | Chosen. Stacking order guarantees nothing WebGL can ever be in front. No alpha canvas, no 3D transform on the iframe, no per-frame DOM work |

**Guarantee that nothing covers the player:**
1. **Stacking.** The player layer is a sibling above the `<canvas>` in the stage. WebGL output cannot paint over a DOM element stacked above it, whatever the scene draws.
2. **Face-on check.** `ScreenProjector` mounts or shows the iframe only if the projected corners form an axis-aligned rectangle within 1 CSS px, entirely inside the viewport. Otherwise the player stays hidden and paused.
3. **No modifying ancestors.** No ancestor of the iframe may have `filter`, `opacity` below 1, `mix-blend-mode`, `mask`, `clip-path` or a 3D `transform`. Colour/B&W is applied to the canvas element only (section 2).
4. **No DOM overlap.** The dock, notices and HUD are laid out outside the player rectangle. QA checks this two ways:
   - a 10 x 10 grid of `document.elementsFromPoint` samples over the rectangle, where the topmost hit must be the iframe;
   - the computed styles of the iframe's ancestors, checked against rule 3.
5. **Design rule.** No environment places geometry between the watch-pose camera and the screen. With rules 1 and 2 this cannot fail visibly, but it keeps scenes honest; for example, the drive-in windscreen is clear over the screen.

**Camera.** The watch pose is static: no creep, no parallax, no orbit. Life comes from the surroundings (rain, scenery, stars, crowd). "Look around" is a dock control that pauses and hides the player, then frees the camera (browse pose). Choosing "Watch" tweens back (a snap under Calm), then shows the player. The watch pose is computed from the anchor and the viewport by one shared function, so the screen fills up to 85 per cent of the viewport, and environments do not hand-tune per device.

**Size minimum and focus mode.**
- The iframe is shown in place only if the rectangle is at least **480 x 270 CSS px**: YouTube's recommended size, comfortably over the hard 200 x 200.
- Otherwise, and always on phones (v1's `3d-screen` class of viewport), **focus mode** is used: the player sits in normal DOM layout at full content width, and the environment canvas stays behind and around it as a dimmed backdrop.
- On a 360 px portrait phone the player is 360 x 240 (YouTube letterboxes 16:9 inside it), which clears the 200 px minimum in both directions.
- Focus mode is also a dock key on desktop.
- In `2d` mode (no WebGL) the player is always in focus layout, with a CSS frame for the environment.

**Input.**
- In the watch pose the canvas and the iframe never overlap, because the iframe is above the canvas. Clicks and drags inside the player go to YouTube, and outside it to the canvas (for example the TV room knobs).
- Orbit happens only in the browse pose, when there is no live iframe, so drags can never be split between the two.
- Keyboard: when the iframe has focus, YouTube owns the keys and our shortcuts are inactive. Tab leaves the iframe. The dock's Watch, Look around and Guide keys are always reachable.
- Remove the iframe's `tabindex` while it is hidden.

**Firefox and other quirks.**
- Firefox: blank or offset cross-origin iframes under `matrix3d` or `preserve-3d` are avoided entirely, because no 3D transform ever touches the iframe.
- Firefox's Enhanced Tracking Protection (strict) can block YouTube embeds. A player that has not reached `onReady` within 8 s shows "no signal: your browser blocked the player", with a link to the video on YouTube.
- iOS: `playsinline=1` (otherwise iOS forces full screen). Full screen works through YouTube's own button with `allow="fullscreen"`.

**Only one live iframe.**
- A single `PlayerHost` (frontend) owns one `YT.Player` for the whole visit.
- A channel change calls `loadVideoById` on the same player. An environment change moves only the CSS rectangle.
- The iframe is never re-parented, because moving an iframe element reloads it.
- Choosing channel 0 destroys the player, so no further YouTube traffic happens.
- The browse pose and a hidden tab pause it, so no hidden player ever plays.

**Autoplay and sound.**
- The player is created from the visitor's click with `autoplay=1&mute=1`, `allow="autoplay; fullscreen; encrypted-media; picture-in-picture"` and `playsinline=1`. It is 100 per cent visible by construction.
- It starts muted, consistent with v1's audio-off default.
- The dock's Sound key calls `unMute()` from a user gesture. If the browser refuses, YouTube's own mute control remains.

### 2. Code structure

```text
src/scene/environments/
  contract.ts            architect: EnvironmentModule, ScreenAnchorSpec, poses (types only)
  registry.ts            scene-developer: id -> () => import('./<id>')  (one chunk each)
  ScreenAnchor.tsx       scene-developer: registers the anchor Object3D
  ScreenProjector.ts     scene-developer: watch pose, projected rect, face-on check -> playerStore
  tv-room/  cinema/  drive-in/  open-air/  bedroom/  chai-stall/  train/  space-deck/
                         scene-developer (scene), technical-artist (materials, assets)
src/ui/player/           frontend-developer: PlayerHost (IFrame API), focus layout, error pages
src/ui/guide/            frontend-developer: teletext guide, paste-a-link
src/state/               frontend-developer: environmentStore, channelStore, playerStore, guideStore
public/models/<env>/, public/textures/<env>/   technical-artist, with LICENCES.md per folder
src/content/guide-sources.json                 curated list (section 3); owner: tech lead, with
                                               product-manager review of terms per entry
```

**Contract** (`contract.ts`):

```ts
type EnvironmentId = 'tv-room' | 'cinema' | 'drive-in' | 'open-air'
                   | 'bedroom' | 'chai-stall' | 'train' | 'space-deck';
interface EnvironmentModule {
  id: EnvironmentId;
  label: string;
  Scene: React.ComponentType<{ calm: boolean; pose: 'browse' | 'watch'; colour: 'bw' | 'colour' }>;
  screen: { aspect: number; widthM: number };   // player rect aspect (16/9 default), size in metres
  budget: { jsGzipKb: number; assetKb: number };  // declared, checked by CI against the build
  hostsChannel0?: true;                           // tv-room only
}
// Each Scene renders exactly one <ScreenAnchor/>: local XY plane = screen face, +Z towards the viewer.
```

**Environments:**
- Each environment is its own lazy chunk, prefetched when its picker entry gets hover or focus.
- The shared three, R3F and drei code becomes one common chunk, which Vite splits automatically. Switching environments keeps the `<Canvas>` and swaps the scene inside `Suspense`.
- `?env=<id>` selects an environment; it is a query string, not a route (ADR 0007's relative base still holds).
- The default first view is the TV room on channel 0, which is v1's first view unchanged.
- Calm freezes environment animation and the camera (`displayStore.reducedMotion`, as v1).

**Asset budget per environment:**

| | Mobile | Desktop |
|---|---|---|
| JS chunk (gzip, excluding the shared core) | 60 kB | 60 kB |
| Assets on first entry (compressed transfer) | 1.5 MB | 2 MB |
| Draw calls | 50 | 100 |
| Triangles | 150,000 | 500,000 |
| Largest texture | 1024² KTX2 | 2048² KTX2 |

- Prefer procedural geometry, as v1's TV body does at 0 bytes. Crowds and passers-by are instanced billboard sprites; train scenery is scrolling parallax layers; the space deck uses a procedural sky and star points.
- The chai stall's "cricket" is whatever plays in the player: no sports footage is shipped.
- All art is original or CC0, recorded in `LICENCES.md`.
- **Light spill:** there is no pixel access, so light spill is a generic low-passed flicker (at most 2 Hz, the v1 rule), never a sampled picture.

**Colour/B&W.**
- One CSS `filter: grayscale(1)` on the `<canvas>` element, on by default. Each output channel is the same weighted sum, so R = G = B exactly.
- It costs no shader work, never touches the player (which is outside the canvas), and applies to every environment the same way.
- Environment art is authored in colour, except the TV room, which stays v1's greyscale.

**TV room and channel 0.**
- `tv-room/` wraps v1's 3d-set scene. While `channel === 0` it renders exactly v1: the teletext rasteriser into a `CanvasTexture`, the CRT material, the haunting, and v1's `3d-screen` and `2d` modes. The v1 suite runs unchanged against channel 0.
- For any YouTube channel:
  - the CRT material switches to its "off" glass, and haunt output is forced to 0 on and around the screen (v2 may keep a ghost elsewhere in the room, never over the player);
  - the camera takes the TV's front watch pose;
  - the anchor sits on the flat bezel opening, so the player sits inside the bezel and no CRT effect covers it.
- Scanlines and curvature never apply to YouTube; the bezel carries the period look.

### 3. Channel guide pipeline (scheduled GitHub Action; devops wires it in, architect owns the scripts)

**Inputs in git:**
- `src/content/guide-sources.json`: number (1 upward; 0 is the Occupant), name, YouTube channel ID, language, genre, country tested, attribution label and URL, terms URLs, permission status (`not-required`, `requested`, `granted`) and an `enabled` flag.
- It is validated in every build by `scripts/guide/check-sources.ts`:
  - channel ID format `^UC[A-Za-z0-9_-]{22}$`;
  - unique numbers and IDs;
  - required fields present;
  - a `checked` date not older than 90 days (warning; an error in strict mode).

**Schedule.** `.github/workflows/guide.yml` runs every 30 minutes, plus on manual dispatch and after each release.
- It never runs on `pull_request` events, so forks never receive the secret.
- It checks out **the latest `v*` release tag**, not `main`, with full history, then runs a strict build. Because the build is deterministic (NFR-9), the app files and v1 facts are identical to the release.
- It resolves the guide, writes `dist/guide.json`, and deploys to Pages through Actions.
- At 48 deploys a day it stays under Pages' soft limit of 10 builds an hour.
- **The guide is never committed.** Committing it would flood the build diary (NFR-12) and change `git.commitCount`.

**Quota.** The default is 10,000 units a day, reset at midnight Pacific Time.

| Step | Cost | When |
|---|---|---|
| Re-validate the cached IDs: `videos.list` (`part=snippet,status,contentDetails,liveStreamingDetails`, 50 IDs per call) | 1 unit per call (about 2 per run for 60 channels) | Every run |
| Rediscover a channel whose cached ID ended: `playlistItems.list` on the channel's uploads playlist (newest 50) | 1 unit | Only for dead entries; catches restarted streams, which are new uploads |
| Fallback discovery: `search.list` (`channelId`, `eventType=live`, `type=video`) | 100 units | Only if `playlistItems` finds nothing live; at most 40 a day |

- Steady state is about 100 to 200 units a day, plus at most 4,000 for searches.
- The script keeps a **daily spend ledger** and refuses to exceed 8,000 units. The ledger lives in `actions/cache`; the previous IDs are read from the currently published `guide.json`.

**Usable-entry check.** An entry counts as usable only if all of these hold:
- `status.embeddable === true`
- `status.privacyStatus === 'public'`
- `snippet.liveBroadcastContent === 'live'`
- no `liveStreamingDetails.actualEndTime`
- not age-restricted (`contentDetails.contentRating.ytRating`)

`regionRestriction` is recorded but not enforced, because the viewer's region is unknown; runtime errors handle it.

**Fallback and caching:**
- If the API fails or the quota is used up, the last good IDs are kept with `stale: true`.
- Entries not refreshed within 30 days are dropped (YouTube's data-refresh rule).
- If nothing at all can be resolved, the guide still deploys, with every channel `unresolved`. The UI shows "off air" plus paste-a-link.
- The client never uses `embed/live_stream`.
- A site deploy never waits on the guide.

**Published schema (`guide.json`, about 20 kB, about 5 kB gzip, same origin, fetched lazily when the guide first opens):**

```ts
interface ChannelGuide {
  schemaVersion: 1;
  generatedAt: string;        // wall-clock time of the Action run; NOT a fact, never used by the intro
  release: string;            // tag the site was built from
  channels: Array<{
    number: number;           // 1..n
    name: string; channelId: string; language: string; genre: string; country: string;
    attribution: { label: string; url: string };
    state: 'live' | 'off-air' | 'not-embeddable' | 'unresolved';
    live: { videoId: string; title: string; checkedAt: string } | null;   // videoId ^[A-Za-z0-9_-]{11}$
    stale: boolean;
  }>;
}
```

The client validates every field again: IDs by regex, titles as plain text capped at 80 characters. Malformed entries are dropped.

**Key handling:**
- `YOUTUBE_API_KEY` is an Actions secret, restricted in Google Cloud to the YouTube Data API v3 only.
- It is used only in the resolve step. The job then fails if `dist/` contains the key's value.
- The key never reaches the browser.

**Facts pipeline and strict CI:**
- `guide.json` is outside the facts pipeline. It is not in `src/generated/`, not read by `scripts/facts/`, not imported by any template, and excluded from `facts:check` and from the NFR-9 reproducibility claim.
- `guide-sources.json` is a committed input, checked like the lineup rules.
- No npm runtime dependency is added for YouTube. `@types/youtube` is a devDependency at most, and `STACK_PACKAGES` is unchanged, so the v1 intro text and stack facts do not move.
- `agents.roles` changes only if a new agent writes a handoff. The backend-developer is no longer involved.
- Local builds have no `guide.json`. The UI handles that with "guide unavailable" plus paste-a-link. For development, `GUIDE_URL` can point `npm run dev` at the published guide.

**Paste-a-link:**
- Accepts `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/live/` and `youtube.com/embed/` links only.
- Extracts the 11-character ID and rejects everything else, so no other site's URL ever reaches the player and the CSP stays tight.
- Channel and handle links get "paste the live video's link": they cannot be resolved without an API key in the browser, which we never ship.
- A pasted ID lives for the visit only and is sent nowhere except to YouTube when it plays.

### 4. Errors
`onError` codes map to in-character "no signal" pages, each with the reason in plain text, a link to watch on YouTube, and next channel one action away:

| Code | Meaning | Screen |
|---|---|---|
| 2 | Bad ID | Bad link |
| 5 | Playback error | Player error |
| 100 | Removed or private | Off air |
| 101, 150 | Embedding not allowed, or region blocked | Not available here |
| 153 | Missing referrer or player configuration | A configuration bug; also logged in development |
| (none within 8 s) | No `onReady` | Player blocked |

### 5. Flash and Calm
- YouTube pixels cannot be read or changed, so **no flash limiter is possible for YouTube content**. ADR 0009's limiter does not apply.
- The public site states partial conformance for third-party content (WCAG allows a statement of partial conformance for third-party content).
- A notice before the first YouTube play warns that third-party video may flash or contain sound.
- Our own surroundings keep the v1 flash rules (low-passed light spill, design spec section 7).
- What Calm does with YouTube is open question Q1.

### 6. Privacy and network
- **Player host:** `www.youtube-nocookie.com`, using the IFrame API option `host: 'https://www.youtube-nocookie.com'`, with `origin` set to `location.origin`. This mode reduces, but does not remove, YouTube storage once playback starts; the privacy page says so.
- **Referrer:** `<meta name="referrer" content="strict-origin-when-cross-origin">` and `referrerpolicy="strict-origin-when-cross-origin"` on the iframe. This sends only our origin, never a path, and avoids error 153. Never use `no-referrer`.
- **CSP:** GitHub Pages cannot set headers, so the CSP goes in a `<meta>` tag in `index.html` (architect). It starts as a report-only trial in development, then is enforced:

  ```text
  default-src 'self'; script-src 'self' https://www.youtube.com;
  frame-src https://www.youtube-nocookie.com; connect-src 'self';
  img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self';
  style-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'
  ```

  `https://www.youtube.com` serves the IFrame API loader and its widget script. The guide is text-only, so no `i.ytimg.com` thumbnails are requested before a pick. (`frame-ancestors` is not available in a meta CSP; acceptable for a static site.)
- **IFrame API loading:** the API script is injected only by `PlayerHost`, on the first pick. Before that, the page makes no third-party request at all.
- **Production test (qa-engineer; it replaces the v1 NFR-7 test):**
  1. From load through channel 0, the guide, environment switching and paste-a-link validation, every request from every frame is same-origin.
  2. After a pick, the **main frame** may request only `https://www.youtube.com`, and the only child frame is on `https://www.youtube-nocookie.com`. The player frame's own requests are YouTube's and are not asserted.
  3. No cookies or storage on our origin, at any time.
  4. No CSP violations reported.
- **Disclosure:** a privacy page (ux-ui-designer writes, product-manager approves) names YouTube API Services and links Google's privacy policy, as YouTube's terms require. It lists the origins above and attributes each channel.

### 7. Bundle impact

| Item | Size | When |
|---|---|---|
| First view (TV room, channel 0) | v1 plus about 10 kB gzip or less (environment picker, guide key, new stores) | Load |
| Shared 3D core (three, R3F, drei) | About the current 280 kB gzip, now its own common chunk | As in v1 |
| TV room chunk | v1's scene code minus the core | As in v1 |
| Each other environment | 60 kB gzip JS or less, plus up to 1.5 or 2 MB of assets | On choosing it (prefetched on hover or focus) |
| `guide.json` | About 5 kB gzip | First time the guide opens |
| YouTube IFrame API and player | YouTube's own scripts, typically several hundred kB to over 1 MB; outside our budget, not cacheable across sites | After the first pick |

v1's NFR-3 first-view limit is unaffected, because nothing new loads before a choice.

## Consequences
- v2 needs no backend, no media storage and no stream handling. There is nothing to relay, re-encode or license beyond YouTube's terms, with written permission sought for the DD and Sansad channels.
- The no-overlay rule is met structurally (stacking order, face-on check, filter only on the canvas) and is tested on every build. The price is a static camera while watching, and no curved or oblique live screens.
- Phones always watch in focus mode, so environments matter most on desktop.
- Guide freshness depends on a scheduled workflow. GitHub disables schedules in public repos after 60 days without commits, so the UI shows `checkedAt` and `stale`, and the runbook says how to re-enable the schedule.
- Flash safety for third-party video cannot be guaranteed; it is disclosed instead.
- v1 stays intact: channel 0 and the TV room keep their code paths, and the v1 suite still guards them.

## Open questions (user)
- **Q1 (Calm and YouTube):** the earlier "Calm and 2D play pre-checked clips only" rule has no pre-checked clips left to play. Options:
  - (a) Calm blocks YouTube entirely;
  - (b) recommended: Calm allows YouTube after a per-visit "may flash" confirmation, with all environment motion frozen.

  2D mode is unaffected, because YouTube needs no WebGL.
- **Q2 (DD and Sansad launch timing):** go live with the DD and Sansad channels as soon as the permission emails are sent (relying on YouTube's embed terms), or keep them `enabled: false` until Prasar Bharati and Sansad TV reply?

## Phased build plan (after the `v1.0` tag; the backend-developer is not involved)

| Phase | Work | Agents |
|---|---|---|
| 0 | Tag `v1.0`, create the v2 branch, keep the v1 suite in v2 CI | tech lead, qa-engineer, devops-engineer |
| 1 | Rewrite the v2 requirements to this shape: amended NFR-7, privacy page, partial-conformance statement, Q1 and Q2 | product-manager |
| 2 | Update `docs/architecture.md`; `contract.ts`; `scripts/guide/check-sources.ts`, the guide resolver script and its schema; CSP and referrer meta in `index.html`; budget checks in CI. Checkpoint: user approval | architect |
| 3 | Art direction for the 8 environments; watch-pose framing; focus mode; dock (Watch, Look around, Guide, Focus, Colour/B&W, Sound); teletext guide and paste-a-link; no-signal pages; privacy page copy. Checkpoint: user approval | ux-ui-designer |
| 4a | Environment assets and materials within budget, light-spill flicker, licences | technical-artist |
| 4b | Registry, `ScreenAnchor`, `ScreenProjector` (watch pose, face-on check), browse and watch tweens, TV room integration with the channel 0 path untouched | scene-developer |
| 4c | Stores, `PlayerHost` (one player, nocookie, errors, mute, pause rules), focus and 2D layouts, guide UI, paste-a-link parser | frontend-developer |
| 4d | `guide.yml` (schedule, tag checkout, quota ledger cache, deploy), `YOUTUBE_API_KEY` secret setup in `docs/deployment.md`, Actions Pages deploy | devops-engineer |
| 4e | Integration: `npm run build`, route handoff requests | tech lead |
| 5 | Environment budgets on a real phone and laptop, the canvas filter's cost, chunk sizes | performance-optimiser |
| 6 | No-overlay tests (hit-test grid, ancestor styles), one-iframe and minimum-size tests, the two-stage network test, CSP, error codes via fixtures, Firefox (including Enhanced Tracking Protection strict), iOS inline playback, v1 regression on channel 0 | qa-engineer |
| 7 | Release tag; the guide workflow's first run; the user creates the Google Cloud API key and adds the secret | devops-engineer, user |
