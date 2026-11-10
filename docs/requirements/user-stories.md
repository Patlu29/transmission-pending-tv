# User stories

## Changelog
| Date | Change |
|---|---|
| 2026-11-10 | Ghost-story scope change. US-4 changed (horror ghost story). US-1 changed (power off, content note). US-9 changed (Calm mode). New epic E6 with US-18 to US-23. Story map updated. Items marked **[CHANGED]** or **[NEW]**. |

## Epic E1: Power on and first view

### US-1: Switch the TV on and off (FR-1, FR-5, FR-24, Must) **[CHANGED]**
As a visitor, I want to switch the TV on and off myself, so that the show starts and stops when I choose.

**Acceptance criteria**
- Given the page has loaded, when I look at it, then I see a powered-off TV with a labelled power control, a content note about the mild horror theme, and a Calm mode control, and the intro has not started
- Given the TV is on, when I activate the power control, then the picture collapses to a line, then a dot, then fades, and the story stops
- Given the page has loaded, when I look at it, then I see a powered-off TV with a labelled power control and the intro has not started
- Given the power control is visible, when I click it, tap it, or press Enter or Space while it has focus, then the warm-up sequence plays for 1 to 3 s and the intro begins
- Given assets are still loading, when I view the page, then the screen shows a greyscale loading message with progress text and the power control is disabled until ready
- Given an asset fails to load, when loading ends, then I see a clear text error with a retry control and the 2D fallback is offered

### US-2: Experience the CRT look (FR-2, FR-3, FR-4, Must)
As a retro-TV fan, I want the screen to look and read like a 1970s set, so that it feels authentic.

**Acceptance criteria**
- Given the TV is on, when I take a desktop screenshot, then scanlines, noise, glow, vignette and curvature are visible
- Given any screenshot of any state, when I sample pixels, then R, G and B differ by 2 levels or fewer
- Given text is on screen, when I inspect it, then it uses the teletext-style typeface and the licence file lists its source
- Given I use a phone in portrait, when the TV is on, then the screen text is readable without zooming

### US-3: See an original test card (FR-6, Should)
As a visitor, I want to see a test card while waiting, so that the wait feels in character.

**Acceptance criteria**
- Given the TV is on and idle, when no intro is playing, then an original test-card-style graphic is shown
- Given a reviewer compares it against known broadcaster cards, when checked, then it contains no logos, names or copied layouts
- Given reduced motion is on, when the test card shows, then it is static

## Epic E2: The terrible, truthful intro

### US-4: Hear the ghost's story (FR-8, FR-33, FR-30, Must) **[CHANGED]**
As a visitor, I want a ghost trapped in the TV to tell the story of its own making, so that I get a creepy, memorable introduction.

**Acceptance criteria**
- Given I switched the TV on, when the warm-up ends, then the story text appears line by line in teletext style, in the ghost's voice
- Given the intro is playing at default speed, when it finishes, then it has run 45 to 90 s and had a beginning, middle and end
- Given I read it, when I review its tone, then it is mainly creepy, with dark humour at most, and contains no gore or offensive content
- Given the story plays, when I watch it, then no jump scare occurs: nothing appears, sounds or changes suddenly within 300 ms
- Given the intro finishes, when the last line shows, then the Replay control and the page index appear

### US-5: Trust the facts (FR-9, FR-10, FR-12, FR-13, Must)
As a developer, I want every claim in the intro to be true, so that I can verify it against the repo.

**Acceptance criteria**
- Given the intro copy, when the build runs, then each fact is filled from git log, package.json or docs files, and none is typed by hand
- Given a placeholder cannot be resolved, when the build runs, then it fails with a message naming the placeholder
- Given I read the intro, when I look for it, then it states the commit count, first-commit date, agent roles, ordered phases and stack with versions
- Given the intro states a commit count, when I read it, then it names the short commit hash and says "as of commit <hash>"
- Given I run `git rev-list --count` at that hash, when I compare, then it equals the count shown

### US-6: Fail the build when facts drift (FR-11, FR-14, Must/Should)
As a maintainer, I want an automated check, so that the intro cannot silently go stale.

**Acceptance criteria**
- Given the test suite runs, when facts are recomputed independently from the repo, then they equal the values in the rendered page text
- Given I change package.json versions without rebuilding the facts, when tests run, then they fail
- Given hand-written copy contains a digit not on the allow-list, when the lint runs, then it fails (Should)

### US-7: Browse the build diary (FR-15, Should)
As a curious visitor, I want a teletext index of the commits, so that I can read how it was built.

