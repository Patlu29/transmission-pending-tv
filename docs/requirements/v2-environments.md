# v2 requirements: viewing environments and YouTube channels (FINAL SCOPE)

Status: approved direction (2026-11-11). This replaces docs/requirements/v2-live-channels.md (archive channels plus private relay), which is now superseded. v1 (haunted-TV ghost story, in QA) is not changed. v1 ships and is tagged v1.0 first; v2 is built on a branch afterwards.

Sources: docs/project-status.md, docs/research/embeddable-channels.md, docs/research/viewing-environments.md.

## 0. Decisions (final, from the user)
| # | Decision |
|---|---|
| D1 | v2 is a multi-environment player for streams from other sites. The site does not host, relay or re-encode any stream |
| D2 | Playback is through official embeds only, in practice the YouTube IFrame Player |
| D3 | Sources: a curated channel guide of verified official live channels, stored by channel ID, plus paste-a-link for the viewer's own YouTube link |
| D4 | Eight environments in the first release: 1970s TV (v1), cinema theatre, car / drive-in, open-air screen, rainy-night bedroom, chai stall with cricket, train window seat, space deck. Later reskins: single-screen hall, Doordarshan living room, Indian rooftop |
| D5 | Channel 0 stays the Occupant's story, in the 1970s TV environment, with the full B&W CRT treatment |
| D6 | Colour/B&W is a viewer option that changes the environment only. YouTube video is never filtered or overlaid |
| D7 | DD and Sansad TV channels are included through their official YouTube embeds. The team drafts a permission email (Appendix A) for the user to send to Prasar Bharati and Sansad TV |
| D8 | Live video IDs are resolved by a scheduled GitHub Action using a YouTube Data API key held as a repo secret; it publishes the channel guide. The public site stays static with no backend |
| D9 | The earlier archive channels, private login backend, tuner relay and runtime brightness limiter are dropped |

## 1. Overview
v2 turns the site into a place to watch other people's live channels in a setting of the viewer's choice. The viewer picks an environment (a 1970s set, a cinema, a car at a drive-in, a rainy bedroom and so on), picks a channel from a curated guide or pastes a YouTube link, and the official YouTube player appears on the screen inside that scene. The scene is styled around the player and never on it. Channel 0 remains the Occupant's ghost story on the 1970s set.

## 2. Goals
| # | Goal | Measure |
|---|---|---|
| V2-G1 | Viewers watch a real channel in at least 8 environments | Each environment plays a guide channel and a pasted link |
| V2-G2 | The site stays within YouTube's rules | Every compliance requirement in section 6 has a passing automated or manual check |
| V2-G3 | The site never hosts or alters a stream | No stream bytes pass through the site's origin; no filter or overlay touches the player (checked) |
| V2-G4 | v1 qualities survive | Channel 0, the CRT look on channel 0, Calm mode, the ghost story and the facts pipeline work unchanged |
| V2-G5 | The guide stays current without a backend | The scheduled job refreshes live video IDs; stale entries show a clear message |

## 3. How v2 fits with v1
| Area | Proposal |
|---|---|
| Default | First visit lands on the 1970s TV, on channel 0, exactly as v1 |
| Channel 0 | The Occupant's story and diary, available only in the 1970s TV environment, with the full B&W CRT treatment |
| Live channels in the 1970s TV | The video appears in the screen opening, flat and unfiltered. CRT scanlines, glow and curvature are applied to the bezel and surround only, never to the player |
| Other environments | No channel 0; they show guide channels and pasted links |
| Haunting | The Occupant appears only in the 1970s TV environment, around the player (in the room, on the bezel, in the static between channels), never over the player |
| Facts | v1 fact pipeline (FR-9 to FR-14) is unchanged. The channel guide is data; the story mentions it only through the same pipeline |

