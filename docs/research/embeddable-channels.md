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

## 2. Indian private news channels (all live and embeddable from India; high confidence)
- **Hindi:** Aaj Tak, ABP News, NDTV India, Zee News, India TV, News18 India, Times Now Navbharat, Republic Bharat, TV9 Bharatvarsh, News Nation, News24.
- **English:** India Today, NDTV 24x7, CNN-News18, Times Now, Mirror Now, WION, Republic World.
- **Business:** ET Now, CNBC-TV18, Zee Business, NDTV Profit.
- **Regional:** ABP Majha and Zee 24 Taas (Marathi); Asianet News and Manorama News (Malayalam); Thanthi TV, Polimer News and Sun News (Tamil); TV9 Telugu and NTV Telugu; TV9 Kannada.

These channels run several streams at once. Resolve the current "LIVE TV / 24x7" stream from the channel ID.

## 3. International channels (high confidence unless noted)
- **News:** Al Jazeera English and Al Jazeera Arabic, DW News, France 24 (English and French), Euronews (English and French), Africanews, ABC News Live, NBC News NOW, CBS News 24/7, LiveNOW from FOX, Sky News, NHK World-Japan, KBS World, TRT World, CGTN, ABC News (Australia), CBC News.
  - TRT World and CGTN are state media.
  - Bloomberg Television's live stream is on the YouTube channel @markets, not @BloombergTelevision.
- **Science:** NASA on YouTube. NASA TV was retired in 2024. NASA's media guidelines require crediting NASA and forbid implying endorsement.
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
