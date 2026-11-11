# Embeddable live channels (research, 2026-11-11)

Researched by a general-purpose research agent for the tech lead. Checked from India (Tamil Nadu) by reading each YouTube channel's `/live` and `/streams` page metadata: live now, playable in embed, and channel ID. Live **video IDs change often**, so store **channel IDs**.

## Bottom line
- **59 channels are high-confidence embeddable today; 38 of them are Indian.** The Indian ones are 6 public-service channels plus 32 private news channels. There are 21 international channels.
- About 9 more are medium confidence. DD Sports, most DD regional channels, UN Web TV, raw HLS URLs and every iptv-org entry are low confidence or unusable.
- Almost every source works only through the **YouTube IFrame Player**. I found no broadcaster that publishes a live HLS stream explicitly for third-party use.

## YouTube terms that apply to every YouTube row
- Terms of Service: https://www.youtube.com/t/terms
- API Services Terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- Required Minimum Functionality: https://developers.google.com/youtube/terms/required-minimum-functionality

## 1. Prasar Bharati, Doordarshan and Sansad TV (DD Free Dish)
Prasar Bharati's site terms limit use to "personal or educational" purposes, with no redistribution or modification without written consent (https://prasarbharati.gov.in/terms-conditions/). Its hyperlinking policy asks for permission before linking. None of its pages mention embedding. The YouTube embed is governed by YouTube's terms, because the channel owner has enabled embedding. Even so, written permission is the safe route for a public product. I found no reachable WAVES OTT terms, so WAVES is not a usable source.

| Channel | Genre | YouTube channel ID | Status | Confidence |
|---|---|---|---|---|
| DD News | Hindi/English news | UCKwucPzHZ7zCUIf7If-Wo1g | 24x7 live, embeddable | High |
| DD India | English international news | UCGDQNvybfDDeGTf4GtigXaw | 24x7 live, embeddable | High |
| DD Kisan | Hindi agriculture | UCnDfmcUyhgJp6xC1LmBLfUg | 24x7 live, embeddable | High |
| DD Urdu | Urdu general | UCu9Fj9QRAg26ZY9DhF8HSrQ | 24x7 live, embeddable | High |
| Sansad TV 1 and 2 | Parliament | UCISgnSNwqQ2i8lhCun3KtQg | Two live streams, embeddable | High |
| DD Bharati | Culture | UCIAnlTV3O9NYWMI-DwYZaWg | 24x7 live; the Prasar Bharati page links a different handle | Medium |
| DD National | General entertainment | UCSjPe5kinQtwcyHcFJyyMfw | Event-based only, not 24/7 | Medium |
| DD Saptagiri, DD Uttar Pradesh | Regional | UCcsvAreQ1IxIjWlBSpNEOWg, UCxtPipsf2nUZ9xM33TPe93Q | Live programmes only | Medium |
| DD Sports, most DD regional channels | | | No live stream found | Low |

In `src/content/guide-sources.json` the five high-confidence entries above (DD News, DD India, DD Kisan, DD Urdu and Sansad TV, numbers 1 to 5) are `permission: "requested"` and `enabled: false`. They stay off until the permission email has been confirmed as sent.

## 2. Indian private news channels (all live and embeddable from India; high confidence)
- **Hindi:** Aaj Tak, ABP News, NDTV India, Zee News, India TV, News18 India, Times Now Navbharat, Republic Bharat, TV9 Bharatvarsh, News Nation, News24.
- **English:** India Today, NDTV 24x7, CNN-News18, Times Now, Mirror Now, WION, Republic World.
- **Business:** ET Now, CNBC-TV18, Zee Business, NDTV Profit.
- **Regional:** ABP Majha and Zee 24 Taas (Marathi); Asianet News and Manorama News (Malayalam); Thanthi TV, Polimer News and Sun News (Tamil); TV9 Telugu and NTV Telugu; TV9 Kannada.

These channels run several streams at once. Resolve the current "LIVE TV / 24x7" stream from the channel ID.

**Verified channel IDs** (2026-11-11, from India). Each ID was resolved from the channel's `/@handle` page metadata, where the canonical URL and `externalId` agree, and the channel was live with `playableInEmbed=true`. Numbers match `src/content/guide-sources.json`.