## 4. Conflicts with existing requirements
| # | Existing requirement | Conflict | Resolution |
|---|---|---|---|
| C1 | NFR-7 (no third-party requests, same-origin only) | The player and thumbnails come from YouTube | **Amended for v2:** an allow-list of youtube.com, youtube-nocookie.com and ytimg.com (and its subdomains), contacted only after the visitor picks a channel or pastes a link. Channel 0 and first view stay same-origin. Disclosed on a visible page (V2-FR-33) |
| C2 | NFR-8 (no backend, static bundle) | Live video IDs change | **Kept.** The site stays static. A scheduled GitHub Action resolves IDs at build time and publishes the guide. No runtime backend and no relay |
| C3 | FR-2 and FR-3 (greyscale, CRT effects) | Video is colour and cannot be filtered | **Amended for v2:** greyscale and CRT effects apply to channel 0, site UI and the 1970s TV surround. The video is never filtered. Environments follow the Colour/B&W option (V2-FR-14). Site text and UI chrome stay greyscale in every environment |
| C4 | FR-19 and WCAG 2.3.1 (flash safety) | Live YouTube content may flash and cannot be filtered | The site cannot make third-party video flash-safe. Site-made effects (burst, light spill, ghost) keep v1 limits. A notice before first play, Calm mode defaulting to click-to-play with a still thumbnail card, and one-action Stop mitigate the rest (V2-FR-28 to V2-FR-30) |
| C5 | FR-22 (audio off by default) | Live channels are mostly sound | Playback starts muted; the viewer unmutes with the player's own controls or a site control. Autoplay follows YouTube rules (V2-FR-21) |
| C6 | NFR-13, FR-X3 (no broadcaster marks) | Channel names and the players' own marks appear | Site-made artwork carries no broadcaster logos or test cards. The guide shows channel names as text, and YouTube's and the channel's own branding appear only inside the player. Names are used only to identify the source |
| C7 | NFR-3 (5 MB first view) | Eight environments are heavy | The first view stays within NFR-3 on the 1970s TV. Each other environment loads only when chosen, with its own stated size cap set by the architect |
| C8 | NFR-1 (frame rate) | A live iframe plus a 3D scene costs more | Frame-rate targets hold with the player playing; if not, scene quality drops first, never the player |
| C9 | FR-18 and NFR-6 (text alternatives, WCAG AA) | Live speech has no site transcript | YouTube captions are available through the player's own controls (V2-FR-32). The site does not claim captions it cannot verify |
| C10 | FR-20 (2D fallback) | 2D mode must still work | The 2D mode is a plain page with the guide, the paste-a-link box and the player, with the same compliance rules |
| C11 | FR-17 and FR-31 (reduced motion, Calm mode) | Environments are animated | Calm and reduced motion give static environments and no autoplay, with a still thumbnail card |
| C12 | NFR-12 and public repo | An API key is needed | The key lives only as a GitHub secret. A secret scan runs in CI (V2-FR-12) |

## 5. Functional requirements: channels and viewing