**Acceptance criteria**
- Given the intro has ended or been skipped, when the index shows, then it lists commit subjects from the real git log, in order
- Given I type a page number on the keyboard, when it matches a page, then that page shows
- Given I am on touch, when I tap a page entry or the next and previous controls, then the page changes
- Given the log is longer than one page, when I reach the end, then I see a clear last-page indicator

## Epic E3: Control and accessibility

### US-8: Skip or replay the intro (FR-16, Must)
As a visitor, I want to skip and replay, so that I stay in control.

**Acceptance criteria**
- Given the intro is playing, when I press the Skip control or its keyboard shortcut, then the intro ends and the final page shows within 500 ms
- Given the intro has ended, when I press Replay, then it restarts from the first line
- Given I use only a keyboard, when I tab through the page, then Skip and Replay are reachable, in logical order, with visible focus and text labels
- Given I use a touch device, when I tap Skip, then it works as with a mouse

### US-9: Reduced motion and Calm mode (FR-17, FR-31, Must) **[CHANGED]**
As a person who prefers reduced motion or finds horror effects uncomfortable, I want a calm presentation, so that I can still read the whole story.

**Acceptance criteria**
- Given I switch Calm mode on at any time, when it takes effect, then haunted text, ghost movement, set misbehaviour and camera creep stop, and the story text and facts stay readable
- Given I set Calm mode, when I replay or reload within the visit, then it stays on
- Given my system sets prefers-reduced-motion: reduce, when I enter, then Calm mode is on by default
- Given my system sets prefers-reduced-motion: reduce, when I enter, then there is no warm-up animation, camera movement, rolling bars or jitter
- Given reduced motion is on, when the intro plays, then pages advance by my control or on a slow timer, with static noise instead of animated noise
- Given reduced motion is on, when I change the OS setting during the visit, then the site updates without reload

### US-10: Read it with a screen reader (FR-18, Must)
As a screen-reader user, I want the intro as text, so that I get the same content and jokes.

**Acceptance criteria**
- Given the intro plays, when I use a screen reader, then the complete intro text is available as DOM text in reading order
- Given the canvas is decorative, when I navigate, then it is hidden from assistive tech or has a brief text alternative
- Given new lines appear over time, when they appear, then they do not spam announcements; the full text can be read at once through a "read full text" control

### US-11: Stay safe from flashing (FR-19, Must)
As a person with photosensitivity, I want no harmful flashing, so that the site is safe.

**Acceptance criteria**
- Given any state, when analysed frame by frame, then there are no more than 3 flashes in any one second
- Given power-on or static bursts, when analysed, then no large-area flash exceeds the WCAG 2.3.1 thresholds
- Given the site has a warning need, when I enter, then the start screen includes a short note on flicker effects and the reduced-motion option

### US-12: Work without WebGL (FR-20, Must)
As a visitor on an unsupported device, I want the intro anyway, so that I do not get a blank page.

**Acceptance criteria**
- Given WebGL is disabled, when I load the page, then a notice shows and a 2D presentation offers the same power, intro, skip and replay
- Given the WebGL context is lost mid-intro, when it happens, then the 2D presentation takes over at the current line
- Given the 2D presentation is shown, when I run the facts test, then the same facts appear

## Epic E4: Performance and delivery

### US-13: Fast and smooth everywhere (NFR-1 to NFR-5, Must)
As a visitor on a phone, I want a quick, smooth experience, so that it does not stutter.

**Acceptance criteria**
- Given a 2022 mid-range phone on 4G, when I load the page, then the power control is interactive within 3 s
- Given the intro plays, when frame rate is measured, then it holds 60 FPS on desktop and 30 FPS on mobile
- Given the first view loads, when download size is measured, then it is under 5 MB
- Given the tab is hidden, when it stays hidden, then rendering pauses (Should)

### US-14: Static, private delivery (NFR-7, NFR-8, Must)
As a privacy-conscious visitor, I want no tracking, so that I can enter safely.

**Acceptance criteria**
- Given I load the page, when I inspect the network, then every request is to the site's own origin
- Given I inspect storage, when the page runs, then no cookies are set
- Given deployment, when the bundle is inspected, then it contains only static files

### US-15: Build diary in git (NFR-12, NFR-13, Must)
As a reader of the repo, I want one commit per step, so that history reads as a diary.

**Acceptance criteria**
- Given the repo, when I run `git log --oneline`, then each phase step is a separate commit with a clear imperative message
- Given the history, when I check it, then no commits have been squashed or rewritten after the fact
- Given the assets, when I check the licence notes, then every font, texture and sound has a recorded source

