# v2 requirements: live channels (DRAFT)

Status: draft for the next release. v1 (haunted-TV ghost story, in QA) is not changed by this document. Where v2 conflicts with a v1 requirement, the conflict is listed in section 4 and v2 only takes effect once the user decides the open questions in section 7.

User request (verbatim): "change the scope and we can telecast the public TV channels from satellite connection and user can change the channels."

## 1. Overview
v2 turns the haunted 1970s set into a TV that can tune to real public channels. The visitor changes channel with the knob, the keyboard or an on-screen channel dock, and live programming plays on the CRT screen. The Occupant's ghost story stays as "channel 0". Technology (satellite tuner, internet streams, embeds) is the architect's decision; this document covers product scope and rights.

## 2. Goals
| # | Goal | Measure |
|---|---|---|
| V2-G1 | Visitors can tune real channels on the set | Channel change works by knob, keys and dock; video plays on the CRT screen |
| V2-G2 | Only legally usable sources are shown | 100% of channel entries have source URL, terms link and region recorded (V2-FR-2) |
| V2-G3 | v1 qualities survive | Greyscale, CRT look, Calm mode, flash safety and the ghost story still work with live content |
| V2-G4 | Honest about limits | A visitor in a blocked region or on a dead stream sees a clear in-character message, not a blank screen |

## 3. How v2 fits with v1
Minimal and creative proposal:

| Area | Proposal |
|---|---|
| Channel 0 | The Occupant's ghost story and the diary index. It is the default on first power-on, so v1 behaviour is unchanged for new visitors |
| Channels 1 to N | Live channels from the curated list |
| Haunting | The Occupant interferes only lightly with live channels: the odd text bleed in a channel bug, a slow ghost shape in the static between channels, the knob turning itself once. All of it is skipped in Calm mode |
| Between channels | Channel-change static burst (v1 FR-23, promoted from Could to Must in v2) shows the ghost shape only in the burst, never over the live picture |
| Diary | The diary index becomes a teletext page on channel 0 (and the channel guide is a teletext page too) |
| Facts | Intro facts and their verification (FR-9 to FR-14) are unchanged. The channel list is data, not an intro fact, unless the story mentions it, in which case the same pipeline applies |

## 4. Conflicts with existing requirements
Each item needs a user decision (see section 7) before v2 is built.

| # | Existing requirement | Conflict | Proposed v2 resolution |
|---|---|---|---|
| C1 | NFR-8 (no backend, static bundle) | Live video, CORS, geo-blocking or a satellite tuner may need a server, a proxy or a relay | v2 may add a minimal relay or accept only sources that play directly in the browser. The architect decides, the user approves any backend |
| C2 | NFR-7 (no third-party requests, same-origin only; no trackers) | Streams and embeds come from third-party origins and may set cookies or trackers | Allow only the curated stream origins, listed in the repo, and loaded only after the visitor tunes a live channel (not on first view). Disclose it on screen. Embeds that set trackers are excluded |
| C3 | NFR-13 and FR-X3 (no real broadcaster marks, logos or test cards) | Live channels carry their own logos and bugs | Allowed only inside the third-party video itself, as received. v2 adds no broadcaster names or logos to site-made artwork: channels are shown by number and plain text label per the source's terms |
| C4 | FR-2 (greyscale only) | Live video is colour | Desaturate live video in the display pipeline so it reads as a 1970s black-and-white set. Open question Q-V2-4 asks if the user wants colour |
| C5 | FR-19 and WCAG 2.3.1 (flash limits) | Live content may flash and cannot be controlled | The site cannot guarantee live content is flash-safe. Requirements: a warning on first tuning, an optional flash-reduction filter (dim and temporal smoothing) where feasible, Calm mode defaults live video to paused with a "tune in anyway" control, and a one-press stop to return to channel 0. Site-made effects (burst, ghost) stay within limits |
| C6 | FR-22, audio off by default and autoplay policy | Live channels are mostly sound | Audio stays muted on tuning; the visitor presses unmute. Browser autoplay rules are met by the visitor's tune action. A visible mute control is always shown |
| C7 | NFR-6 and FR-18 (WCAG 2.2 AA, text alternatives) | Live streams may lack captions; the DOM transcript model does not cover live speech | Show captions when the stream provides them, and say so on screen when none exist. A channel entry records whether captions are available. Prefer captioned sources |
| C8 | NFR-1 and NFR-3 (frame rate, download size) | Video decoding plus CRT shader effects raises load; streams are not within the 5 MB first-view budget | The first-view budget excludes stream data, which loads only after tuning. The frame-rate targets still apply to the CRT effects with video playing |
| C9 | NFR-5 and FR-1 (mobile, power control) | Many streams need user gesture or are unplayable on iOS | Test on target browsers; unplayable channels are marked in the guide, not hidden silently |
| C10 | NFR-12 and public repo (git history) | The channel list and source URLs are public | Do not commit credentials, tuner addresses or private network details. The list contains only public source URLs |

