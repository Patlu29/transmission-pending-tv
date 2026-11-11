# Design spec v2: environments and YouTube channels

Owner: ux-ui-designer. Status: draft for user approval (2026-11-11), branch `v2`. Read with `docs/design-spec.md` (v1, unchanged; section numbers below such as "v1 7.1" refer to it), `docs/requirements/v2-environments.md` (V2-FR, V2-YT), `docs/decisions/0011-environment-player.md` (ADR 0011), and the two research notes.

Terms: "player rect" is the axis-aligned CSS rectangle where the one YouTube iframe sits. "Anchor" is the flat 3D rectangle that the player rect is projected from (`ScreenAnchor`). "Surround" is everything the scene draws around the player rect. "Room" is the user-facing word for an environment. "Info row" is the DOM strip directly under the player rect. "Channel 0" is the Occupant's story.

## 0. Summary of the design

- The site opens as in v1: the 1970s TV, off, channel 0 on Power. v2 adds a secondary route in: "Change the room" and "Channel guide" keys on the start screen and in the dock.
- The viewer picks a room (8) and a channel (guide or pasted link). A once-per-visit notice comes before the first YouTube request. The player then appears as one flat rectangle in a DOM layer above the canvas; the room is styled around it, never on or in front of it.
- Colour/B&W changes only the room. Site text and controls are greyscale in every room.
- Phones watch in focus mode (player full width, room as a dimmed backdrop). Desktop watches in the room.
- Calm mode means click-to-play behind a still card, frozen room motion, captions requested on.
- Hard design rule behind everything: **nothing the site makes is ever drawn, placed or animated over any part of the player rect** (V2-YT-1).

## 1. Information architecture and flows

### 1.1 Map

```text
Start screen (tv-room, set off)
 |- Power -> channel 0 (v1 story, v1 flows) -> diary index (P100) -> [Channel guide]
 |- Channel guide ---- pick a guide channel ---+
 |                 \-- paste a link ----------+--> first-play notice (once per visit) -> player
 |- Change the room (picker, 8 rooms)           |
 |- Calm mode switch (always present)           v
 |                                       Watching (room or focus layout)
 |                                         |- Stop -> back to the room's idle screen (tv-room: channel 0)
 |                                         |- Look around (pauses, hides player, frees camera) <-> Watch
 |                                         |- Focus mode toggle
 |                                         |- Channel +/- , guide, digits
 |                                         |- Room, Colour/B&W, Sound
 |                                         |- Back to controls
 |                                         '- Error / no-signal pages (section 1.9)
Footer links on every surface: Privacy, Credits, Third parties, YouTube Terms
```

### 1.2 First visit (V2-FR-25, D5)

1. Page loads in the 1970s TV room, set off, same-origin only (no YouTube request). The v1 start screen content stays, with two additions: a line "Channels come from YouTube. You will be asked before anything loads." and two secondary keys under Power: "Channel guide" and "Change the room".
2. Power starts channel 0 exactly as v1 (warm-up, story, haunting, Skip, Pause, Replay, diary). Nothing in v2 changes the v1 flows on channel 0.
3. When the diary index appears, a one-line hint sits in the info slot under the screen (static text, no animation): "Try the channel guide." The Guide key shows its toggle-on bar once. After the visitor has used the guide once, the hint never shows again in the visit.
4. Visitors who do not want the story can open the guide straight from the start screen. Picking a channel there powers the set on (warm-up as v1, 2.2 s), then the first-play notice, then the player. The story stays available as channel 0.
5. `?env=<id>` opens that room directly. In any room other than tv-room there is no channel 0 and no Power key: the screen shows the idle card (the original test card, v1 section 11, still, in greys) and the info row says "No channel. Open the guide."

### 1.3 Change the room (the environment picker, V2-US-4)