## Epic E5: Extras

### US-16: Period audio (FR-22, Could)
As a visitor, I want optional sound, so that the set feels alive.

**Acceptance criteria**
- Given I arrive, when the page loads, then no audio plays
- Given I press unmute, when the TV is on, then hum and static play, and a visible control mutes them again
- Given reduced motion is on, when audio is enabled, then nothing changes about the choice

### US-17: Channel-change transition (FR-23, Could)
As a visitor, I want a brief static burst between pages, so that it feels like switching channels.

**Acceptance criteria**
- Given I change page, when the transition plays, then it lasts under 400 ms and obeys the flash limits
- Given reduced motion is on, when I change page, then the pages switch without the burst

## Epic E6: Ghost-story animations **[NEW]**

### US-18: Haunted text (FR-25, FR-26, FR-32, Must)
As a visitor, I want the screen text to behave unnaturally, so that the story feels haunted.

**Acceptance criteria**
- Given the story is playing and Calm mode is off, when a line is shown, then it trembles, rewrites a word, or bleeds down the screen at least once in the story
- Given any haunted-text effect has finished, when I read the line, then its text equals the resolved story text exactly
- Given the DOM transcript, when I inspect it during an effect, then the DOM text is unchanged and every fact sits in a `data-fact` span
- Given Calm mode or reduced motion is on, when lines are shown, then none of the effects run

### US-19: Ghost forms in the static (FR-27, FR-19, Must)
As a visitor, I want a pale figure to emerge from the static, so that I feel watched.

**Acceptance criteria**
- Given the story is playing and Calm mode is off, when the story reaches its middle, then a pale greyscale figure forms from the noise over at least 3 s
- Given the figure is visible, when time passes, then it drifts slowly closer to the glass, with no sudden jump in size or position
- Given a reviewer checks the design, when compared with known horror characters, then it is clearly original
- Given the figure forms, when frame-by-frame analysis is run, then flash limits in FR-19 are met
- Given Calm mode is on, when the story plays, then the figure is a still image or absent

### US-20: The set misbehaves (FR-28, Must)
As a desktop visitor, I want the TV itself to act haunted, so that the room feels uneasy.

**Acceptance criteria**
- Given the 3D set is shown and Calm mode is off, when the story plays, then at least three of these occur: a knob turns on its own, the picture rolls, the room light dims
- Given the picture rolls, when it happens, then it takes at least 1 s and passes the flash limits
- Given I am on mobile, when the story plays, then the picture still rolls and the screen dims or vignettes, with no 3D knobs required
- Given Calm mode is on, when the story plays, then none of these occur

### US-21: Camera creep (FR-29, FR-34, Must)
As a desktop visitor, I want the camera to push slowly towards the screen, so that I feel drawn in.

**Acceptance criteria**
- Given the story is playing on desktop and Calm mode is off, when time passes, then the camera moves slowly closer to the screen
- Given the camera has moved, when it reaches its limit, then it stops with all screen text still fully visible
- Given I am on mobile, when the story plays, then the camera does not move
- Given reduced motion or Calm mode is on, when the story plays, then the camera does not move

### US-22: Know what I am in for (FR-24, FR-30, Must)
As a visitor, I want a content note before I start, so that I can choose whether to continue.

**Acceptance criteria**
- Given the start screen, when I read it, then a short note says the theme is mild horror, with no jump scares
- Given the start screen, when I look for Calm mode, then I can turn it on before powering on
- Given I use a screen reader, when I reach the start screen, then the note and Calm control are announced

### US-23: Slow-building audio (FR-35, FR-22, Could)
As a visitor who opted in to sound, I want low, slowly building ambience, so that the dread has a soundtrack.

**Acceptance criteria**
- Given I arrive, when the page loads, then no audio plays
- Given I unmute, when the story plays, then hum and distant static swell gradually, with no sudden loud sound
- Given Calm mode is on, when I unmute, then ambient audio is muted or reduced to a steady low hum

## Story map
| Release | Stories |
|---|---|
| MVP | US-1, US-2, US-4, US-5, US-6 (Must parts), US-8, US-9, US-10, US-11, US-12, US-13, US-14, US-15, US-18, US-19, US-20, US-21, US-22 |
| Release 2 | US-3, US-7, the lint part of US-6, hidden-tab handling in US-13 |
| Release 3 | US-16 and US-23 (audio), US-17 |