## 5. Functional requirements (v2)
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-1 | Must | The visitor can change channel by turning the on-screen knob (drag or click and step), pressing Up/Down or Page Up/Page Down keys, typing a channel number, or using a channel dock; all are keyboard operable and touch operable |
| V2-FR-2 | Must | The channel list is curated data. Each entry records: channel number, label, source URL, licence or terms link, region (where it may be shown), captions available (yes/no), and a date last checked |
| V2-FR-3 | Must | Only entries whose terms allow embedding or redistribution on a public website may be in the public list; each entry has its terms link verified before release |
| V2-FR-4 | Must | Channel 0 is the Occupant's story and diary; it is the default on first power-on and is always reachable in one action |
| V2-FR-5 | Must | A live channel plays on the CRT screen with the same scanlines, curvature and glow as v1, and in greyscale (subject to Q-V2-4) |
| V2-FR-6 | Must | Changing channel shows a static burst of 200 to 400 ms that passes the v1 flash limits; with Calm mode or reduced motion there is an instant cut with a still static frame |
| V2-FR-7 | Must | Live video is muted by default; an unmute control is visible and keyboard operable; audio never starts without the visitor's action |
| V2-FR-8 | Must | Before the first live channel plays, a notice says: live content comes from third parties, may contain flashing or sound, and may be region-restricted, with a Continue and a Back to channel 0 control |
| V2-FR-9 | Must | A stop control returns to channel 0 within 1 s from any live channel, by pointer, touch or keyboard |
| V2-FR-10 | Must | If a stream fails, is blocked in the visitor's region, or is offline, the screen shows an in-character "no signal" page with the reason in plain text and the next channel is one action away |
| V2-FR-11 | Must | With Calm mode or prefers-reduced-motion, live video does not autoplay: the visitor sees a still card and presses "tune in" to play |
| V2-FR-12 | Must | A flash-reduction filter, where technically feasible, is on by default for live video (the architect says if it is feasible; if not, V2-FR-8 states that plainly) |
| V2-FR-13 | Should | A teletext channel guide page lists channels with number, label, region and caption status, text only, no logos |
| V2-FR-14 | Should | Captions display on the screen in teletext style when the source provides them; otherwise the screen says "no captions" |
| V2-FR-15 | Should | The Occupant makes light haunted appearances during channel changes and idle moments, never over live picture, none in Calm mode |
| V2-FR-16 | Should | The last channel is remembered for the visit only (no cookies or storage beyond the session) |
| V2-FR-17 | Could | A channel-change sound, off by default and tied to the unmute state |
| V2-FR-18 | Could | A "scanning" mode that steps through channels with a visible pause control |
| V2-FR-19 | Won't | Recording, rewinding or downloading broadcasts |
| V2-FR-20 | Won't | Adding channels whose terms do not permit embedding or redistribution, however popular |