### Guide and sources
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-1 | Must | The site hosts, relays, proxies, records or re-encodes no stream; video plays only inside the official YouTube IFrame Player |
| V2-FR-2 | Must | The channel guide is curated data. Each entry stores: label, YouTube channel ID, owner type (broadcaster, public service, state media, other), country, genre, date last verified, and a link to the channel page. Video IDs are not stored by hand |
| V2-FR-3 | Must | A scheduled GitHub Action resolves each channel's current live video ID (with an embeddable check) using a YouTube Data API key held as a repo secret, and publishes the guide as static data |
| V2-FR-4 | Must | The Action stays within the YouTube Data API quota and keeps the last known good ID for an entry when a refresh fails; the guide shows when it was last refreshed |
| V2-FR-5 | Must | An entry with no current live stream, or whose video is not embeddable, shows as "off air" in the guide and cannot be started |
| V2-FR-6 | Must | The first guide holds only channels the research marks high confidence, plus the DD and Sansad TV channels in D7; medium or low confidence sources, iptv-org playlists, scraped HLS URLs and WAVES are excluded |
| V2-FR-7 | Must | The viewer can paste a YouTube link (watch, live, youtu.be, embed or playlist forms); the site extracts the ID with a strict pattern, accepts only YouTube hosts, and rejects anything else with a plain message |
| V2-FR-8 | Must | A pasted link is held in the browser for the visit only; it is not stored, logged or sent anywhere except to the YouTube player |
| V2-FR-9 | Must | The viewer changes channel by the knob or dock in the scene, Up/Down keys, typing a guide number, or the guide list; all are keyboard and touch operable |
| V2-FR-10 | Should | The guide can be filtered by genre, country and owner type, and shows state-media channels with a visible label |
| V2-FR-11 | Should | The guide marks the DD and Sansad TV channels "official YouTube embeds" and can hide them with a single data change (kill switch) |
| V2-FR-12 | Must | The API key, Cloud project details and any other secret are never in the repo, the bundle or the published guide; a CI secret scan runs on every push |
| V2-FR-13 | Could | Station-ident style teletext guide page in the 1970s TV environment |

### Environments
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-14 | Must | A visible, keyboard-operable Colour/B&W option changes the environment (lighting, materials, palette) and nothing else; the video is never desaturated or tinted. The default is B&W; the state is announced to assistive technology; channel 0 stays B&W |
| V2-FR-15 | Must | The first release has these eight environments: 1970s TV, cinema theatre, car / drive-in, open-air screen, rainy-night bedroom, chai stall with cricket, train window seat, space deck; the viewer can switch between them without reloading |
| V2-FR-16 | Must | In every environment the player sits on a flat, face-on rectangle (no curved, dome or wraparound screens) with nothing drawn, rendered or placed in front of any part of it |
| V2-FR-17 | Must | In every environment the rendered player is at least 480 by 270 CSS px on desktop; where the layout would make it smaller, focus mode is offered (V2-FR-18); it is never below 200 by 200 CSS px |
| V2-FR-18 | Must | Focus mode: on small screens the screen is brought up close, the player fills the viewport width with the environment as backdrop and the player controls visible; it is offered automatically when the player would be under 480 by 270 CSS px, and can be toggled by hand |
| V2-FR-19 | Must | Only one YouTube player exists on the page at a time; switching channel replaces it |
| V2-FR-20 | Must | Environment-specific placement rules: the drive-in windscreen is clear over the screen area; the 1970s TV applies CRT effects to the bezel and surround only; crowd, heads and props in the chai stall, train and bedroom never overlap the player; in the car and train the player stays fixed relative to the viewer and only outside scenery moves; light spill (glow, bounce, reflections) is a generic non-flashing animation and not driven by the video |
| V2-FR-21 | Should | The later reskins (single-screen hall, Doordarshan living room, Indian rooftop) reuse existing scenes (release after the first) |
| V2-FR-22 | Must | Dragging the 3D view never captures the player's own controls: the player area and the controls remain usable by pointer, touch and keyboard, and orbit or look-around is disabled while the pointer is over the player |
| V2-FR-23 | Must | Each environment other than the default loads only when chosen |
| V2-FR-24 | Should | The chosen environment, Colour/B&W option and focus mode are remembered for the visit only (no cookies) |

### Channel 0 and the Occupant
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-25 | Must | In the 1970s TV environment, channel 0 plays the Occupant's story and diary exactly as in v1 (FR-8 to FR-17, FR-24 to FR-33), with the full CRT treatment |
| V2-FR-26 | Must | The Occupant's effects, ghost and haunted text never appear over the player; during live channels they appear only around it |
| V2-FR-27 | Must | A channel change shows a static burst of 200 to 400 ms within the v1 flash limits, drawn on the surround and never over the player; with Calm mode or reduced motion there is an instant cut |