| # | Channel | Language | Genre | Country | YouTube channel ID |
|---|---|---|---|---|---|
| 6 | Aaj Tak | hi | news | IN | UCt4t-jeY85JegMlZ-E5UWtA |
| 7 | ABP News | hi | news | IN | UCRWFSbif-RFENbBrSiez1DA |
| 8 | NDTV India | hi | news | IN | UC9CYT9gSNLevX5ey2_6CK0Q |
| 9 | Zee News | hi | news | IN | UCIvaYmXn910QMdemBG3v1pQ |
| 10 | India TV | hi | news | IN | UCttspZesZIDEwwpVIgoZtWQ |
| 11 | News18 India | hi | news | IN | UCPP3etACgdUWvizcES1dJ8Q |
| 12 | Times Now Navbharat | hi | news | IN | UCMk9Tdc-d1BIcAFaSppiVkw |
| 13 | Republic Bharat | hi | news | IN | UC7wXt18f2iA3EDXeqAVuKng |
| 14 | TV9 Bharatvarsh | hi | news | IN | UCOutOIcn_oho8pyVN3Ng-Pg |
| 15 | News Nation | hi | news | IN | UCsNdeLwEZf86swPD3qJJ7Dw |
| 16 | News24 | hi | news | IN | UCuzS3rPQAYqHcLWqOFuY0pw |
| 17 | India Today | en | news | IN | UCYPvAwZP8pZhSMW8qs7cVCw |
| 18 | NDTV 24x7 | en | news | IN | UCZFMm1mMw0F81Z37aaEzTUA |
| 19 | CNN-News18 | en | news | IN | UCef1-8eOpJgud7szVPlZQAQ |
| 20 | Times Now | en | news | IN | UC6RJ7-PaXg6TIH2BzZfTV7w |
| 21 | Mirror Now | en | news | IN | UCWCEYVwSqr7Epo6sSCfUgiw |
| 22 | WION | en | news | IN | UC_gUM8rL-Lrg6O3adPW9K1g |
| 23 | Republic World | en | news | IN | UCwqusr8YDwM-3mEYTDeJHzw |
| 24 | ET Now | en | business | IN | UCI_mwTKUhicNzFrhm33MzBQ |
| 25 | CNBC-TV18 | en | business | IN | UCmRbHAgG2k2vDUvb3xsEunQ |
| 26 | Zee Business | hi | business | IN | UCkXopQ3ubd-rnXnStZqCl2w |
| 27 | NDTV Profit | en, hi | business | IN | UC3uJIdRFTGgLWrUziaHbzrg |
| 28 | ABP Majha | mr | news | IN | UCH7nv1A9xIrAifZJNvt7cgA |
| 29 | Zee 24 Taas | mr | news | IN | UCVbsFo8aCgvIRIO9RYwsQMA |
| 30 | Asianet News | ml | news | IN | UCf8w5m0YsRa8MHQ5bwSGmbw |
| 31 | Manorama News | ml | news | IN | UCP0uG-mcMImgKnJz-VjJZmQ |
| 32 | Thanthi TV | ta | news | IN | UC-JFyL0zDFOsPMpuWu39rPA |
| 33 | Polimer News | ta | news | IN | UC8Z-VjXBtDJTvq6aqkIskPg |
| 34 | Sun News | ta | news | IN | UCYlh4lH762HvHt6mmiecyWQ |
| 35 | TV9 Telugu | te | news | IN | UCPXTXMecYqnRKNdqdVOGSFg |
| 36 | NTV Telugu | te | news | IN | UCumtYpCY26F6Jr3satUgMvA |
| 37 | TV9 Kannada | kn | news | IN | UC8dnBi4WUErqYQHZ4PfsLTg |

NTV Telugu uses the main channel @ntvtelugu. The earlier @ntvtelugulive ("NTV Live", UCtzYV2L-m8ew93mZb3qhf5w) is a smaller secondary channel and had no live stream on recheck.

## 3. International channels (high confidence unless noted)
- **News:** Al Jazeera English and Al Jazeera Arabic, DW News, France 24 (English and French), Euronews (English and French), Africanews, ABC News Live, NBC News NOW, CBS News 24/7, LiveNOW from FOX, Sky News, NHK World-Japan, KBS World, TRT World, CGTN, ABC News (Australia), CBC News.
  - TRT World and CGTN are state media.
  - Bloomberg Television's live stream is on the YouTube channel @markets, not @BloombergTelevision.
- **Science:** NASA on YouTube. NASA TV was retired in 2024. NASA's media guidelines require crediting NASA and forbid implying endorsement.
- **Verified channel IDs** (2026-11-11, from India, checked the same way as section 2). TRT World and CGTN are state media; the guide schema has no tag for this, so it is recorded in each entry's `note`.