- Entry: dock key "Room" (label "Change the room" in the tooltip and the accessible name), start-screen key, key `E`.
- Form: desktop, a panel anchored above the dock (width 360 px, `--z-panel`); phone, a bottom sheet. It never overlaps the player rect (on desktop it opens over the lower-left corner of the viewport, outside the rect by the layout rules in 2.3; if a layout would overlap, the player is paused and hidden while the picker is open, and resumes when it closes).
- Content: a list of eight rooms, each a row with a 96 x 54 CSS schematic (inline SVG, about 1 kB, original, greyscale, drawn from the room's layout), the room's name, and one line of mood ("Cinema: an empty auditorium, you in the middle"). Name and line are real text.
- Semantics: `role="radiogroup"` labelled "Room"; roving tabindex; Up/Down or Left/Right move; Enter or Space selects; Esc closes and returns focus to the Room key. The current room is `aria-checked`.
- Loading: choosing a room starts its chunk. The row shows "Loading Cinema... NN%" (real progress; a static three-dot form if unavailable); the old room stays until the new one is ready, then the camera cuts (Calm) or dissolves over 300 ms. Hover or focus on a row prefetches that room's chunk (ADR 0011).
- While a video plays: the player is paused and hidden when the switch starts, shows again in the new room's rect, and resumes playing (muted state kept). See the autoplay risk in section 10.
- Picker keeps the viewer's channel; colour option and focus mode carry over.
- Remembered for the visit only (V2-FR-24).

### 1.4 Channel guide (V2-US-1)

- Entry: dock key "Guide", key `G`, start-screen key, hint after the diary.
- Presentation: a teletext-style panel in every room (so the guide looks the same everywhere and costs one component): the v1 teletext palette, VT323 text on black, header bar "GUIDE", drawn in DOM (not canvas) so it is real, selectable, searchable text. Desktop: a 560 px wide panel at the left, full height minus the dock; phone: a full-screen sheet with a sticky header. It is never over the player rect on desktop (the player moves aside to the right of the panel only if needed: see 2.3); on a phone the player is paused and hidden while the guide is open.
- Order and grouping: channel number order, with section headings in this order: Public service, Parliament, News (Hindi, English, then other languages), Business, Regional (by language), International news, Science. The headings are `h2`; each group is a list.
- Row content (single line wraps on phones): number (1 upward; `0` is the Occupant, shown as the first row "0 The Occupant (the story)" only in tv-room), name, language (full word: "Hindi", not a code), genre, country, owner type, status.
- Status labels, always text (never colour alone):

  | State | Label | Behaviour |
  |---|---|---|
  | `live` | LIVE | Starts on Enter or tap |
  | `live` with `stale: true` | LIVE (check) | Starts; the row adds "last checked <time>" |
  | `off-air`, `not-embeddable`, `unresolved` | OFF AIR | Focusable, `aria-disabled`; Enter says "Off air. Cannot be started." in the live region; row shows the reason in words ("No live programme now", "The owner does not allow embedding") |
  | state media (`owner type`) | STATE MEDIA tag | Visible beside the name (V2-FR-10, L3) |
  | DD and Sansad entries | OFFICIAL EMBED tag | Shown beside the name; tooltip and the Credits page say "shown through the channel's official YouTube embed" |
  | `enabled: false` | not shown | The kill switch removes the entry completely (V2-FR-11): no row, no placeholder, no number gap message |

  Permission states in the UI, restated: there is no "permission pending" screen. An entry is either listed (with its tag) or removed by the data switch. If a permission reply asks for removal, only `guide-sources.json` changes.
- Last refreshed: header shows "Guide checked <time>" from `generatedAt` (plain text, local time; this is the only wall-clock value on the site and is not a v1 fact).
- Filters (Should, V2-FR-10): a row of toggle chips under the header: Language, Genre, Country, Owner type; each chip opens a small menu of radio options with an "All" option; plus a text "Find a channel" field filtering by name. Filters change the list only; they never change numbering. On phones the chips collapse into one "Filter" key that opens a sheet.
- Keyboard: Up/Down move the cursor row (roving), Enter starts, digits jump to a number, Home/End jump, Esc closes. Touch: tap a row. Selecting a row closes the guide and begins the pick flow (1.6).
- Guide data unavailable (local builds, fetch failure): panel shows a plain-text state "THE GUIDE IS NOT ON AIR. You can still paste a link." with the paste field focused.
- Footer inside the panel: "Credits - Privacy - Third parties - YouTube Terms of Service".

### 1.5 Paste-a-link (V2-US-2)

- Where: the top of the guide panel, always visible; also reachable by key `V` ("paste") which opens the guide with the field focused.
- Field: a visible label "Paste a YouTube link", help text "Watch, live, youtu.be or embed links only." (`aria-describedby`), a "Watch" key. The paste lives in memory for the visit; the field clears when the panel closes; nothing is stored or logged (V2-FR-8). No "remember" option.
- Validation messages (plain text, `role="alert"`, in character, under the field; the field keeps focus):

  | Case | Message |
  |---|---|
  | Empty | "Paste a link first. The set cannot guess." |
  | Not a URL | "That is not a link. Try one that starts with https://." |
  | Not a YouTube host | "Only YouTube links work on this set." |
  | Channel, handle or playlist form | "That points to a channel or a list, not one live video. Paste the link of the video itself." |
  | No ID found | "No picture found in that link." |
  | Valid | No message; flow continues to 1.6 |

  Note: V2-FR-7 lists playlist forms; ADR 0011 rejects them (one pasted ID, strict pattern). The design follows the ADR: playlist links get the channel/list message. See open question Q-D3.
- A pasted video appears as an entry labelled "Your link" in the info row, with a "Watch on YouTube" link built from the ID.

### 1.6 Pick flow and the first-play notice (V2-FR-28, V2-US-3)

```text
Pick (guide row, paste, Up/Down, digits, knob)
 -> notice already accepted this visit? 
      yes -> Calm? yes -> still card (1.7)   no -> player starts (muted autoplay)
      no  -> notice dialog
               Back     -> nothing loaded; focus returns to where it was
               Continue -> (Calm? still card : player starts)
```

First-play notice (modal dialog, once per visit, remembered in session storage and in memory; `role="dialog"`, `aria-modal`, initial focus on the heading, Esc = Back, focus trapped):

> **Before this plays**
> The video comes from YouTube and from the channel's owner, not from this site. It may be loud, may flash or flicker, and may be blocked in some countries. This site cannot change the video or make it safer, so we never put anything over it.
> YouTube may set cookies or collect data once the video loads. We load the player from youtube-nocookie.com, which reduces this but does not remove it. Playing a video means you accept the YouTube Terms of Service (link).
> This site itself collects no personal data. See Privacy (link) and Third parties (link).
> **Calm mode is on:** nothing will start by itself. You will see a still card first, and captions will be asked for. (Shown only in Calm mode.)
> [Back] [Continue]

- It is the consent step: no request to any YouTube origin happens before Continue (V2-NFR-3). The IFrame API script is injected only after Continue.
- Text 16 px minimum, line length under 70 characters, 4.5:1. Buttons are the v1 hardware keys, 44 px.
- This is also the flash warning (once per visit). In Calm mode the same dialog appears before the still card, so the warning always precedes play (Q1 option b, ADR 0011).

### 1.7 Calm and click-to-play (V2-US-8)

- Calm on (or OS reduced motion): after Continue, the screen anchor shows a still card (site-made, original, greyscale): the channel name in large type, the owner label, "Press play to start the video. It will start muted." and a Play key beneath the player slot. The card is a DOM element in the player rect position (it is not the player); pressing Play replaces the card with the iframe (autoplay muted, user-activated).
- Thumbnail: the requirement says "still thumbnail card". Default design: the card is site-drawn with no YouTube image, because the ADR 0011 CSP allows no `i.ytimg.com` image (and a thumbnail is third-party pixels we cannot vet). If the user wants real thumbnails, the CSP needs `img-src https://i.ytimg.com` after the notice, and the card shows the thumbnail with the name over its lower band outside the thumbnail area (never over it). See Q-D1.
- Captions: the iframe is created with `cc_load_policy=1` in Calm.
- Room motion frozen, camera fixed, no channel-change cue.

### 1.8 Colour or B&W (V2-US-6)

- Control: a dock key "Room colour" (toggle, `aria-pressed`), key `C`. Label text states the result: "Colour: off" / "Colour: on". Default off (B&W). Live-region announcement: "Room in black and white." / "Room in colour."
- It changes the canvas filter only (ADR 0011: one `filter: grayscale(...)` on the `<canvas>`). The change eases over 600 ms (instant in Calm). The player, the info row, the dock, the guide and every site text stay unchanged and greyscale.
- Channel 0: always B&W. The key is disabled there with the visible reason text "Channel 0 is always black and white" (focusable, `aria-disabled`).
- tv-room with a YouTube channel: Colour on gives the "colour era" variant (section 5.1); the room's materials take warm tints. The CRT-on-bezel treatment stays greyscale.
- Remembered for the visit.

### 1.9 Errors and no-signal states (V2-US-10, V2-YT-8, V2-YT-15)

When the player reports an error (or does not reach `onReady` in 8 s) the site stops the player, hides the iframe, and shows a site-made no-signal card in the player rect (this is not an overlay: the player is not shown while it is there). The card is `role="alert"` for the first announcement only. It is static: no noise, no flicker, in every mode. Voice: a 1970s continuity announcer apologising for a fault; plain reason always given in the second sentence; never blames the viewer.

| Trigger | Heading (teletext style) | Body | Actions |
|---|---|---|---|
| Code 2 (bad ID) | SIGNAL GARBLED | "That link did not lead to a picture. Check the link and try again." | Paste another link, Open the guide |
| Code 5 (HTML5/player error) | FAULT AT THE TRANSMITTER | "The player had a turn and stopped. This is usually temporary." | Try again, Next channel, Watch on YouTube |
| Code 100 (not found or private) | OFF AIR | "This programme has gone, or it is private." | Next channel, Open the guide |
| Codes 101 and 150 | NOT FOR THIS SET | "The owner does not allow their picture to be shown on other sites, or it is not available in your region. We do not try to get around that." | Watch on YouTube, Next channel |
| Code 153 | THE PLAYER COULD NOT CHECK US | "The player could not verify this site. That is our fault, not the channel's. Error class 153." | Try again, Watch on YouTube |
| No `onReady` within 8 s | NO SIGNAL | "Your browser may have blocked the player, for example with tracking protection. You can watch it on YouTube instead." | Try again, Watch on YouTube |
| Guide fetch failed | THE GUIDE IS NOT ON AIR | "Paste a link instead." | Paste a link |
| Guide entry `off-air` | OFF AIR | reason in words (1.4) | Next channel |
| WebGL or room chunk fails | NO SIGNAL FROM THE ROOM | "This room did not load. Showing the plain screen." | Use the plain version, Retry |

Rules: "Watch on YouTube" is a real link (`target="_blank"`, `rel="noopener"`) built from the known ID or channel; "Next channel" skips off-air entries and wraps; the error class is shown in the text only (nothing is sent anywhere). The error card keeps the info row (name, link, Stop). Calm and reduced motion: identical, as it is already static.

### 1.10 Channel change (V2-FR-9, V2-FR-27)

- By: dock Previous and Next keys, Up/Down keys, digits (1.11), the guide, the tv-room channel knob.
- A change calls `loadVideoById` on the same player (ADR 0011). The new channel's name appears in the HUD readout and the info row immediately; the live region announces "Channel 12, NDTV 24x7, live".
- Change cue on the surround, 200 to 400 ms (we use 300 ms), once per 1000 ms at most:
  - tv-room: a static burst on the bezel ring and the strip of cabinet around the glass (shader on those meshes only), mean luminance rise of that area at most 0.10 and its change at most 0.05 per 100 ms for areas over 87,000 px; never on the player rect.
  - other rooms: a 300 ms edge vignette dip (the room's corners darken by at most 15 per cent and return, eased), nothing at the centre.
  - Calm and reduced motion: an instant change, no cue.
- On-screen channel readout: a HUD label "CH 12  NAME" (VT323, on a `--color-scrim` plate, outside the player rect, top-right in room layouts, in the header in focus layout). It is text, `aria-hidden` (the live region carries the content).

### 1.11 Digits, Up/Down, the knob: see keyboard map (section 3).

### 1.12 Stop, Look around, Watch, Focus, Back to controls

- **Stop** (V2-FR-30): key in the info row (next to Watch on YouTube) and in the dock More sheet, key `S` in room contexts. Within 1 s: the player is stopped and hidden. tv-room returns to channel 0's idle (set on, diary index if the story ended, else the test card); other rooms show the idle card. The channel selection clears. Focus moves to the Guide key. Live region: "Stopped. Back in the room."
- **Look around:** dock key "Look around", key `L`. It pauses and hides the player (iframe remains, `visibility: hidden`, no tab stop), shows the site-made paused card on the anchor mesh (channel name, "Paused"), frees the camera (browse pose: orbit within azimuth plus or minus 35 degrees, elevation -5 to +12, distance 0.85 to 1.15 of the watch distance, no pan; Calm and reduced motion: no orbit, the key hides). The key becomes "Watch". Watch returns to the watch pose (700 ms, a snap in Calm) then shows and resumes the player. Phone: not offered (no browse pose in focus layout).
- **Focus mode** (V2-FR-18): dock key "Focus", key `F`. Automatic when the projected rect would be under 480 x 270 CSS px, and always on phones. Layout in 2.4. A manual toggle on desktop. The state is remembered for the visit.
- **Back to controls** (V2-FR-31): a visible text key in the info row, immediately after the iframe in DOM order, plus a "Skip to controls" link immediately before it. The cross-origin iframe owns the keyboard once focused, so the documented exit is: press Tab to leave the player (YouTube's own controls take several Tab stops; the skip link before the iframe lets keyboard users bypass them, and Back to controls is the first stop after them). Pressing Enter on Back to controls moves focus to the dock's Guide key. When focus is on site controls, Esc moves focus to the stage and `G`, `E` and the other shortcuts work. This is stated on the Keyboard help (`?`).

### 1.13 Notices, privacy and credits surfaces

| Surface | Where | Content |
|---|---|---|
| First-play notice | Modal, once per visit (1.6) | Third-party video, flash, region, cookies, terms, Calm line |
| Privacy page | `privacy.html` (static, same origin), linked from footer links, the notice and the guide | Copy in 6.3; includes the third-party origin list and the partial-conformance statement |
| Credits | In-app panel "Credits" (reads the guide) | Every guide channel with owner and "Watch on YouTube"; NASA credit and non-endorsement line if NASA is listed; DD and Sansad note; state-media labels |
| Footer links | Start screen bottom, guide panel foot, the More sheet, the 2D page footer | "Privacy - Credits - Third parties - YouTube Terms of Service" (text, 16 px) |

The footer is not a persistent bar in 3D rooms (it would eat the view). It is reachable from the dock's "More" sheet and the guide, and is a normal footer in 2D mode.

## 2. Layouts

### 2.1 Modes and breakpoints

v1's modes and the 3d-set breakpoint stay. v2 adds two layout flags: `layout: 'room' | 'focus'`.

| Viewport | Idle (no channel) | Watching a YouTube channel |
|---|---|---|
| 3d-set class (1024 x 600 and up, landscape-ish, fine pointer) | Room layout, browse-style idle framing | Room layout if the player rect is 480 x 270 or larger, else focus layout |
| 3d-screen class (phones, tablets, narrow windows) | Room framed for the viewport (portrait: screen low-centre, room above), tv-room as v1's full-bleed screen | Focus layout always |
| 2d | CSS room skin (2.5) | Focus layout always |

### 2.2 Shared geometry rules for the player rect

1. Aspect: the anchor's aspect (16:9 everywhere; 4:3 in tv-room). The iframe box has exactly that aspect; YouTube letterboxes inside it.
2. Room layout rect size: `width = fill x viewportWidth`, then limited so `height <= min(0.78 x viewportHeight, viewportHeight - infoRow - dock - 2 x space-6)` (info row 56 px, dock 64 px). `fill` per room in section 5 (0.55 to 0.72). The rect is centred horizontally unless the room says otherwise (tv-room, car).
3. Minimum: if the rect would be under 480 x 270, focus layout is offered automatically (a small banner on the info row: "The picture is small here. Focus mode is on." with Turn off). The player is never under 200 x 200 (V2-YT-3).
4. Clear zone: nothing the site draws or places intersects the rect; the info row, dock, HUD, picker, guide, notices and tooltips are laid out outside it (section 2.3). Scene props keep at least 24 CSS px clear of the rect on every side in the watch pose (the "24 px halo" the scene-developer enforces by projecting prop bounds).
5. One projector for all rooms: the watch pose is computed from anchor and viewport, not hand-tuned per device (ADR 0011).

### 2.3 Room layout (desktop)

```text
+------------------------------------------------------------------+
| HUD: Room name . CH 12 NAME                       [Look around]  |  top edge
|                                                                  |
|        +-----------------------------------------+               |
|        |                                         |               |
|        |            PLAYER RECT (iframe)         |               |
|        |                                         |               |
|        +-----------------------------------------+               |
|        Name . Owner tag . Watch on YouTube     [Back to controls] [Stop] |  info row
|                                                                  |
|     [Power*] [Calm] | [Prev] [Guide] [Next] | [Room] [Colour] [Sound] [More] |  dock
+------------------------------------------------------------------+
 * Power only in tv-room
```

- HUD plates use `--color-scrim` and sit at the top edge, outside the rect.
- The info row is DOM, positioned from the projected rect (same left and width, top = rect bottom + `--space-2`). Its height is 40 px; wrapping is not allowed at room widths (rect is at least 480 wide): name truncates with an ellipsis only after 40 characters and is fully available as the link's accessible name.
- Panels (guide, picker, Keyboard help, Credits) open at the left edge and are at most 560 px wide. If a panel would overlap the rect at the current viewport, the player is paused and hidden while the panel is open and resumes on close; the player is never covered by a panel while visible.
- Dock: v1 position (bottom centre, 24 px up). Groups separated by 8 px rules; every key at least 44 x 44.

Dock changes from v1:

| Key | When shown | Notes |
|---|---|---|
| Power | tv-room only | v1 behaviour; label flips Switch on / Switch off |
| Calm | always, after Power (FR-31) | unchanged |
| Skip, Pause, Replay | channel 0 only | v1 |
| Read full text | channel 0 only | v1 |
| Previous, Next (channel) | live channel or channel 0 diary ended | Labels "Previous channel", "Next channel". In the channel 0 diary, page Prev/Next keep their v1 labels and appear in addition |
| Guide | always | opens the guide |
| Room | always | opens the picker |
| Room colour | always | disabled on channel 0 with reason |
| Sound | live channel: "Unmute video" / "Mute video" (calls the player API from a user gesture); channel 0: v1 "Sound on/off" | video sound and the Room sound (below) are separate |
| Room sound | in More | ambient audio, off by default (section 5) |
| Look around / Watch | room layout, live channel | desktop only |
| Focus | live channel | toggle |
| Stop | in the info row and in More | |
| More | when keys do not fit | opens a sheet: Room sound, Focus, Keyboard help, Footer links, anything that does not fit |

### 2.4 Focus layout (phones, small windows, manual)

Portrait (360 x 740):

```text
+--------------------------+
| Room . CH 12 NAME   [x]  |  header 48 px ([x] = Exit focus mode)
+--------------------------+
|                          |
|   PLAYER (full width,    |  height = max(width x 9/16, 240); 16:9 is
|   min 240 tall)          |  letterboxed inside by YouTube
|                          |
+--------------------------+
| Name . STATE MEDIA       |  info row, wraps to 2 lines
| Watch on YouTube         |
| [Back to controls] [Stop]|
+--------------------------+
|  dimmed room backdrop    |  canvas, brightness 0.6, behind and below
|  (decorative)            |
+--------------------------+
| [Guide] [Room] [Calm] [More] |  dock 64 px
+--------------------------+
```

- Player: full content width (viewport minus 0 horizontal padding; the player may touch the edges), at least 240 px tall on phones so it clears 200 x 200 in both directions. On a 360 px phone it is 360 x 240.
- The canvas stays behind and around it; it is dimmed with `filter: grayscale(var) brightness(0.6)` on the canvas only. No element between the player and the page except the page itself.
- Landscape phone (height under 500): the dock moves to a 64 px vertical strip at the right; the player height is `viewportHeight - 40 (info strip) - 8`, width `height x 16/9` capped at `viewportWidth - 64 - 8`, centred. The info strip is one line: Name - Watch on YouTube - Back to controls - Stop (the name truncates; the link text is never truncated).
- iOS: the iframe gets `playsinline=1`. Full screen is YouTube's own button (`allow="fullscreen"`); it is not replaced by a site control.
- Dock keys on phones (bar holds four): Guide, Room, Calm, More. More holds Sound, Colour, Focus, Previous/Next channel, Keyboard help, footer links. Calm always stays on the bar (FR-31). While channel 0 plays, the bar is Power or Skip, Calm, Pause, More (as v1 compact).
- Touch: Stop and Back to controls are in the info row, always visible, 44 px.

### 2.5 `2d` mode

Focus layout always. Room as a CSS "skin": a full-bleed background and a frame colour set per room (table in section 5.9), B&W by default and tinted when Colour is on; no animation under Calm, a slow 0.05 Hz brightness drift otherwise (at most 4 per cent). The 2D page has a real footer with the four links. Same notices, guide, paste, errors.

## 3. Keyboard map and conflicts

Shortcuts are active only while focus is on the stage or any dock key, as in v1 (WCAG 2.1.4). When the iframe has focus, YouTube owns every key (including Space, arrows, `m`, `f`, `c`, digits) and no site shortcut fires. The Keyboard help (`?`) lists this.

| Context | Digits | Up / Down | Left / Right | Enter / Space | Other keys |
|---|---|---|---|---|---|
| Channel 0, story playing | Channel number entry (1.5 s timeout or Enter; `0` then Enter = stay on 0) | Previous / next channel (leaves the story; asks first if mid-story is not wanted: no, it just changes) | none | focused key | v1: S skip, P pause, R replay, M sound, T text, N/B pages, I index |
| Channel 0, diary shown (ended) | **Diary page entry** (v1, unchanged: `1`, `0`, `1` opens P101) | Move diary cursor (v1) | Previous / next diary page (v1) | open entry (v1) | Home = index. To change channel: Guide key `G`, dock channel keys, or the channel knob |
| Live channel, watching (stage focused) | Channel number entry | Previous / next channel (skipping off-air) | none | focused key | S stop, M mute/unmute, G guide, E room, C colour, F focus, L look around, V paste |
| Browse pose (Look around) | Channel number entry | Previous / next channel (also hides nothing) | Orbit left / right | focused key | `+`/`-` zoom, Home = reset view (v1), W or Esc = Watch |
| Guide open | Jump to channel number | Move row | none (Left/Right moves between filter chips when a chip has focus) | start | Esc close, Home/End first/last, `/` focus the Find field |
| Room picker open | none | Move row | Move row | select | Esc close |
| Dialog open (notice, Credits, Keyboard help) | none | none | none | focused key | Esc = Back / Close; focus trapped |
| Paste field focused | typed into the field | none | caret | Enter = Watch | all letter shortcuts are inactive (text field) |

Conflict decisions:

1. **Digits.** v1 digits (diary page entry) apply only in the diary context. Everywhere else digits are channel numbers. The two never mix: the context is visible (the diary shows `P1__`; channel entry shows "CH _ _" in the HUD).
2. **Arrows.** Up/Down change channel in watch contexts. Left/Right are free in watch contexts. v1 orbit by arrows exists only in the browse pose. In the diary, v1 arrow behaviour is unchanged.
3. **Channel knob (tv-room, 3D).** Click or tap: next channel; Shift-click: previous; scroll wheel over it: plus or minus one. On channel 0 with the diary shown, the knob keeps v1 behaviour (next diary page) until the last diary page, and then goes to channel 1. Its hover tag reads "Channel". Every action is also in the dock (Previous, Next).
4. **Letters.** New keys: G guide, E room, C colour, F focus, L look around, V paste, W watch. `C` was free in v1. They are active only in the stage or dock focus, and never in a text field.
5. **Escape.** Closes the topmost panel or dialog; with none open, moves focus from a dock key to the stage; it never stops the video and never exits the player's full screen from the site (YouTube owns that).
6. **Tab order.** Skip to controls (before the iframe), iframe, Back to controls, Stop, then dock, then footer links (More sheet). Controls above the player in focus layout (header Exit key) come first.

## 4. Components and states (new)

All use v1 key styling (v1 9.1) and tokens; every state is visible without relying on shade.

| Component | States and notes |
|---|---|
| Room key and picker | default, hover, focus, active; picker row current / loading (progress text) / error ("Could not load. Retry") |
| Guide panel and rows | row: default, hover, focus (3 px ring plus halo), current, off-air (dimmed text 5:1 min, plus the OFF AIR label), loading |
| Filter chips | off / on (`aria-pressed`, bar), menu open |
| Paste field | default, focus, error (message text plus 2 px border), busy |
| First-play notice | the only modal; focus trap; Back and Continue keys |
| Info row | channel, owner tag, Watch on YouTube link, Stop, Back to controls; link underlined, 4.5:1 |
| Still card (Calm) | site-drawn, static; Play key |
| No-signal card | static, `role="alert"` once |
| Colour key | toggle with text result |
| HUD plates | text on scrim, not interactive |

Contrast: all site text 4.5:1 on its own opaque or scrim plate (v1 9.2 tokens). Nothing site-made sits directly on room art without a plate. In Colour mode plates stay greyscale.

## 5. Environments

### 5.0 Common rules for all eight

**Contract (ADR 0011):** each room renders exactly one `ScreenAnchor` (local XY = screen face, +Z towards the viewer). `aspect` 16/9 (4/3 in tv-room). Budget per room: 60 kB gzip JS, 1.5 MB (mobile) and 2 MB (desktop) assets on first entry, 50 and 100 draw calls, 150k and 500k triangles, largest texture 1024 (mobile) and 2048 (desktop). All art original or CC0, `LICENCES.md` per folder; no real brand, logo, trademarked name, real programme, real person or real vehicle make anywhere. Text on props is generic ("EXIT", "CHAI", "TEA").

**Watch pose:** static, face-on, from the shared projector; no creep, no parallax (ADR 0011). Only ambient motion of the surroundings.

**Clear halo:** every prop's projected bounds stay at least 24 CSS px outside the player rect in the watch pose, at every supported viewport. The scene-developer implements a `clearHalo` check that nudges or hides props (in development it throws; in production it hides the prop). Animated props are clamped so their swept bounds respect it, too.

**B&W and Colour:** rooms are authored in colour. B&W is the canvas grayscale filter, so each room's colour palette must give a readable greyscale: every prop pair that must read apart has at least 25 per cent relative-luminance difference after conversion (QA checks screenshots in both). Palettes below list the colour values; "B&W reads" states the intended grey roles. The tv-room is the exception (section 5.1).

**Light spill:** no pixel access, so spill is generic. One shared function: `spill(t) = 1 + 0.08 sin(2 pi 0.6 t) + 0.05 sin(2 pi 1.3 t + 1.7)`, so no component is faster than 2 Hz (the fastest is 1.3 Hz) and the swing is plus or minus 13 per cent of a room-specific base intensity. It is not driven by the video. The light it moves is low and falls on the surround only. Under Calm and reduced motion, `spill = 1`. Spill never reaches the player rect (it is DOM above the canvas anyway) and may not brighten any area by more than 0.05 of relative luminance per 100 ms.

**Ambient motion:** slow, never over the rect, frozen in Calm and reduced motion (a fixed, pleasant frame is chosen for the frozen state). Every animation passes v1 7.1: no area flashes more than 3 times in a second, large-area step under 0.10 and designed under 0.05 per 100 ms.

**Ambient audio (Could):** synthesised with Web Audio (v1 engine, no files). Off by default. Control: "Room sound" in More (and key `A`). It starts only on that explicit action, plays at most 24 dB below nominal, and is audible only while the video is muted or no video plays, so it never competes with a channel. Muted under Calm. Nothing sudden: all envelopes at least 1.5 s attack.

**Phones:** all rooms are backdrop-only in focus layout. Idle (no channel) on a phone frames the room portrait: screen at 92 per cent width, lower third, room above.

**Order if scope shrinks (requirements section 10):** tv-room, cinema, car, open air first. Designer's note: bedroom and space deck are the cheapest and best on phones (Q-D2).

### 5.1 1970s TV room (extended for YouTube channels)

- **Mood:** v1's dark room, the set the only light, now with a lamp and a rug edge so a colour variant exists. Channel 0 is untouched.
- **Palette:** B&W (default): v1's greys. Colour (live channels only): walnut cabinet `#6b4a2f` with dark grain `#3a281a`; wall paper olive-ochre `#7d7336` with burnt-orange accent line `#b0561e`; shelf `#2b2118`; lamp shade amber `#e8a54b`, lamp glow `#ffcf80`; bezel stays `#141414`. B&W reads: wall mid-dark, cabinet mid, lamp the lightest prop. On channel 0 the colour key is disabled and the room stays v1 greyscale.
- **Props:** v1 set, shelf, wall; new: table lamp on the shelf to the right of the set (shade top below the glass top; at least 24 px clear of the rect), a doily under the lamp, a rug edge at the bottom of frame, a paper-pattern wall (v1 wall procedural, tinted).
- **Anchor:** a flat 4:3 rectangle in the bezel opening, at the glass plane (z = 0), the dome mesh replaced by a flat black backing while a YouTube channel plays (CRT material to its "off" glass; scanlines, curvature and glow never apply to the rect). Width = the glass width from `TV_LAYOUT`.
- **Watch pose:** face-on to the glass, the camera translated parallel to the glass plane (no rotation) so the whole set fits within 95 per cent of the viewport width and the glass sits left of centre; the glass is about 55 per cent of the viewport width, so it reaches 480 px at a viewport of about 873 px. Under that, focus layout. The knob panel stays in frame, the channel knob is usable. Idle and channel 0 keep v1's framing and the v1 camera behaviour (creep, orbit) exactly.
- **Placement rules:** CRT effects only on the bezel ring and the surround strip (a thin shader ring: scanline texture at low alpha, soft inner glow at the opening edge); lamp, doily and rug bounds respect the 24 px halo; nothing on the shelf in front of the glass plane. The Occupant: on live channels the haunt output is zero on and around the screen; the wall decal stays at alpha 0.04 at most, static (Calm: none). The Occupant never appears over the rect.
- **Light spill:** a point light in front of the glass at base 0.22 (v1 uses measured mean luminance; for live channels use the generic `spill`), falling on the shelf, cabinet and wall; lamp base 0.15 (steady, no flicker); plus the 300 ms bezel static burst on channel change (1.10).
- **Ambient motion:** none besides spill (the room is a still life; dust motes optional, 20 sprites drifting at under 4 px/s, outside the rect). Frozen in Calm.
- **Audio:** v1's 50 and 100 Hz hum and faint static through the Room sound control; it is no longer the video's sound.
- **Budget:** chunk is v1's tv-room code (counted against v1's budget, not the 60 kB v2 cap); new assets about 0 kB (lamp and rug procedural: under 1,500 triangles, 1 draw call each; tint uniforms).
- **Build complexity: Low.** Reuse. Risks: the off-axis translated watch pose and hiding the dome, the bezel-only CRT ring, keeping v1's tests green on channel 0.

### 5.2 Cinema

- **Mood:** an empty single-screen auditorium seen from the middle of the house, a few seats from the front, as the film is about to start.
- **Palette (colour):** velvet seats `#6e1f2b`; walls `#1c1418`; gold trim `#b08d4a`; carpet `#241a1d`; curtain `#4a1620`; aisle lights `#ffcf80`; exit sign `#3ca35c` (text "EXIT"). B&W reads: seats dark-mid, curtains darkest, trim lightest prop, walls near black. The screen surround is black.
- **Props:** a proscenium frame and open curtains with heavy folds at left and right of the screen; rows of seat backs in the lower foreground (instanced, 80 seats); wall sconces down the sides; floor aisle lights; a projector-beam glow in the air; two or three audience head silhouettes in the lower corners.
- **Anchor:** flat 16:9, 6 m wide, 12 m away, centred, face-on, vertical centre slightly above the camera eye. No curved screen.
- **Watch pose:** fill 0.72 of the viewport width (max height 0.78), centred; room visible left, right and below.
- **Placement rules:** the projector beam is visible only above the proscenium top and ends at the ceiling line; it never enters the rect's projected area. Audience heads and seat backs stay at least 24 px below the rect bottom and at least 24 px outside its sides (heads clamp to this in view space). Curtains and sconces stay outside the rect plus halo. Nothing between camera and screen except air.
- **Light spill:** a warm-white bounce on the front rows, the carpet and the curtains, base 0.30, with `spill`; a faint rim on the proscenium.
- **Ambient motion:** dust motes in the beam (above the rect only), audience heads sway at most 6 px at periods of 4 s or more, the exit sign steady. Frozen in Calm.
- **Audio:** room tone (filtered noise at 120 Hz), a seat creak every 20 s or more at -30 dB.
- **Budget:** JS 35 kB gzip; assets about 320 kB (seat atlas 512, curtain normal 512, dust sprite 64); instanced seats; 40 draw calls; 40k triangles.
- **Build complexity: Low to medium.** Instancing and the beam cone are the only non-trivial parts; the beam must be clipped by a clip plane at the ceiling line.

### 5.3 Car / drive-in

- **Mood:** a parked car at a drive-in on a warm night, you in the driver's seat, the giant screen across the lot.
- **Palette (colour):** night sky `#0b1226`; screen tower and frame `#2a2f3a`; dashboard `#14161a` with amber dials `#ffb347`; tail-light pools `#b02a2a`; lot `#1a1c22`; snack-bar glow `#e8c26a`. B&W reads: sky and dash darkest, screen tower mid, dial glow and snack-bar glow lightest.
- **Props:** the dashboard and steering wheel along the bottom, A-pillars at the left and right edges, rows of parked car roofs in the lot (silhouettes, no marques), a snack-bar building to one side, light poles, a few moths.
- **Anchor:** flat 16:9, 14 m wide, 40 m away, high in the frame; the camera is low. The windscreen is open air: no glass mesh is rendered over the screen area, no smudges, no reflections, no raindrops.
- **Watch pose:** fill 0.66 of the viewport width (max height 0.78), centred; A-pillars and the dash frame it. Fixed relative to the viewer (a car cannot move the screen).
- **Placement rules:** the rear-view mirror is not modelled in the central zone (if wanted, it sits to the upper right, at least 24 px above the rect top and outside its right edge by 24 px); the steering wheel's top edge stays at least 24 px below the rect; wipers are parked below the dash line and never sweep; parked cars sit on the lot below the screen's bottom edge and clear of the halo; nothing crosses the rect.
- **Light spill:** soft grey bounce on the dashboard top and the hood area (a flat gradient quad, not a reflection), base 0.25 with `spill`; other cars' tail-lights steady.
- **Ambient motion:** moths flutter around the pole lights (at the sides, 0.5 to 1 Hz wing-beat is not a luminance event as they are small sprites); one parked car's interior light fades on or off slowly (at most once a minute, 8 s fade); stars faint. Frozen in Calm.
- **Audio:** crickets (amplitude-modulated 4.5 kHz bursts), a distant door every 40 s or more at -32 dB.
- **Budget:** JS 45 kB; assets about 520 kB (dashboard bake 1024, car-roof atlas 512, snack bar 512); 55 draw calls; 70k triangles.
- **Build complexity: Medium.** The car interior is procedural; the hard rules are the clear windscreen and the camera set low enough that the screen is high and clear.

### 5.4 Open-air screen

- **Mood:** a park or field at night, a rigged screen on poles, beanbags and string lights: a pop-up summer cinema.
- **Palette (colour):** night sky `#101830`; horizon glow `#3a2b4a`; grass `#20301f`; string lights `#ffd9a0`; beanbags `#b24a3a`, `#3f6f8a`, `#c9a24a`; truss `#0a0a0a`; moon `#e9ecf2`. B&W reads: sky darkest, grass dark, string lights and moon lightest, beanbags mid with distinct greys.
- **Props:** a black truss frame around the screen with a 0.15 m border; two vertical poles with string-light lines to the left and right; a line of tree silhouettes on the horizon; beanbag silhouettes and a picnic blanket in the lower foreground; a moon and stars.
- **Anchor:** flat 16:9, 8 m wide, 15 m away, centred.
- **Watch pose:** fill 0.70 (max height 0.78), centred, the truss visible around the rect.
- **Placement rules:** string-light lines run on the sides and, if one crosses above, its lowest sag point stays 24 px above the rect; beanbags and heads below the rect by 24 px; no tree or pole in front of the rect; no banner or flag across it.
- **Light spill:** a soft white wash on the grass and beanbags in front of the screen (gradient quad, base 0.28, `spill`); string-light bulbs steady.
- **Ambient motion:** star twinkle at 0.3 to 0.9 Hz and at most 8 per cent alpha, string lights sway with a 6 s period, grass sway, 12 fireflies drifting at the sides (never crossing the rect). Frozen in Calm.
- **Audio:** crickets and gentle wind, a far murmur.
- **Budget:** JS 40 kB; assets about 340 kB (grass atlas 256, tree silhouette 512, firefly sprite); 45 draw calls; 50k triangles.
- **Build complexity: Low to medium.** Instanced grass and a procedural sky.

### 5.5 Rainy-night bedroom

- **Mood:** cosy, late at night, rain on the window; you are sitting up on the bed with the blanket over your knees.
- **Palette (colour):** wall dusk indigo `#3a3f5c`; lamp `#ffb86b`; blanket `#6a5a7a`; window rain light `#5a7a9a` with warm bokeh `#e8a860`; wood `#4a3526`; screen surround `#0a0a0a`; mug `#c9a24a`. B&W reads: wall mid-dark, window bokeh and lamp lightest, blanket mid.
- **Props:** a window with rain streaks and blurred city bokeh on the left; a bedside lamp and mug with steam on the right, low; a low chest holding the wall-hung flat TV above it; a small plant; abstract wall art (shapes only); fairy lights along the top of the left wall; blanket at the bottom edge; a sleeping cat silhouette at the bottom right.
- **Anchor:** flat 16:9, 1.2 m wide, 2.2 m away, centred slightly right of the window.
- **Watch pose:** fill 0.60 (max height 0.78), centred; the window and lamp visible either side.
- **Placement rules:** lamp shade top, mug steam, plant leaves and fairy lights stay outside the rect plus the 24 px halo (fairy lights run along the left wall and the top left corner only); the blanket and cat stay below the rect by 24 px; the window frame is to the left, never across the rect.
- **Light spill:** a cool soft wash on the wall around and the blanket (base 0.30, `spill`), lamp warm steady.
- **Ambient motion:** rain sliding down the window (shader), bokeh breathing at 0.1 to 0.3 Hz at 10 per cent, steam rising, the cat's breathing (scale 1 per cent, 4 s period). Frozen in Calm (drops at rest).
- **Audio:** rain (filtered noise) and, rarely, a soft low thunder every 45 s or more (attack at least 2 s, -30 dB).
- **Budget:** JS 30 kB; assets about 230 kB (rain normal 256, bokeh 512, interior bake 1024 grey and colour); 35 draw calls; 25k triangles.
- **Build complexity: Low.** Flat planes and two shaders. Best fit for phones.

### 5.6 Chai stall with cricket

- **Mood:** an evening tea stall at a roadside in an Indian town; steam, a bare bulb, a small TV on a bracket, a crowd watching the match. "Cricket" is whatever the video is: no sport footage ships.
- **Palette (colour):** stall wood `#2f5f7a`; tin roof `#6b5a4a`; brick `#8a4b3a`; bare bulb `#ffcf70`; steel kettle `#b8bcc2`; glasses `#c7a15a`; clothes ochre `#c28b2c`, white `#e8e6df`, maroon `#7a2630`, indigo `#2e3f7a`; night `#0c1020`. B&W reads: night and roof darkest, bulb and steel lightest, clothes at four distinct greys.
- **Props:** a counter with a kettle, steel glasses, biscuit jars and a bunch of bananas; a hand-painted generic "CHAI" sign (baked texture, no brand); two hanging bulbs; stools; a bicycle leaning at the left; a crowd of 6 to 7 standing silhouettes (vector cut-outs, flat colours, no faces) in three variants; steam; a small TV on a bracket on the stall's front.
- **Anchor:** flat 16:9, 0.7 m wide, 2.5 m high at the stall front, 2.2 m away from the camera.
- **Watch pose:** fill 0.58 (max height 0.78); a small screen, so focus layout is offered under about 828 px viewport width.
- **Placement rules (the hardest):** crowd silhouettes are placed in the lower foreground and at the sides in view space, never in front: head tops stay at least 24 px below the rect bottom and at least 40 px outside its sides; sprite sway is clamped to 4 px; the bulbs and the bracket stay outside the halo; steam rises from the counter below the rect and fades before the rect's bottom edge halo; the bicycle and sign stay outside the halo. Crowd members never walk across.
- **Light spill:** warm bulb light on the counter and crowd (base 0.35, steady) plus a cool spill from the TV onto the crowd's upper bodies (base 0.25, `spill`).
- **Ambient motion:** steam from kettle and glasses, the hanging bulb swings (plus or minus 2 degrees, 5 s period), a moth around the bulb, crowd sway at 4 s or more periods, a distant headlight sweep along the far left wall every 30 s (8 s sweep, small area, steps under 0.05). Frozen in Calm.
- **Audio:** street murmur, a spoon on a glass every 8 to 15 s at -30 dB, a distant horn every 40 s.
- **Budget:** JS 55 kB; assets about 1.0 MB desktop and 0.7 MB mobile (crowd and prop atlas 1024, sign 256, steam sprite); 80 draw calls using instanced sprites; 60k triangles.
- **Build complexity: High.** Instanced sprite crowd with a view-space halo clamp and original silhouette art drawn procedurally. First to cut if scope shrinks.

### 5.7 Train window seat

- **Mood:** a long-distance coach at dusk; you are in the window seat, the landscape sliding by, tea in a steel tumbler, a screen on the partition in front.
- **Palette (colour):** seat blue `#2d4a7a`; laminate `#cfc3a5`; steel `#9aa3a8`; window sky from `#e9a05a` at the horizon to `#2b3a6b` above; hills `#2a2f4a`; poles `#14141a`; curtain `#7a2630`. B&W reads: sky lightest at the horizon, hills dark, laminate light, seat mid-dark.
- **Props:** a window on the left with three parallax layers (far hills, mid trees, near poles); a half-drawn curtain; the partition panel with the screen mounted and a reading light; a luggage rack at the top edge; a steel tumbler and a folded paper on a tray at the lower right; a seat headrest at the bottom edge.
- **Anchor:** flat 16:9, 0.45 m wide, 0.9 m away, centred on the partition. Fixed to the viewer: no camera sway, no whole-scene shake.
- **Watch pose:** fill 0.60 (max height 0.78).
- **Placement rules:** only the scenery outside the window moves. The window frame and curtain sit left of the rect plus 24 px; the luggage rack stays above the rect by 24 px; the tumbler, tray and headrest stay below by 24 px; the reading light is above-right of the rect and outside the halo; the near poles never leave the window area.
- **Light spill:** a warm bounce on the partition around the screen and the tray (base 0.28, `spill`); the window's sunset light shifts the interior warmth slowly (a 20 s drift, amplitude 0.05).
- **Ambient motion:** parallax scrolling in the window (far 8, mid 25, near 90 px/s at 1080 px height): near poles pass at 0.8 Hz at most and are under 1.5 per cent of the window width, each pass a tiny area change; steam from the tumbler; the curtain moves slightly (period 6 s). Frozen in Calm (a still landscape).
- **Audio:** a rhythmic track clack synthesised at 2.2 clicks a second, at -30 dB, with a low rumble.
- **Budget:** JS 45 kB; assets about 560 kB (three parallax strips 2048 x 256 KTX2 at about 60 kB each, interior bake 1024, tumbler and tray); 40 draw calls; 30k triangles.
- **Build complexity: Medium.** Seamless parallax strips (procedural noise silhouettes), the face-on partition, and the rule that nothing else moves.

### 5.8 Space deck

- **Mood:** an observation deck on a quiet orbital station: a bulkhead with a wide flat panel, windows on both sides onto Earth and stars, the hush of a long watch.
- **Palette (colour):** hull `#c9ced6` and dark panels `#2a2f3a`; Earth ocean `#2f6fb5`, clouds `#e8eef7`, sunrise limb `#ffb15e`; stars `#ffffff`; accent lights `#3fe0c0`; rail `#8a929c`. B&W reads: stars and sunrise limb lightest, hull light-mid, panels dark, Earth mid with bright clouds.
- **Props:** a bulkhead wall with the screen at its centre, two tall window slots at left and right showing Earth's curve and stars, a handrail along the bottom, floor light strips, small floating dust and a few loose cables in the lower corners.
- **Anchor:** flat 16:9, 3 m wide, 5 m away, centred on the bulkhead. The panel is flat even though stations may have curved walls.
- **Watch pose:** fill 0.64 (max height 0.78), the windows visible at both sides.
- **Placement rules:** the rail stays 24 px below the rect; floating dust is confined to the window slots and the lower region and never crosses the rect; cables hang at the lower corners; window frames stay outside the halo; no lens flare or glare is drawn across the rect.
- **Light spill:** a cool-white bounce on the rail, the floor strips and the bulkhead around the screen (base 0.22, `spill`); sunrise warmth is a slow 40 s drift in the windows only.
- **Ambient motion:** Earth rotates slowly (one turn per 120 s), stars drift, floating dust, the sunrise glow shimmers at 0.1 Hz and 5 per cent. All frozen in Calm.
- **Audio:** a deep drone (two detuned sines at 55 and 55.4 Hz) and a faint ventilation noise, -30 dB.
- **Budget:** JS 30 kB (procedural sky and Earth shader); assets about 90 kB; 25 draw calls; 20k triangles. Earth, stars and clouds are procedural noise; no NASA imagery is used, so no credit is needed for the art.
- **Build complexity: Low.** One shader and a few planes.

### 5.9 Summary tables

| Room | Fill (desktop) | Anchor | Watch pose special | Build | JS (gz) | Assets (desktop) |
|---|---|---|---|---|---|---|
| tv-room | 0.55 (glass), set fits 95% | 4:3 | camera translated, set in frame | Low | v1 + 0 | 0 |
| cinema | 0.72 | 16:9 | centred | Low-medium | 35 kB | 320 kB |
| car / drive-in | 0.66 | 16:9 | windscreen clear | Medium | 45 kB | 520 kB |
| open air | 0.70 | 16:9 | truss visible | Low-medium | 40 kB | 340 kB |
| bedroom | 0.60 | 16:9 | window and lamp beside | Low | 30 kB | 230 kB |
| chai stall | 0.58 | 16:9 | small screen, focus under 828 px | High | 55 kB | 1.0 MB |
| train | 0.60 | 16:9 | fixed to viewer | Medium | 45 kB | 560 kB |
| space deck | 0.64 | 16:9 | windows either side | Low | 30 kB | 90 kB |

2D skins (backdrop and frame, B&W with the Colour tint in brackets): tv-room dark grey, walnut frame (warm brown); cinema near-black with maroon edges (maroon); car dark blue-black with a thin amber line (amber); open air deep navy with a dotted string-light top edge (warm white dots); bedroom indigo with a lamp-glow corner (amber glow); chai stall brick-brown with a blue lower band (brick, blue); train blue-grey with a sunset strip (orange to blue); space black with a faint arc (blue arc).

## 6. YouTube compliance as design rules

### 6.1 Rules

| # | Design rule | Where it shows |
|---|---|---|
| R1 | **No overlays.** Nothing site-made is drawn, placed, animated or hovered over any part of the player rect, including scene art, ghost, crowd, glare, reflections, buttons and tooltips. The player is a DOM layer above the canvas; every control, panel, tooltip and HUD plate lays out outside the rect; panels that cannot do so pause and hide the player while open. | 2.2, 2.3, 5.0 |
| R2 | **No filters.** No CSS filter, blend mode, mask, clip-path, opacity below 1 or 3D transform on the iframe or any ancestor. Colour/B&W and dimming apply to the canvas element only, which is a sibling and not an ancestor. | 1.8, 2.4 |
| R3 | **Size.** Player rect at least 480 x 270 CSS px where the screen allows, focus mode otherwise, never under 200 x 200; at 360 px wide, 360 x 240. | 2.2, 2.4 |
| R4 | **Controls visible.** The player's own controls, including the captions button, are never hidden, cropped or covered. The info row and dock sit below, not over. | 2.3 |
| R5 | **Autoplay.** Starts muted, only after a viewer action, only one player, only when more than 50 per cent visible (it is 100 per cent by construction), and never on page load. In Calm, a still card first. | 1.6, 1.7 |
| R6 | **Attribution.** Every playing channel shows its name, owner tag and a "Watch on YouTube" link in the info row; YouTube branding inside the player is left alone; the Credits panel lists every channel and owner. | 1.12, 1.13 |
| R7 | **Terms and privacy.** The first-play notice links the YouTube Terms of Service and the Privacy page; the Privacy page names YouTube API Services, links the Google Privacy Policy and the revoke page, and says the site itself collects no personal data. | 1.6, 6.3 |
| R8 | **Errors.** Each error class has a plain, in-character message and a next action; the error class is shown in text only. | 1.9 |
| R9 | **No charging, no ads, no download.** Nothing near the player sells, promotes or sponsors; no save, record or audio-separate function exists. | review |
| R10 | **Region.** Region blocks show "not available in your region" wording and no workaround. | 1.9 |
| R11 | **One player.** A single iframe for the visit; channel change swaps its video; rooms only move its CSS rect. | 1.3, 1.10 |
| R12 | **Third-party timing.** Nothing contacts a YouTube origin before Continue on the notice. | 1.6 |

### 6.2 Third-party disclosure

A "Third parties" section on the Privacy page lists origins, purpose and timing in a table: `www.youtube.com` (the player loader script, after Continue), `www.youtube-nocookie.com` (the player frame, after Continue), `i.ytimg.com` (thumbnails, only if the site ever shows them, which the current design does not unless the user opts in, Q-D1). Plain text, 16 px, 4.5:1.

### 6.3 Privacy page copy (`privacy.html`, for product-manager approval)

> **Privacy, third parties and accessibility**
>
> **What this site collects.** Nothing. Transmission Pending sets no cookies, has no accounts, runs no analytics and sends nothing about you to any server we control. It is a static site with no backend.
>
> **What it remembers.** Your choices (room, colour, Calm mode, focus mode and whether you have seen the notice) are kept in your browser's session storage for this visit only. They are cleared when you close the tab. A link you paste is kept in memory only and is not stored or logged.
>
> **YouTube.** When you choose a channel or paste a link and press Continue, this site loads the YouTube player. This site uses YouTube API Services. The video and its sound come from YouTube and the channel's owner, not from this site. YouTube may set cookies or collect data once the player loads. We load it from youtube-nocookie.com, which reduces this but does not remove it. By watching you are bound by the YouTube Terms of Service (https://www.youtube.com/t/terms). The Google Privacy Policy is at http://www.google.com/policies/privacy. You can revoke this site's access to your Google data, if any, at https://security.google.com/settings/security/permissions.
>
> **When your device contacts third parties.** Only after you press Continue on the notice. Before that, every request goes to this site. After it:
>
> | Origin | What for |
> |---|---|
> | www.youtube.com | the player loader script |
> | www.youtube-nocookie.com | the player itself |
> | i.ytimg.com | thumbnails, only if shown (not at present) |
>
> **Channels.** The channel guide lists channels that publish live video on YouTube. Names are used only to identify the source. This site does not host, copy, record, relay or change any video. State-run channels are labelled. Doordarshan and Sansad TV channels are shown through their official YouTube embeds. NASA material, if listed, is credited to NASA and does not imply its endorsement.
>
> **Flashing and accessibility.** We make the site to WCAG 2.2 level AA. We cannot change or check the video that YouTube plays, so third-party video is outside our conformance claim: it may be loud or contain flashing. Calm mode starts nothing by itself, freezes the rooms, and asks for captions where the player allows. You can stop any video with Stop at any time. Captions and other controls are in the player.
>
> **Contact and source.** The code is public: https://github.com/Patlu29/transmission-pending-tv.

Notes: the partial-conformance statement follows ADR 0011. No email address is invented; the user decides whether to add one.

## 7. Accessibility (WCAG 2.2 AA for the new UI)

| Criterion | Approach |
|---|---|
| 1.1.1 Non-text | Rooms are decorative and `aria-hidden`; each room has a text description spoken once on entry via the live region and shown in the picker ("Cinema. A dark empty auditorium. The screen is straight ahead.") |
| 1.2.x Captions | Third-party; Calm requests captions on (`cc_load_policy=1`); the notice and the Privacy page say captions are in the player |
| 1.3.1, 1.3.2 | Guide as headed lists; picker as a radiogroup; DOM order matches visual order; info row immediately after the iframe |
| 1.4.1 Colour | State is never colour alone: LIVE/OFF AIR labels, toggle bars and text results |
| 1.4.3, 1.4.11 | 4.5:1 text, 3:1 controls and focus rings; scrim plates behind any text over the canvas; checked in Colour mode too |
| 1.4.4, 1.4.10 Reflow | Guide, picker, notices and info row reflow to one column at 320 CSS px and at 200 per cent zoom; the focus layout is the narrow layout |
| 1.4.12 Text spacing | DOM text tolerates increased spacing; the teletext guide is DOM, so it follows |
| 1.4.13 Hover/focus content | Tooltips and the knob tags are dismissible, hoverable and persistent; none appears over the rect |
| 2.1.1, 2.1.2 | Everything keyboard operable; the iframe is not a trap because Tab leaves it and a skip link precedes it; dialogs trap with Esc |
| 2.1.4 Shortcuts | Letter shortcuts only inside the stage or dock focus, never in text fields; listed in the Keyboard help |
| 2.2.1, 2.2.2 | The still card is not timed; the intro keeps Pause; ambient room motion is decorative (not information) and is off in Calm |
| 2.3.1 | Site-made effects follow v1 and section 8; third-party video is outside conformance and disclosed (notice and Privacy) |
| 2.4.3, 2.4.7 | Defined focus order (3, item 6); 3 px focus ring with halo |
| 2.4.11 Focus not obscured | The dock, HUD, info row and panels never cover a focused element; panels that would cover the iframe pause and hide it; the sticky sheet header on phones is accounted for with scroll padding |
| 2.5.1, 2.5.7 | No path-based or drag-only gestures: orbit has arrow keys and Reset; every 3D action has a dock key |
| 2.5.3 Label in name | The visible key text is contained in the accessible name: the Room key's visible text is "Room" and its accessible name is "Room: change the room" |
| 2.5.8 Target size | 44 x 44 px for every site control; paired targets 8 px apart |
| 3.2.x Predictable | Opening a panel never moves focus unpredictably: focus goes to the panel's heading or first control, and returns to the opener on close; room change never starts or stops the video by itself except pause and resume described in 1.3 |
| 3.3.1, 3.3.3 Errors | The paste field and every error card say what is wrong and how to fix it, in text, with `role="alert"` |
| 3.3.7 Redundant entry | A pasted link is not asked for twice; the notice is shown once per visit |
| 4.1.2 Name, role, value | Toggles `aria-pressed`; disabled keys `aria-disabled` with a visible reason; the iframe has `title="<Channel name>, live video from YouTube"` |
| 4.1.3 Status messages | One polite live region: "Room: Cinema", "Room in colour", "Channel 12, NAME, live", "Off air. Cannot be started.", "Stopped. Back in the room.", "Loading Cinema, 40 per cent"; errors use `role="alert"` once |

Other behaviour: Calm and OS reduced motion are one flag (v1). Forced-colours mode: the dock and panels keep borders; the room is decorative. Screen-reader journey without 3D: the 2D mode is a plain page (header, guide, paste, player, info row, footer links). The environment and 2D skins affect only decoration. Language: `lang="en-AU"` on the page; channel names are proper nouns; language names appear as words in the guide.

## 8. Motion and flash rules for v2 additions

These add to v1 7 and apply to anything the site draws, never to the player.

| Item | Limit |
|---|---|
| Ambient motion | Any region of the surround changes by at most 0.05 of relative luminance per 100 ms for areas over 87,000 px; nothing flashes more than 3 times a second; light-like animations use `spill` (at most 1.3 Hz components) |
| Light spill | Plus or minus 13 per cent around a base; mean unchanged; not tied to the video |
| Channel-change cue | 300 ms, once per 1000 ms at most; tv-room: static on the bezel ring only (rise at most 0.10 of that small area); other rooms: an edge vignette dip of at most 15 per cent; instant cut in Calm |
| Room switch | A 300 ms cross-dissolve between rooms; a luminance step that would reach 0.10 on a 341 x 256 tile uses the dissolve (v1 7.1 BUG-3 rule); Calm: an instant cut |
| Colour switch | 600 ms ease of the grayscale filter, instant in Calm; mean luminance changes by at most 0.05 |
| Parallax and fast props | The train's near poles at most 0.8 Hz and under 1.5 per cent of the window width |
| Calm | All of the above off: frozen rooms, no cue, no tween |

QA: the v1 flash tests run on every room with a still frame behind the player rect (the iframe region is excluded from sampling because it is third-party), and an overlap grid test confirms nothing site-made intersects the rect.

## 9. Proposed tokens (for `src/styles/tokens.css`, added in the build phase)

This pass is docs only; the tokens are proposed here and I will add them when the build starts. All greyscale (site chrome stays greyscale in every room).

| Token | Value | Use |
|---|---|---|
| `--player-min-w` / `--player-min-h` | 480px / 270px | Minimum for the room layout |
| `--player-floor` | 200px | Hard floor |
| `--player-phone-min-h` | 240px | Focus layout height floor on phones |
| `--info-row-h` | 40px | Info row height (room layout) |
| `--info-row-gap` | var(--space-2) | Gap under the rect |
| `--rect-halo` | 24px | Clear zone around the rect for props |
| `--panel-w` | 560px | Guide and picker width |
| `--header-h-focus` | 48px | Focus layout header |
| `--duration-room-dissolve` | 300ms | Room switch (0 in Calm) |
| `--duration-colour` | 600ms | Colour filter ease (0 in Calm) |
| `--duration-channel-cue` | 300ms | Channel change cue (0 in Calm) |
| `--spill-amp-1` / `--spill-amp-2` | 0.08 / 0.05 | Spill amplitudes |
| `--spill-hz-1` / `--spill-hz-2` | 0.6 / 1.3 | Spill rates (max 2) |
| `--focus-backdrop-brightness` | 0.6 | Canvas brightness in focus layout |

## 10. Open questions and conflicts for the user

| # | Question | Default |
|---|---|---|
| Q-D1 | The Calm still card is meant to be a "thumbnail card" (V2-FR-29), but ADR 0011's CSP allows no `i.ytimg.com` image. Use a site-drawn card (no YouTube image), or allow thumbnails after the notice? | Site-drawn card, no thumbnail |
| Q-D2 | If scope must shrink, the requirement keeps tv-room, cinema, car and open air first. Bedroom and space deck are the cheapest and best on phones, chai stall and train the dearest. Swap the car for bedroom? | Keep the requirement's four; cut chai stall and train first |
| Q-D3 | V2-FR-7 lists playlist links; ADR 0011 accepts only single-video forms. Reject playlists with a message? | Reject, as the ADR |
| Q-D4 | In tv-room with a YouTube channel, should a Colour variant exist (warm 1970s tints, no new assets), or stay B&W only like the ADR's note ("TV room stays greyscale")? | Colour variant with tints; channel 0 stays B&W |
| Q-D5 | Resuming a paused video after a room switch needs the browser to allow `playVideo()` without a fresh gesture. If a browser refuses, the player shows YouTube's play button inside the player. OK? | Yes; no site overlay on the player in that case |
| Q-D6 | Guide-channel naming, "OFFICIAL EMBED" tag on DD and Sansad, and the privacy copy need product-manager review of terms (ADR owner list). | Review before launch |
| Q-D7 | The tv-room channel knob keeps v1's "next diary page" behaviour on channel 0 until the last page, then goes to channel 1. This preserves v1 tests but is slightly odd. Alternative: knob always changes channel and page nav stays on the dock. | Keep v1 behaviour first |
| Q-D8 | Room sound (ambient audio) is separate from the video sound and off by default; it plays only when the video is muted or stopped. OK, or drop it from the first release (it is a Could)? | Keep, behind More |

Conflicts with existing text, resolved here: (a) v1 digit entry in the diary versus channel digits (3, item 1); (b) v1 arrows orbit and page versus channel Up/Down (3, items 2 and 3); (c) the v1 "camera creep" does not run on live channels (the watch pose is static, ADR 0011); (d) V2-FR-24 "remembered for the visit" uses session storage, which is not a cookie, matching v1's Calm persistence.