## 6. Non-functional requirements (v2)
| ID | Priority | Requirement |
|---|---|---|
| V2-NFR-1 | Must | Channel change completes (picture or no-signal page) within 3 s on 4G in 90% of tries for working channels |
| V2-NFR-2 | Must | CRT effects hold 60 FPS on desktop and 30 FPS on mobile with live video playing; if not, video resolution drops before effects are removed |
| V2-NFR-3 | Must | No live stream data is requested until the visitor chooses a live channel |
| V2-NFR-4 | Must | The repo contains no credentials, tuner addresses or private network details; this is checked in CI |
| V2-NFR-5 | Must | The site discloses on a visible page which third-party origins may be contacted when tuning live channels |
| V2-NFR-6 | Should | A CI check flags channel entries with a missing field or a terms link not checked in the last 90 days |
| V2-NFR-7 | Should | Latest two versions of Chrome, Edge, Safari and Firefox; channels unplayable in a browser are marked in the guide |

## 7. Legal and rights constraints
| # | Constraint |
|---|---|
| L1 | Retransmitting a broadcast on a public website needs rights from the rights holder, even for free-to-air channels. Satellite reception at home does not grant a right to republish it on the internet |
| L2 | The public channel list may contain only sources whose own terms allow embedding or redistribution (for example official embeds or streams that permit it) |
| L3 | Each list entry records source URL, licence or terms link, and region, plus whether captions exist (V2-FR-2) |
| L4 | The GitHub repository is public: the channel list, source URLs and any notes are visible to everyone, so nothing private (tuner IPs, credentials, personal network details) may be committed |
| L5 | The product owner is responsible for confirming rights; the team does not provide legal advice. If rights cannot be shown for a source, it is excluded |
| L6 | Region limits must be honoured: where a source is not allowed in a visitor's region, the site shows no-signal and does not bypass the restriction |
| L7 | Site-made artwork must not use broadcaster names, logos or test cards (v1 NFR-13 stays) |

## 8. User stories (v2)

### Epic V2-E1: Change channels

#### V2-US-1: Turn the knob (V2-FR-1, V2-FR-6, Must)
As a visitor, I want to change channels with the set's knob, so that it feels like a real TV.

**Acceptance criteria**
- Given the TV is on, when I click or drag the channel knob, then the channel steps up or down and a static burst plays for 200 to 400 ms
- Given I use only the keyboard, when I press Up or Down, then the channel changes the same way
- Given I use touch, when I tap the channel dock, then the channel changes the same way
- Given I type a channel number, when it exists, then that channel shows, and when it does not, then I see a "no such channel" message
- Given Calm mode is on, when I change channel, then there is an instant cut with a still static frame

#### V2-US-2: Watch a live channel (V2-FR-5, V2-FR-7, V2-NFR-1, Must)
As a visitor, I want live programming on the CRT screen, so that the old set shows real television.

**Acceptance criteria**
- Given I tune to a live channel, when the stream is available, then the picture plays in greyscale inside the CRT screen within 3 s on 4G
- Given the picture plays, when I have not pressed unmute, then there is no sound
- Given I press unmute, when it takes effect, then I hear the channel and a visible control shows the state
- Given I do not tune to a live channel, when I use channel 0, then no stream data is requested

#### V2-US-3: Know what I am tuning into (V2-FR-8, V2-FR-12, Must)
As a visitor, I want a warning about live content, so that I can stay safe.

**Acceptance criteria**
- Given I tune to a live channel for the first time, when the notice shows, then it says the content is from third parties, may flash or be loud, and may be region-restricted
- Given the notice is shown, when I choose Back, then I return to channel 0 and no stream is loaded
- Given the flash filter is feasible, when live video plays, then it is on by default
- Given the filter is not feasible, when the notice shows, then it states that flash cannot be controlled

#### V2-US-4: Escape fast (V2-FR-9, V2-FR-11, Must)
As a person sensitive to flashing, I want to stop live video at once and avoid autoplay, so that I stay comfortable.