| # | Channel | Language | Genre | Country | YouTube channel ID |
|---|---|---|---|---|---|
| 38 | Al Jazeera English | en | news | QA | UCNye-wNBqNL5ZzHSJj3l8Bg |
| 39 | Al Jazeera Arabic | ar | news | QA | UCfiwzLy-8yKzIbsmZTzxDgw |
| 40 | DW News | en | news | DE | UCknLrEdhRCp1aegoMqRaCZg |
| 41 | France 24 English | en | news | FR | UCQfwfsi5VrQ8yKZ-UWmAEFg |
| 42 | France 24 (French) | fr | news | FR | UCCCPCZNChQdGa9EkATeye4g |
| 43 | Euronews English | en | news | FR | UCSrZ3UV4jOidv8ppoVuvW9Q |
| 44 | Euronews (French) | fr | news | FR | UCW2QcKZiU8aUGg4yxCIditg |
| 45 | Africanews | en | news | CG | UC1_E8NeF5QHY2dtdLRBCCLA |
| 46 | ABC News Live | en | news | US | UCBi2mrWuNuyYy4gbM6fU18Q |
| 47 | NBC News NOW | en | news | US | UCeY0bbntWzzVIaj2z3QigXg |
| 48 | CBS News 24/7 | en | news | US | UC8p1vwvWtl6T73JiExfWs1g |
| 49 | LiveNOW from FOX | en | news | US | UCJg9wBPyKMNA5sRDnvzmkdg |
| 50 | Bloomberg Television | en | business | US | UCIALMKvObZNtJ6AmdCLP7Lg |
| 51 | Sky News | en | news | GB | UCoMdktPbSTixAyNGwb-UYkQ |
| 52 | NHK World-Japan | en | news | JP | UCSPEjw8F2nQDtmUKPFNF7_A |
| 53 | KBS World | ko, en | general | KR | UC5BMQOsAB8hKUyHu9KI6yig |
| 54 | TRT World | en | news | TR | UC7fWeaHhqgM4Ry-RMpM2YYw |
| 55 | CGTN | en | news | CN | UCgrNz-aDmcr2uuto8_DL2jg |
| 56 | ABC News (Australia) | en | news | AU | UCVgO39Bk5sMo66-6o6Spn6Q |
| 57 | CBC News | en | news | CA | UCuFFtHWoLl5fauMMD5Ww2jA |
| 58 | NASA | en | science | US | UCLA_DiR1FfKNvjuUpBHmylQ |

- **Medium confidence:**
  - EbS / EbS+ (European Commission): official iframe, CC BY 4.0, https://audiovisual.ec.europa.eu/en/conditions-of-use.
  - UK Parliament.
  - Reuters and Global News (event-based streams only).
- **Low confidence:** UN Web TV (licence required) and DW's raw HLS stream. DW's stream has CORS open, but nothing licenses it for third-party use.

## 4. Unofficial IPTV playlists (iptv-org and similar): do not use
- They are user-submitted links, and the README disclaims rights.
- Most India entries point to third-party restreams. One even points to a home Tvheadend server on a raw IP address.
- 209 entries spoof User-Agent or Referer headers.
- Hotlinking them republishes broadcasts without a licence, and Indian broadcasters routinely obtain court orders against unauthorised streams.

## Key constraints
1. **YouTube embed rules**
   - Nothing may be drawn over any part of the player.
   - The player and its audio or video must not be modified. A CSS filter or scanline layer on the player very likely breaches this.
   - The player must be at least 200×200 px (480×270 or larger recommended), with its controls visible.
   - Autoplay only when more than 50% of the player is visible, and only one autoplaying player per page.
   - No charging users to watch, and no ads inside YouTube content.
   - A privacy policy must mention YouTube API Services.
   - Since July 2025 a Referer header is required: use `Referrer-Policy: strict-origin-when-cross-origin`, and handle errors 100, 101/150 and 153.
   - `embed/live_stream?channel=` is undocumented and unreliable. Resolve video IDs instead, using the Data API `search.list` with `eventType=live` (costs 100 quota units per call) followed by `videos.list` to check `status.embeddable`.
2. **Cross-origin iframes can never be WebGL textures.** Place them with CSS3D (three.js `CSS3DRenderer` plus a depth-mask hole in the canvas). Anything WebGL drawn in front of the screen counts as an overlay. `VideoTexture` works only for CORS-enabled, non-DRM streams.
3. **Geo-restrictions:** these were tested only from India. Detect errors at runtime.

## Recommendations
1. Use the YouTube IFrame Player as the only playback path. Store channel IDs, and resolve and cache live video IDs regularly.
2. Design every environment around the no-overlay rule. Keep screens flat and face-on, and put the styling around the player, never on it.
3. Keep a WebGL-texture tier only for streams that come with explicit permission. None qualifies today.
4. Write to Prasar Bharati and Sansad TV for written permission before launching the DD channels.
5. Attribute every channel, and keep YouTube branding visible.
6. Exclude iptv-org, any HLS stream scraped from a broadcaster's page, and WAVES.