### Safety, accessibility and privacy
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-28 | Must | Before the first YouTube player loads in a visit, a notice says: the video comes from YouTube and the channel's owner, may be loud or contain flashing, may be region-restricted, and YouTube may set cookies or collect data; it offers Continue and Back |
| V2-FR-29 | Must | With Calm mode or prefers-reduced-motion, playback does not autoplay: a still thumbnail card with the channel name appears, and the viewer starts the video |
| V2-FR-30 | Must | A Stop control returns to the scene (or channel 0 in the 1970s TV) within 1 s by pointer, touch or keyboard |
| V2-FR-31 | Must | Keyboard users can leave the player: a visible "back to controls" action and a documented key return focus to the site controls |
| V2-FR-32 | Must | The player's own controls, including YouTube's captions button, are always visible and never hidden or covered |
| V2-FR-33 | Must | A visible page lists the third-party origins contacted (youtube.com, youtube-nocookie.com, ytimg.com), what for, and that they are contacted only after the viewer picks a channel |
| V2-FR-34 | Should | In Calm mode, captions are requested on by default where the player allows it |

## 6. YouTube compliance requirements
Sources: YouTube Terms of Service, API Services Terms, Developer Policies and Required Minimum Functionality (links in the research file). Each is Must.

| ID | Requirement | Check |
|---|---|---|
| V2-YT-1 | No overlays: nothing is drawn, rendered, placed or animated over any part of the player, including the scene, ghost, crowd, glare, reflections, UI buttons and tooltips | Screenshot test of every environment; inspection that no element intersects the player rectangle except the player |
| V2-YT-2 | No filters or modification: the player's video and audio are not altered by CSS filters, blend modes, shaders, masks, opacity, scaling transforms that distort it, cropping, or audio processing | Inspection of computed styles on the player and its ancestors; no filter in the scene graph covers it |
| V2-YT-3 | Minimum size: the player is at least 200 by 200 CSS px and shows at 480 by 270 CSS px or larger wherever the screen allows; controls are visible | Test at 360 px and 1280 px wide in every environment |
| V2-YT-4 | Autoplay: video autoplays only when more than 50% of the player is visible, only one autoplaying player is on the page, it starts muted, and only after a visitor action (picking a channel); never on page load | Test in Chrome, Safari and Firefox |
| V2-YT-5 | Privacy policy: a linked page states that the site uses YouTube API Services, links to the Google Privacy Policy (http://www.google.com/policies/privacy), says how the viewer can revoke access (https://security.google.com/settings/security/permissions), and says the site itself collects no personal data | Page exists, linked from the footer and the notice |
| V2-YT-6 | Terms notice: the site tells the viewer that using the player binds them to the YouTube Terms of Service (https://www.youtube.com/t/terms) and links to them | Notice present |
| V2-YT-7 | Referer policy: the site sends `Referrer-Policy: strict-origin-when-cross-origin` (header or the equivalent meta tag where headers cannot be set) so the player receives a Referer; the architect confirms the hosting method | Request inspection |
| V2-YT-8 | Error handling: the site handles the player errors for invalid parameter, HTML5 error, video not found or private (100), embedding disallowed (101 and 150) and missing referrer or client identity (153), with a plain-text, in-character message per class and a next-channel action | Simulated errors for each code |
| V2-YT-9 | Attribution: every channel shows its name and a visible "Watch on YouTube" link to the channel or video; YouTube's own branding in the player is left as is; a credits page lists the guide's channels and owners | Visible on the guide and while playing |
| V2-YT-10 | No charging, no ads: the site charges nothing to watch, has no ads, sponsorship or paid placement near the player, and does not sell or promote anything alongside the player | Review |
| V2-YT-11 | No downloading or separation: the site offers no way to download, save, record or separate audio from the video | Review |
| V2-YT-12 | Key use: the Data API key is used only by the scheduled job to resolve live IDs and check embeddability; it is restricted in the Google Cloud console to the Data API and the job's use; and it never reaches the browser | Config review and bundle scan |
| V2-YT-13 | No data or promotion: the site does not collect, store or analyse viewer data from YouTube, and does not use YouTube data for ads or for combining with other data | Review |
| V2-YT-14 | Cookies: the player is loaded from the youtube-nocookie.com host where the IFrame API allows it (the `host` option); the site states in the notice and on the privacy page that this reduces but does not remove YouTube's data collection, and that the notice acts as the consent step before any YouTube request | Network inspection |
| V2-YT-15 | Geo and availability: where a video is blocked in the viewer's country (usually reported as errors 100 or 150), the site shows a plain "not available in your region" or "not available" message and does not attempt to bypass the restriction | Test through the error handler |

## 7. Non-functional requirements (v2)
| ID | Priority | Requirement |
|---|---|---|
| V2-NFR-1 | Must | Channel change shows a playing picture or an error page within 3 s on 4G in 90% of tries for working channels |
| V2-NFR-2 | Must | 60 FPS on desktop and 30 FPS on mobile for the scene with the player playing; if not met, scene quality drops before anything else |
| V2-NFR-3 | Must | No YouTube request is made until the viewer chooses a channel and accepts the notice (V2-FR-28); channel 0 and the first view stay within v1 budgets |
| V2-NFR-4 | Must | The site has no runtime backend; the guide is static data refreshed by the scheduled job |
| V2-NFR-5 | Must | Latest two versions of Chrome, Edge, Safari and Firefox on desktop, and Safari on iOS and Chrome on Android; browser quirks that break the player in a given environment are noted and the environment falls back to a flat layout |
| V2-NFR-6 | Must | WCAG 2.2 AA for the site's 2D UI; every control in every environment is reachable by keyboard and has a visible focus |
| V2-NFR-7 | Should | Each non-default environment is capped at a size set by the architect and loads with a progress message |
| V2-NFR-8 | Should | The guide data, with a "last refreshed" time, is under 100 kB |
| V2-NFR-9 | Should | A CI check fails the build if a guide entry lacks a required field or if the player rectangle is covered in the environment screenshot tests |

## 8. Legal and rights constraints
| # | Constraint |
|---|---|
| L1 | The site relays nothing. All playback is by YouTube's own embed, governed by YouTube's terms and each channel owner's embed setting |
| L2 | Prasar Bharati's own site terms limit use to personal or educational purposes and ask for permission before linking. The DD and Sansad TV channels are included through their official YouTube embeds, and the user sends the permission email (Appendix A). If a reply asks for removal, the entries are removed at once (V2-FR-11) |
| L3 | State-media channels (for example TRT World and CGTN) are labelled as such in the guide |
| L4 | NASA material needs a credit to NASA and must not imply endorsement; this wording appears on the credits page if NASA is listed |
| L5 | The repository is public: no key, secret or private detail is committed |
| L6 | Pasted links are the viewer's own responsibility; the site embeds only what the video's owner allows to be embedded |
| L7 | The team does not give legal advice; the user decides what to publish |
| L8 | Broadcaster names are used only as text to identify the source; no logo or test card appears in site-made artwork |

## 9. User stories

### Epic V2-E1: Pick a channel

#### V2-US-1: Choose from the guide (V2-FR-2, V2-FR-5, V2-FR-9, Must)
As a viewer, I want a guide of live channels, so that I can watch something without searching.

**Acceptance criteria**
- Given I open the guide, when it shows, then each entry has its name, genre, country and owner type, and a last-refreshed time is shown
- Given a channel has no live stream, when the guide shows, then it is marked "off air" and cannot be started
- Given I use the keyboard, when I press Up or Down, then the channel changes
- Given I use touch, when I tap an entry, then that channel is picked
- Given a channel is state media, when I read the guide, then it is labelled as such

#### V2-US-2: Paste my own link (V2-FR-7, V2-FR-8, V2-YT-8, Must)
As a viewer, I want to paste a YouTube link, so that I can watch my own choice in these environments.

**Acceptance criteria**
- Given I paste a valid YouTube link, when I confirm, then the player loads that video on the screen
- Given I paste a link from another host, when I confirm, then I see a plain message that only YouTube links work
- Given the video cannot be embedded, when it loads, then I see the embedding-disabled message and a next action
- Given I reload, when the page loads, then my pasted link is not stored or shown

#### V2-US-3: Know what I am loading (V2-FR-28, V2-YT-14, V2-NFR-3, Must)
As a viewer, I want a notice before YouTube loads, so that I can choose to continue.

**Acceptance criteria**
- Given I pick a channel for the first time, when the notice shows, then it states the video is from YouTube, may be loud or flash, may be region-restricted and may involve cookies or data collection
- Given I choose Back, when I do, then no request has been made to YouTube
- Given I choose Continue, when I do, then the player loads from youtube-nocookie.com where the API allows

### Epic V2-E2: Watch in an environment

#### V2-US-4: Switch environments (V2-FR-15, V2-FR-23, Must)
As a viewer, I want to watch in places I like, so that the experience feels right.

**Acceptance criteria**
- Given the site has loaded, when I open the environment menu, then I can choose any of the eight environments
- Given I pick an environment, when it loads, then I see a progress message and then the scene with the screen
- Given I am watching a video, when I switch environments, then the player moves to the new screen in the new scene
- Given I use only a keyboard, when I use the menu, then every environment is reachable

#### V2-US-5: A clear, unfiltered screen (V2-FR-16, V2-FR-20, V2-YT-1, V2-YT-2, Must)
As a viewer, I want the video to be clean in every scene, so that I can see it as the channel intended.

**Acceptance criteria**
- Given any environment, when I screenshot it with a video playing, then nothing overlaps the player rectangle
- Given the 1970s TV, when a channel plays, then scanlines and glow appear on the bezel and surround and not on the video
- Given the car scene, when the video plays, then the windscreen is clear over the screen area and the outside scenery moves
- Given the chai stall, when the crowd animates, then no head or prop crosses the player
- Given any environment, when I inspect the player, then no filter, blend mode or mask applies to it

#### V2-US-6: Colour or black and white (V2-FR-14, Must)
As a viewer, I want to choose B&W or colour for the environment, so that I can pick the mood.

**Acceptance criteria**
- Given I enter, when an environment shows, then the option is B&W
- Given I choose Colour, when the environment updates, then its lighting and materials gain colour and the site's text and chrome stay greyscale
- Given a video plays, when I switch the option, then the video itself does not change
- Given I use a screen reader, when I reach the option, then it has a label and announces its state
- Given I am on channel 0, when I look, then it stays B&W

#### V2-US-7: Watch on a small screen (V2-FR-17, V2-FR-18, V2-FR-22, Must)
As a phone viewer, I want focus mode, so that the video is big enough to watch.

**Acceptance criteria**
- Given a screen where the player would be under 480 by 270 CSS px, when I open an environment, then focus mode is offered
- Given I turn on focus mode, when the view changes, then the player fills the viewport width with its controls visible and the environment behind it
- Given the player is never under 200 by 200 CSS px, when I rotate the phone, then it stays at least that size
- Given I drag the scene, when the pointer is over the player, then the scene does not move and the player's controls still work

### Epic V2-E3: Safety and the player's rules

#### V2-US-8: Calm and reduced motion (V2-FR-29, V2-FR-34, Must)
As a person sensitive to motion or flashing, I want click-to-play, so that nothing starts on its own.

**Acceptance criteria**
- Given Calm mode or reduced motion is on, when I pick a channel, then I see a still thumbnail card with the channel name and nothing plays
- Given I press play, when the video starts, then it begins muted
- Given Calm mode is on, when the player allows it, then captions are requested on
- Given Calm mode is on, when I change environment, then the scene is static

#### V2-US-9: Stop and leave (V2-FR-30, V2-FR-31, V2-FR-32, Must)
As a keyboard user, I want to leave the player, so that I am never trapped.

**Acceptance criteria**
- Given a video is playing, when I press Stop by pointer, touch or keyboard, then I return to the scene (or channel 0 on the 1970s TV) within 1 s
- Given focus is in the player, when I use the documented key or the "back to controls" action, then focus returns to the site controls
- Given the player is shown, when I look, then its controls and captions button are visible and uncovered

#### V2-US-10: Errors and regions (V2-YT-8, V2-YT-15, Must)
As a viewer, I want clear messages when a video will not play, so that I am not left with a blank screen.

**Acceptance criteria**
- Given the player reports error 100, when it happens, then I see a "not found or private" message and a next-channel action
- Given the player reports 101 or 150, when it happens, then I see an "embedding disabled" message
- Given the player reports 153, when it happens, then I see a "player could not verify the site" message and the site records the error class in the on-screen text only
- Given a video is blocked in my country, when it fails, then I see a plain "not available in your region" message and no attempt to get around it

### Epic V2-E4: Compliance and trust

#### V2-US-11: Follow YouTube's rules (V2-YT-3, V2-YT-4, V2-YT-7, V2-YT-9, V2-YT-10, Must)
As the owner, I want the site to follow YouTube's rules, so that the embed keeps working.

**Acceptance criteria**
- Given page load, when I inspect the network, then no YouTube request happens before a channel is picked
- Given I pick a channel, when it autoplays, then it starts muted, is more than 50% visible, and is the only player on the page
- Given a request to YouTube, when I inspect it, then the Referer follows `strict-origin-when-cross-origin`
- Given a channel plays, when I look, then its name and a "Watch on YouTube" link are visible
- Given I search the site, when I look for ads, prices or sponsorship, then none exist

#### V2-US-12: Privacy and attribution pages (V2-YT-5, V2-YT-6, V2-FR-33, Must)
As a viewer, I want to see how my data is handled, so that I can trust the site.

**Acceptance criteria**
- Given the footer, when I follow the privacy link, then the page names YouTube API Services, links to the Google Privacy Policy and the revoke page, and says the site collects no personal data
- Given the third-party list page, when I read it, then it names youtube.com, youtube-nocookie.com and ytimg.com and why
- Given the notice or privacy page, when I read them, then they link to the YouTube Terms of Service

#### V2-US-13: Keep the guide fresh and safe (V2-FR-3, V2-FR-4, V2-FR-12, V2-YT-12, Must)
As the owner, I want a scheduled job to update live IDs, so that the static site stays current.

**Acceptance criteria**
- Given the schedule fires, when the job runs, then it resolves each channel's live video, checks it is embeddable and publishes the guide
- Given the Data API fails or quota runs out, when the job ends, then the last known good IDs stay and the guide shows its last-refreshed time
- Given a push to the repo, when the secret scan runs, then no key appears in files or the bundle
- Given the published guide and bundle, when I inspect them, then the API key is absent

### Epic V2-E5: Channel 0 stays

#### V2-US-14: The ghost story stays first (V2-FR-25, V2-FR-26, V2-FR-27, Must)
As a first-time visitor, I want the Occupant's story first, so that the site keeps its identity.

**Acceptance criteria**
- Given I power on for the first time, when the TV warms up, then channel 0 plays the Occupant's story as in v1
- Given a live channel plays on the 1970s TV, when the Occupant appears, then it is around the player and never over it
- Given I change channel, when the burst plays, then it lasts 200 to 400 ms, stays on the surround, and meets the flash limits

## 10. MVP and story map
v2 MVP is every Must above. This is large. If scope must shrink, the architect and tech lead should first cut environments (the first four with the highest value are 1970s TV, cinema, car, open-air), moving chai stall, train, bedroom and space deck to a v2.1 release, as the compliance, guide, paste-a-link and the colour option do not depend on them.

| Release | Stories |
|---|---|
| v2 MVP | V2-US-1 to V2-US-14 |
| v2.1 | V2-FR-10, V2-FR-11 filters and kill switch polish, V2-FR-13, V2-FR-21 reskins, V2-FR-24, V2-NFR-7 to V2-NFR-9 |

## 11. Out of scope (v2)
| Item |
|---|
| Hosting, relaying, proxying, recording or re-encoding any stream |
| Satellite tuners, SAT>IP, private backends, accounts and login |
| Archive footage hosted on the site |
| Any filter, tint, overlay or effect on the player |
| Curved, dome or wraparound screens |
| Ads, payments, donations beside the player, and analytics |
| Sources other than YouTube in the first release (iptv-org, scraped HLS, WAVES) |
| Multiple simultaneous players |

## 12. Assumptions
1. v1 ships and is tagged first and is not changed.
2. The user creates the Google Cloud project and the YouTube Data API key and adds it as a repo secret.
3. The default for Colour/B&W is B&W, as earlier decided.
4. The 1970s TV remains the default environment on first visit.
5. Guide entries are the high-confidence channels from the research; the tech lead and user approve the exact lineup.
6. Channel names are used as text only.
7. The hosting method lets the Referrer-Policy be set (a header, or a meta tag when headers cannot be set); the architect confirms.
8. Research was checked from India only; availability elsewhere is handled at runtime.

## 13. Open questions
| # | Question | Default if unanswered |
|---|---|---|
| Q-V2-1 | Should the DD and Sansad TV channels go live in the public guide before Prasar Bharati and Sansad TV reply to the permission email, or wait for a reply? Their own terms ask for permission before linking | Publish them only after you have sent the email, and remove them at once if asked |
| Q-V2-2 | Who sets up the Google Cloud project and YouTube Data API key, and what is the refresh schedule you accept given the daily quota (each live lookup costs 100 units)? | You create the key; the team proposes a schedule (for example a few runs per day) that fits the quota |

## Appendix A: draft permission email
For the user to review, edit and send. It is a draft; nothing has been sent. Replace the bracketed parts. Send one copy to Prasar Bharati and one to Sansad TV, using the contact addresses on their official websites.

Subject: Request for permission to show your official YouTube live streams in an embedded player on a non-commercial website

Dear [Prasar Bharati / Doordarshan / Sansad TV] team,

I am [your name], [a developer based in your city, India]. I run a small non-commercial website called "Transmission Pending" at [site URL]. The site lets visitors watch live channels in different settings, such as a 1970s television room, a cinema and a train window seat. The source code is public at https://github.com/Patlu29/transmission-pending-tv.

I would like your written permission to include the following official YouTube live streams in the site's channel guide:

- [DD News, DD India, DD Kisan, DD Urdu / Sansad TV 1 and 2: list the channels, with their YouTube channel links]

How the site would show your channels:
1. The site does not copy, record, host, relay or re-encode any video. It uses only the official YouTube embedded player, and only where your channel allows embedding.
2. The video and its sound are not altered. The site places no filter, overlay, logo or advertisement on the player, and the player's own controls and YouTube branding remain visible.
3. Each channel is shown with its name and a "Watch on YouTube" link to your official channel.
4. The site is free to use, shows no advertisements and earns no money.
5. The site collects no personal data. A privacy page explains that the player is provided by YouTube and is governed by YouTube's terms.

Your website terms (https://prasarbharati.gov.in/terms-conditions/) ask that users obtain permission before linking or reusing content, so I am writing before including your channels. If you agree, please reply with written permission and any conditions you would like me to follow, for example how to credit you. If you prefer that your channels are not shown, please tell me and I will remove them immediately. I will also remove them at once if the embedding setting on your channel changes.

Thank you for your time. I am happy to answer any questions.

Yours sincerely,
[Your name]
[Your email address]
[Site URL]