**Acceptance criteria**
- Given a live channel is playing, when I press Stop by pointer, touch or keyboard, then I return to channel 0 within 1 s
- Given Calm mode or reduced motion is on, when I tune to a live channel, then I see a still card and the video starts only after I press "tune in"
- Given I turn Calm mode on while video plays, when it takes effect, then the video pauses on a still frame

#### V2-US-5: Handle dead channels (V2-FR-10, Must)
As a visitor, I want a clear message when a channel does not work, so that I am not left with a black screen.

**Acceptance criteria**
- Given a stream is offline, when I tune to it, then I see an in-character "no signal" page with the plain-text reason
- Given the stream is blocked in my region, when I tune to it, then the page says so and does not try to bypass it
- Given the no-signal page shows, when I act, then the next channel and channel 0 are one action away

### Epic V2-E2: A trustworthy channel list

#### V2-US-6: Only licensed sources (V2-FR-2, V2-FR-3, V2-FR-20, V2-NFR-4, Must)
As the product owner, I want every channel recorded with its terms, so that I can show we have the right to carry it.

**Acceptance criteria**
- Given the channel list, when I read an entry, then it has number, label, source URL, terms link, region, captions flag and last-checked date
- Given a channel has no terms link, when CI runs, then it fails
- Given I search the repo, when I look for credentials, tuner addresses or private network details, then none exist and CI checks it

#### V2-US-7: Browse the guide (V2-FR-13, V2-FR-14, Should)
As a visitor, I want a teletext channel guide, so that I can choose a channel.

**Acceptance criteria**
- Given I open the guide page, when it shows, then channels are listed as text with number, label, region and captions status and no logos
- Given a channel is unplayable in my browser, when the guide shows, then it is marked
- Given a stream has captions, when it plays, then captions show in teletext style, and otherwise the screen says "no captions"

### Epic V2-E3: The Occupant and channel 0

#### V2-US-8: The story stays (V2-FR-4, V2-FR-15, Must/Should)
As a first-time visitor, I want the ghost story to still be the first thing I see, so that the site keeps its identity.

**Acceptance criteria**
- Given I power on for the first time, when the set warms up, then channel 0 plays the Occupant's story as in v1
- Given I am on any channel, when I press the channel 0 control, then I return to the story page or the diary within 1 s
- Given I am watching live video, when the Occupant appears, then it appears only in static between channels and not over the live picture, and not at all in Calm mode

## 9. Story map
| Release | Stories |
|---|---|
| v2 MVP (after rights are cleared) | V2-US-1, V2-US-2, V2-US-3, V2-US-4, V2-US-5, V2-US-6, V2-US-8 (Must part) |
| v2.1 | V2-US-7, V2-FR-15 haunted touches, V2-FR-16, V2-NFR-6 |
| Later | V2-FR-17, V2-FR-18 |

## 10. Assumptions
1. v1 ships first and is not altered.
2. "Public TV channels from satellite" means free-to-air channels. The user has not said whether this means a personal satellite dish or internet streams.
3. The site stays a single page with no accounts.
4. The user, not the team, confirms the rights position for each channel.
5. Live video is desaturated to greyscale unless the user says otherwise.

## 11. Open questions
| # | Question | Why it matters | Default if unanswered |
|---|---|---|---|
| Q-V2-1 | What is the signal source: a real satellite tuner on your network, or official internet streams/embeds from broadcasters? | A home tuner cannot be reached from a public site without a relay, and rebroadcasting it publicly is a rights problem. Official embeds are the only clean public option | Official internet streams and embeds that permit embedding; no tuner |
| Q-V2-2 | Should the public hosted site show live channels, or only a local or self-hosted build? | Decides whether the rights and flash risks apply to the public | Public site shows only sources with clear embed terms; any satellite or tuner-based channels are for a local build only |
| Q-V2-3 | Which country or region's channels? | Defines the list, the rights holders and region blocking | One region of your choice; the list records region per entry |
| Q-V2-4 | Should live video stay greyscale? | Colour breaks the 1970s black-and-white brief but may suit live content | Greyscale |
