# Where people like to watch: candidate environments (research, 2026-11-11)

Researched by a general-purpose research agent for the tech lead.

On the evidence: VR-app sources are good for showing that an environment exists. The "where people watch" figures mostly come from vendor surveys, so treat them as rough. The India-specific places are backed by news features, not usage data. The strongest single demand signal is Bigscreen calling its drive-in its "#1 most requested feature" (UploadVR, Dec 2020), which supports the car / drive-in scene.

The first four environments are already chosen: the 1970s TV room, a cinema theatre, a car (dashboard or drive-in) and an open-air screen.

## Ranked candidates
Build cost and mobile ratings are estimates.

| # | Environment | Mood | Suits | Build | Mobile | Evidence |
|---|---|---|---|---|---|---|
| 1 | Rainy-night bedroom / lofi room | Cosy, late night | Music, movies | Low | Excellent | 85% stream in bed (Tuck survey); Lofi Girl at ~15.8M subscribers; Vice on ambience videos |
| 2 | Chai stall with cricket on the TV | Communal, Indian | Sport, news | Medium (crowd as sprites) | Good | Quint, Adgully, Siasat features on IPL at tea stalls |
| 3 | Train window seat (Indian Railways) | Nostalgic, journey | Movies, music | Medium (parallax landscape) | Good | ~42% of Indians stream on commutes (Penthera, 2019 data); RailOne OTT; slow TV |
| 4 | Space observation deck | Awe, sci-fi | Music, sci-fi | Low | Best | Bigscreen, Plex VR Void, Apple Vision Pro Moon and Jupiter |
| 5 | Fireplace cabin / ski lodge | Warm, holiday | Movies, music | Medium | Good | Netflix VR living room; Netflix fireplace |
| 6 | Rainy café / jazz bar | Mellow | Music, news | Medium | Fine | Vice ambience videos |
| 7 | Indian city rooftop terrace | Festive | Sport, movies | Medium | Good | Rooftop IPL screenings; Sunset Cinema Club (a variant of the open-air screen) |
| 8 | Airplane seatback | Travel cocoon | Movies | Medium | Good | APEX survey; Air Canada (the flattest, most head-on screen of all) |
| 9 | Penthouse at night | Aspirational | Movies, news, sport | Low | Excellent | Plex VR, Bigscreen, Disney+ Vision Pro |
| 10 | Sports bar / fan zone | Loud, social | Sport | Medium-high | Fair | World Cup 2026 surveys (only one screen can be live) |
| 11 | Campfire | Quiet, friends | Music, movies | Low-medium | Good | Bigscreen Campfire |
| 12 | Single-screen Indian cinema hall | Nostalgic | Bollywood, regional | High | Fair | Decline from ~14,000 to ~2,000 halls (AFP 2026; SCMP) (a reskin of the cinema) |
| 13 | Doordarshan-era family living room | Warm nostalgia | Old TV, songs | Low | Excellent | Ramayan's 2020 re-run (a reskin of the TV room) |
| 14 | Touring tent talkies | Folk, magical | Classic movies | Medium-high | Fair | *The Cinema Travellers* (Cannes 2016) (a variant of the open-air screen) |
| 15 | Beach / lakeside at sunset | Holiday | Music | Medium-high (water) | Costly | Vision Pro Beach and Bora Bora |
| 16 | Underwater dome | Dreamy | Music, kids | Medium | Fair-good | Quest Oceanarium |
| 17 | Kitchen counter | Everyday | Cooking, news | Low | Good | Real behaviour, low appeal as a place to be |
| 18 | Gym / treadmill | Everyday | | Medium | Good | Real behaviour, low appeal as a place to be |

## Themes
- **Cosy home:** 1, 5, 9, 13 (with the existing TV room)
- **Public venues:** 2, 6, 10, 12 (with the existing cinema)
- **Travel:** 3, 8 (with the existing car)
- **Outdoors:** 7, 11, 14, 15 (with the existing open-air screen)
- **Fantasy:** 4, 16

## Recommended next four
1. Rainy-night bedroom
2. Chai stall with cricket
3. Train window seat (or the airplane, for a global audience and the flattest screen)
4. Space observation deck (or the fireplace cabin, for warmth instead of sci-fi)

Cheap extras: the single-screen hall, the Doordarshan-era living room and the Indian rooftop can be reskins of the existing cinema, TV room and open-air screen.

## Where an embedded player is awkward
- **YouTube no-overlay rule.** Nothing may be drawn over the player. This affects scenes where something naturally sits in front of the screen:
  - the drive-in windscreen, so keep the glass clear over the screen area;
  - the CRT, so put the effects on the bezel only;
  - crowd heads in the chai stall, sports bar and tent talkies.
- **Small screens.** On mobile, the train, chai stall and campfire screens can drop below YouTube's 200 px minimum. Add a "focus" mode that brings the screen up close.
- **Flat screens only.** Cross-origin iframes can only be flat rectangles, so there are no curved, dome or wraparound screens. Letterbox wide formats.
- **No pixel access.** Light spill from the screen (glow, cinema bounce light, reflections on water) must be faked with a generic flicker.
- **Input conflicts.** Dragging the 3D view usually means disabling pointer events on the iframe. Firefox has quirks with cross-origin iframes in CSS3D.
- **Multiple screens.** Run only one live iframe at a time. In the sports bar, the other TVs show placeholder loops.
- **Moving scenes.** In vehicles, the screen must stay fixed relative to the viewer, and only the outside scenery moves.
