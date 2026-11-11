# v2 requirements: archive channels and private live relay (FINAL SCOPE)

Status: scope decided by the user. v1 (haunted-TV ghost story) ships first: QA fixes, delivery and a v1.0 tag. v2 is then built on a branch. This document does not change v1 requirement files.

User request (verbatim): "change the scope and we can telecast the public TV channels from satellite connection and user can change the channels."

## 0. Decisions (final, from the user)
| # | Decision |
|---|---|
| D1 | Sequencing: v1 ships first and is tagged v1.0. v2 is built on a branch afterwards |
| D2 | Shape "Public archive + private backend". (a) Public site: channel 0 (the Occupant's story and diary, unchanged) plus 3 to 5 archive channels of openly licensed footage (CC0, Public Domain Mark or CC BY), each licence verified, playing on a clock schedule like broadcast TV. (b) Private login-only backend for the user's household relays the user's own tuner (SAT>IP box or PC tuner) for personal viewing of DD Free Dish (India) free-to-air channels |
| D3 | Live channels are never streamed from the public site. The public build neither exposes nor links to the relay |
| D4 | Colour: "both". A Colour/B&W switch on the set defaults to B&W. Site chrome stays greyscale; only the video may be colour |
| D5 | Flash: a runtime brightness-change limiter is accepted. Calm mode and the 2D mode play only pre-checked clips |
| D6 | Channel 0 is the Occupant (not channel 1) |

Resolved questions: Q-V2-1 signal source is the user's own tuner for the private build and openly licensed archive footage for the public build. Q-V2-2 the public site shows no live channels; only the private deployment does. Q-V2-3 region is India (DD Free Dish) for the private relay; the public archive is region-free. Q-V2-4 video may be colour via the switch, default B&W.

## 1. Overview
v2 turns the haunted 1970s set into a TV that can change channels. The public site offers channel 0 and 3 to 5 scheduled archive channels. A separate private deployment, for the household only, adds live channels from the user's own tuner. The visitor changes channel with the knob, keys or dock. Technology choices (relay, streaming, limiter) belong to the architect.

## 2. Goals
| # | Goal | Measure |
|---|---|---|
| V2-G1 | Visitors change channels on the set and see scheduled archive programmes | Knob, keys and dock work; the schedule is on a clock |
| V2-G2 | Every public clip is legally usable | 100% of clips have licence evidence approved by the user (V2-FR-21 to V2-FR-24) |
| V2-G3 | Live relay is private and personal-use only | Public build has no relay code path, address or link (V2-FR-31); private build requires login (V2-FR-26) |
| V2-G4 | v1 qualities survive | CRT look, Calm mode, flash safety and the ghost story keep working |
| V2-G5 | Honest about limits | Dead or blocked sources show a clear in-character message |

## 3. Deployment targets
| Target | Contents | Who can reach it |
|---|---|---|
| Public build | Channel 0 plus archive channels 1 to 5; static | Anyone |
| Private build | Public build features plus live channels via the relay; login-only | Household members on the home network or a private VPN |

The two targets are separate deployments. The private build is not hosted on the public site and is not linked from it.

## 4. How v2 fits with v1
| Area | Proposal |
|---|---|
| Channel 0 | The Occupant's story and diary; default on first power-on; v1 behaviour unchanged |
| Channels 1 to 5 | Public archive channels on a clock schedule |
| Channels 6 and up | Private build only: live relay channels (DD Free Dish) |
| Haunting | The Occupant shows only in static between channels and as a light touch (a knob turning once, a text bleed in the guide); never over a programme; none in Calm mode |
| Channel-change burst | v1 FR-23 is promoted to Must in v2 |
| Facts | v1 fact pipeline (FR-9 to FR-14) is unchanged. The channel list is data, and the story mentions it only through the same pipeline |

## 5. Conflicts with existing requirements
| # | Existing requirement | Conflict | Resolution |
|---|---|---|---|
| C1 | NFR-8 (no backend, static bundle) | The relay needs a server | **Applies to the public build unchanged.** The private build is a separate deployment target and may have a backend. The public build has none |
| C2 | NFR-7 (no third-party requests, no cookies or trackers) | Archive clips may be hosted elsewhere; the private build needs login | **Applies to the public build.** Public archive clips are served from the site's own origin (copied into the bundle or its own storage). The private build may set a session cookie for login only, and no trackers |
| C3 | NFR-13, FR-X3 (no broadcaster marks) | Live video carries logos; archive footage may too | Site artwork adds none. Logos inside licensed archive clips are reviewed during clip approval; the private relay is as received. Channels are labelled by number and plain text |
| C4 | FR-2 (greyscale) | Video may be colour | **Amended for v2 only:** site chrome, TV body, UI and text stay greyscale. Only the video area may show colour, and only when the Colour/B&W switch is set to Colour. Default is B&W (V2-FR-12) |
| C5 | FR-19, WCAG 2.3.1 (flash) | Live content may flash | Private live: runtime brightness-change limiter on by default (D5). Archive: clips are pre-checked for flash. Calm mode and the 2D mode play only pre-checked clips and never live video |
| C6 | FR-22, audio off by default | Channels are mostly sound | Video starts muted; the visitor presses unmute |
| C7 | NFR-6, FR-18 (accessibility) | Captions and text alternatives | Archive clips carry captions or a transcript where the source provides them, and the guide records caption status; otherwise the screen says "no captions" |
| C8 | NFR-1, NFR-3 (frame rate, 5 MB first view) | Video decode and size | The first-view budget excludes channel video, which loads only after tuning. Frame-rate targets apply with video playing |
| C9 | NFR-12, public repo | Source lists are public | The public repo holds only licensed archive metadata. No credentials, tuner addresses, hostnames or network details for the private build are committed (V2-FR-33) |
| C10 | FR-20 (2D fallback) | 2D mode must still work | 2D mode plays only pre-checked archive clips; no live video |

## 6. Functional requirements: channels and viewing (both builds)
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-1 | Must | The visitor changes channel with the on-screen knob, Up/Down or Page Up/Page Down, typing a number, or a channel dock; all are keyboard and touch operable |
| V2-FR-2 | Must | Channel 0 is the Occupant's story and diary; it is the default on first power-on and reachable in one action from anywhere |
| V2-FR-3 | Must | Changing channel shows a static burst of 200 to 400 ms within the v1 flash limits; with Calm mode or reduced motion it is an instant cut with a still static frame |
| V2-FR-4 | Must | Video plays inside the CRT screen with the v1 scanlines, curvature and glow |
| V2-FR-5 | Must | Video is muted by default; a visible keyboard-operable unmute control exists; audio never starts without the visitor's action |
| V2-FR-6 | Must | A Stop control returns to channel 0 within 1 s by pointer, touch or keyboard |
| V2-FR-7 | Must | A failed, offline or blocked source shows an in-character "no signal" page with a plain-text reason, and the next channel is one action away |
| V2-FR-8 | Must | With Calm mode or prefers-reduced-motion, the set plays only pre-checked clips: archive clips play from a still card after the visitor presses "play"; live video is not offered |
| V2-FR-9 | Must | A "no such channel" message shows when a typed number does not exist |
| V2-FR-10 | Should | A teletext channel guide page lists channels with number, label, now-and-next programme, and caption status, text only and no logos |
| V2-FR-11 | Should | The last channel is remembered for the visit only, without cookies or storage in the public build |
| V2-FR-12 | Must | **Colour/B&W switch:** the set has a visible, keyboard-operable switch that defaults to B&W each visit. In B&W, video is desaturated. In Colour, only the video shows colour. The chrome stays greyscale in both. The state is announced to assistive technology |
| V2-FR-13 | Must | The colour switch stays available in Calm mode, and the Calm mode settings do not change it |
| V2-FR-14 | Could | Channel-change sound, off by default and tied to the unmute state |
| V2-FR-15 | Won't | Recording, rewinding or downloading broadcasts |
| V2-FR-16 | Won't | Showing live channels on the public site, or linking to the relay from it |

## 7. Public archive lineup
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-17 | Must | The public site has 3 to 5 archive channels (numbers 1 to 5), each with a label and a programme list |
| V2-FR-18 | Must | Archive channels play on a clock schedule: for a given time of day, every visitor sees the same programme at the same position, and now-and-next is correct to within 5 s; the schedule loops and uses a stated time zone |
| V2-FR-19 | Must | A visitor tuning in mid-programme joins at the scheduled position, not at the start |
| V2-FR-20 | Must | The schedule fills all 24 hours with no empty slot; a gap or missing file shows the no-signal page (V2-FR-7), never a blank screen |
| V2-FR-21 | Must | Every clip is under CC0, the Public Domain Mark, or CC BY (not CC BY-SA, NC or ND) |
| V2-FR-22 | Must | Each clip has licence evidence in the repo: title, creator, source URL, licence name and link, date checked, and a saved snapshot of the source licence page or a statement from the source |
| V2-FR-23 | Must | The user approves each clip's evidence before the clip enters a release; the record has an approved-by and approved-date field |
| V2-FR-24 | Must | CC BY clips show the required attribution (title, creator, licence) on an attribution page and in the guide; the attribution appears no later than the clip's end |
| V2-FR-25 | Should | CI fails if a clip lacks any evidence field, approval, or a licence in the allowed list |
| V2-FR-25a | Must | Every archive clip passes a flash check (WCAG 2.3.1) before inclusion; the result is recorded in its evidence |
| V2-FR-25b | Should | Archive clips have captions or a transcript where the source offers one; otherwise the guide says so |

## 8. Private backend (household live relay)
| ID | Priority | Requirement |
|---|---|---|
| V2-FR-26 | Must | The private build requires login. Only household accounts, created by the owner, can sign in. There is no public sign-up, no password-reset email to arbitrary addresses, and no guest access |
| V2-FR-27 | Must | Unauthenticated requests receive no video and no information about channels, tuner or network |
| V2-FR-28 | Must | After login, a visible personal-use-only notice says the live channels are for the household's personal viewing and must not be shared, recorded or redistributed; the user accepts it once per session |
| V2-FR-29 | Must | The relay is reachable only on the home network or through a private VPN; it is not exposed to the public internet |
| V2-FR-30 | Must | The relay carries the user's own tuner (SAT>IP box or PC tuner) for DD Free Dish (India) free-to-air channels only; no encrypted or pay channels |
| V2-FR-31 | Must | The public build contains no relay code path, address, hostname, route, feature flag text or link; a CI check searches the public bundle and repo for them |
| V2-FR-32 | Must | Live video in the private build uses the runtime brightness-change limiter, on by default, and live video is never available in Calm mode or the 2D mode |
| V2-FR-33 | Must | The public repo holds no credentials, tuner addresses, hostnames, VPN details or household account data; secrets live outside the repo; a CI secret scan runs on every push |
| V2-FR-34 | Must | Sessions expire after a stated idle time; a visible sign-out control returns to the login screen |
| V2-FR-35 | Should | Repeated failed logins are rate-limited, and a message does not say whether the username or password was wrong |
| V2-FR-36 | Should | If the tuner is offline or has no signal, the no-signal page says so in plain text (V2-FR-7) |
| V2-FR-37 | Should | The private build has an owner-only way to add or remove household accounts, with no public interface |
| V2-FR-38 | Won't | Any feature that lets a visitor of the public site watch, record or capture live channels |

## 9. Non-functional requirements (v2)
| ID | Priority | Requirement |
|---|---|---|
| V2-NFR-1 | Must | Channel change completes (picture or no-signal page) within 3 s on 4G in 90% of tries for working channels |
| V2-NFR-2 | Must | CRT effects hold 60 FPS on desktop and 30 FPS on mobile with video playing; if not, video resolution drops before effects are removed |
| V2-NFR-3 | Must | No channel video is requested until the visitor tunes a channel with video |
| V2-NFR-4 | Must | The public build keeps NFR-7 and NFR-8: no backend, no third-party requests, no cookies |
| V2-NFR-5 | Must | The private build sends no third-party requests, sets only a session cookie for login, and has no analytics |
| V2-NFR-6 | Must | The private build's transport is encrypted (TLS) even on the home network |
| V2-NFR-7 | Should | Latest two versions of Chrome, Edge, Safari and Firefox; unplayable channels are marked in the guide |
| V2-NFR-8 | Should | Public build total archive size is stated and capped by the architect, so first view stays within NFR-3 |

## 10. Legal and rights constraints
| # | Constraint |
|---|---|
| L1 | The public site carries only openly licensed archive footage (CC0, Public Domain Mark, CC BY) with verified evidence approved by the user |
| L2 | Personal viewing of free-to-air channels from one's own tuner inside the household is the only live use. Republishing broadcasts to the public is not allowed and the public site never does it |
| L3 | The private relay is household-only. Sharing access beyond the household is out of scope and forbidden by the personal-use notice |
| L4 | The GitHub repo is public: nothing about the private deployment's addresses, credentials or accounts may be committed |
| L5 | The user is responsible for the rights position; the team does not give legal advice. A clip with unclear rights is excluded |
| L6 | CC BY attribution is required wherever the licence says so |

## 11. User stories

### Epic V2-E1: Change channels

#### V2-US-1: Turn the knob (V2-FR-1, V2-FR-3, V2-FR-9, Must)
As a visitor, I want to change channels with the set's knob, so that it feels like a real TV.

**Acceptance criteria**
- Given the TV is on, when I click or drag the knob, then the channel steps and a static burst of 200 to 400 ms plays
- Given I use only the keyboard, when I press Up or Down, then the channel changes the same way
- Given I use touch, when I tap the dock, then the channel changes the same way
- Given I type a number that does not exist, when I confirm, then I see "no such channel"
- Given Calm mode is on, when I change channel, then there is an instant cut with a still static frame

#### V2-US-2: Colour or black and white (V2-FR-12, V2-FR-13, Must)
As a viewer, I want to switch the picture between B&W and colour, so that I can choose between the old look and true colour.

**Acceptance criteria**
- Given I power on, when the picture shows, then the switch is set to B&W and the video is greyscale
- Given I set the switch to Colour, when video plays, then only the video area shows colour and the chrome and text stay greyscale
- Given I use a keyboard or screen reader, when I reach the switch, then it is focusable, labelled and announces its state
- Given Calm mode is on, when I use the switch, then it still works

#### V2-US-3: Stop and recover (V2-FR-6, V2-FR-7, Must)
As a visitor, I want to stop playback and handle dead channels, so that I am never stuck.

**Acceptance criteria**
- Given a video channel is playing, when I press Stop, then I return to channel 0 within 1 s
- Given a source is offline or a file is missing, when I tune to it, then I see the "no signal" page with a plain-text reason
- Given the no-signal page is shown, when I act, then the next channel and channel 0 are one action away

### Epic V2-E2: Public archive channels

#### V2-US-4: Watch a scheduled programme (V2-FR-17 to V2-FR-20, Must)
As a visitor, I want archive channels that play on a schedule, so that it feels like broadcast TV.

**Acceptance criteria**
- Given I tune to an archive channel, when I join mid-programme, then I see it at the scheduled position
- Given two visitors tune in at the same moment, when they compare, then they see the same programme position within 5 s
- Given any time of day, when I tune in, then the channel is never empty
- Given a clip file is missing, when its slot arrives, then I see the "no signal" page and not a blank screen
- Given I open the guide, when it shows, then it lists now-and-next in text only

#### V2-US-5: Trust the licences (V2-FR-21 to V2-FR-25, Must)
As the product owner, I want every clip's licence proved and approved, so that we can show we have the right.

**Acceptance criteria**
- Given any clip, when I read its record, then it has title, creator, source URL, licence and link, date checked, evidence snapshot, flash-check result, and approved-by and approved-date
- Given a clip has a licence other than CC0, Public Domain Mark or CC BY, when CI runs, then it fails
- Given a clip lacks my approval, when CI runs, then it fails
- Given a CC BY clip plays, when it finishes, then its attribution has been shown on screen or on the attribution page
- Given a clip has not passed the flash check, when CI runs, then it fails

#### V2-US-6: Calm and 2D viewing (V2-FR-8, V2-FR-25a, Must)
As a person sensitive to flashing, I want only checked clips in Calm and 2D modes, so that I am safe.

**Acceptance criteria**
- Given Calm mode or the 2D mode is on, when I tune an archive channel, then it plays only a clip with a recorded flash-check result, after I press "play"
- Given Calm mode is on, when I look for live channels, then none are offered
- Given reduced motion is on, when I tune in, then I see a still card first

### Epic V2-E3: Private household relay

#### V2-US-7: Sign in to the household set (V2-FR-26, V2-FR-27, V2-FR-34, Must)
As a household member, I want to sign in, so that only my household can watch live channels.

**Acceptance criteria**
- Given I am not signed in, when I request channels or video, then I get none and no information about the tuner or network
- Given I have a household account, when I sign in, then I reach the set with live channels
- Given there is no public sign-up, when I look for it, then there is none
- Given the session is idle past the stated time, when I act, then I return to the login screen
- Given I press sign out, when it completes, then I return to the login screen

#### V2-US-8: Personal use only (V2-FR-28, V2-FR-30, Must)
As the owner, I want a personal-use notice, so that household members know the limits.

**Acceptance criteria**
- Given I sign in, when the set loads, then a notice says live channels are for household personal viewing and not to be shared, recorded or redistributed
- Given I have not accepted it, when I try to tune a live channel, then it does not play
- Given I tune a live channel, when it plays, then it is a free-to-air DD Free Dish channel from my own tuner

#### V2-US-9: Keep the relay private (V2-FR-16, V2-FR-29, V2-FR-31, V2-FR-33, V2-FR-38, Must)
As the owner, I want the relay unreachable from the public, so that I do not rebroadcast anything.

**Acceptance criteria**
- Given the public build, when CI searches its bundle and the repo, then no relay route, address, hostname or link is found
- Given a request from outside the home network or VPN, when it targets the relay, then it is refused
- Given a push to the repo, when the secret scan runs, then no credentials or addresses are present
- Given the public site, when I look for live channels, then there are none

#### V2-US-10: Safe live viewing (V2-FR-32, V2-FR-36, Must/Should)
As a household viewer, I want the limiter on and clear errors, so that live video is safe and understandable.

**Acceptance criteria**
- Given live video plays, when brightness changes quickly, then the limiter reduces the changes, and it is on by default
- Given Calm mode is on, when I look for live video, then it is not offered
- Given the tuner is offline, when I tune a live channel, then the "no signal" page says the tuner has no signal

### Epic V2-E4: Channel 0 stays

#### V2-US-11: The story stays first (V2-FR-2, Must)
As a first-time visitor, I want the ghost story as the first channel, so that the site keeps its identity.

**Acceptance criteria**
- Given I power on for the first time, when the set warms up, then channel 0 plays the Occupant's story as in v1
- Given I am on any channel, when I choose channel 0, then I return to it within 1 s
- Given I watch a programme, when the Occupant appears, then it is only in the static between channels, and not in Calm mode

## 12. Story map
| Release | Stories |
|---|---|
| v2 MVP (public build) | V2-US-1, V2-US-2, V2-US-3, V2-US-4, V2-US-5, V2-US-6, V2-US-11 |
| v2 MVP (private build) | V2-US-7, V2-US-8, V2-US-9, V2-US-10 |
| v2.1 | Guide polish (V2-FR-10), V2-FR-11, V2-FR-25b, V2-FR-35, V2-FR-37 |
| Later | V2-FR-14 |

## 13. Assumptions
1. v1 ships first, is tagged v1.0, and is not altered by v2.
2. The user has a working SAT>IP box or PC tuner for DD Free Dish.
3. Household accounts are few and created by the owner by hand.
4. The architect picks the relay, streaming format and limiter design.
5. The user approves each archive clip before release.
6. Archive clips are stored on the public site's own origin.

## 14. Open questions
The user's decisions resolve Q-V2-1 to Q-V2-4 (section 0). Remaining, to answer before v2 build starts:

| # | Question | Default if unanswered |
|---|---|---|
| Q-V2-5 | Which archive footage do you want (themes or sources)? You will need to approve each clip's licence evidence | Public-domain and CC0 vintage material (for example old public-information films, nature and science footage) chosen by the team and proposed for your approval |
| Q-V2-6 | How will the private build be hosted (a device in your home, or a small home server) and which VPN, if any? | A device on the home network, reached over the home network only; no public hosting |
