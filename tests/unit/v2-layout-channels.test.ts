import { describe, expect, it } from 'vitest';
import type { GuideChannel } from '../../src/guide/schema.ts';
import type { ScreenCorners } from '../../src/scene/environments/contract.ts';
import { isColourActive } from '../../src/state/derived.ts';
import {
  isViaEmbed,
  liveChannelFromGuide,
  liveChannelFromLink,
  nextLiveChannel,
} from '../../src/state/liveChannel.ts';
import { roomSoundAudible } from '../../src/state/roomSoundRule.ts';
import {
  PHONE_MIN_PLAYER_H,
  focusRect,
  panelCoversPlayer,
  resolveLayout,
  type LayoutInput,
} from '../../src/ui/player/layout.ts';

function channel(n: number, state: GuideChannel['state'], name = `Channel ${n}`): GuideChannel {
  const live = state === 'live';
  return {
    number: n,
    name,
    channelId: `UC${String(n).padStart(22, 'a')}`,
    languages: ['en'],
    genre: 'news',
    country: 'IN',
    attribution: { label: `${name} on YouTube`, url: 'https://www.youtube.com/channel/x' },
    stateMedia: false,
    state,
    live: live
      ? {
          videoId: `video${String(n).padStart(6, '0')}`,
          title: 't',
          checkedAt: '2026-11-11T00:00:00Z',
        }
      : null,
    stale: false,
  };
}

describe('channel stepping', () => {
  const channels = [
    channel(1, 'off-air'),
    channel(2, 'live'),
    channel(3, 'off-air'),
    channel(5, 'live'),
    channel(9, 'live'),
  ];

  it('skips off-air entries and wraps', () => {
    expect(nextLiveChannel(channels, 2, 1)?.number).toBe(5);
    expect(nextLiveChannel(channels, 9, 1)?.number).toBe(2);
    expect(nextLiveChannel(channels, 5, -1)?.number).toBe(2);
    expect(nextLiveChannel(channels, 2, -1)?.number).toBe(9);
  });

  it('starts from the first or last live channel when none is chosen', () => {
    expect(nextLiveChannel(channels, null, 1)?.number).toBe(2);
    expect(nextLiveChannel(channels, null, -1)?.number).toBe(9);
  });

  it('returns null when nothing is on air', () => {
    expect(nextLiveChannel([channel(1, 'off-air')], null, 1)).toBeNull();
  });

  it('only builds a live channel from a live entry', () => {
    expect(liveChannelFromGuide(channel(1, 'off-air'))).toBeNull();
    const live = liveChannelFromGuide(channel(4, 'live', 'DD News'));
    expect(live?.viaEmbed).toBe(true);
    expect(live?.watchUrl).toBe('https://www.youtube.com/watch?v=video000004');
    expect(isViaEmbed({ name: 'Aaj Tak' })).toBe(false);
    const link = liveChannelFromLink('dQw4w9WgXcQ');
    expect(link).toMatchObject({ kind: 'link', number: null, videoId: 'dQw4w9WgXcQ' });
  });
});

describe('colour option (2050: Colour by default, Monochrome when off)', () => {
  it('follows the switch in every room and on channel 0', () => {
    expect(isColourActive('colour')).toBe(true);
    expect(isColourActive('bw')).toBe(false);
  });
});

describe('room sound rule', () => {
  it('is silent by default, under Calm, and while the video has sound', () => {
    expect(
      roomSoundAudible({ on: false, calm: false, videoPlaying: false, videoMuted: true }),
    ).toBe(false);
    expect(roomSoundAudible({ on: true, calm: true, videoPlaying: false, videoMuted: true })).toBe(
      false,
    );
    expect(roomSoundAudible({ on: true, calm: false, videoPlaying: true, videoMuted: false })).toBe(
      false,
    );
  });

  it('plays while the video is muted or nothing plays', () => {
    expect(roomSoundAudible({ on: true, calm: false, videoPlaying: true, videoMuted: true })).toBe(
      true,
    );
    expect(
      roomSoundAudible({ on: true, calm: false, videoPlaying: false, videoMuted: false }),
    ).toBe(true);
  });
});

const base: LayoutInput = {
  viewport: { width: 1440, height: 900 },
  corners: null,
  scenePlacement: null,
  pose: 'watch',
  phone: false,
  mode2d: false,
  userFocus: false,
};

const corners = (x: number, y: number, w: number, h: number): ScreenCorners => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

describe('player layout', () => {
  it('shows the player inline at the projected rectangle, with the info row under it', () => {
    const layout = resolveLayout({ ...base, corners: corners(300, 100, 800, 450) });
    expect(layout.kind).toBe('inline');
    if (layout.kind === 'inline') {
      expect(layout.rect).toEqual({ x: 300, y: 100, width: 800, height: 450 });
      expect(layout.info.y).toBeGreaterThanOrEqual(550);
      expect(layout.info.x).toBe(300);
    }
  });

  it('falls back to the focus layout under 480 x 270 and for phones, 2D and a manual choice', () => {
    expect(resolveLayout({ ...base, corners: corners(300, 100, 400, 225) }).kind).toBe('focus');
    expect(resolveLayout({ ...base, phone: true, corners: corners(300, 100, 800, 450) }).kind).toBe(
      'focus',
    );
    expect(resolveLayout({ ...base, mode2d: true }).kind).toBe('focus');
    expect(
      resolveLayout({ ...base, userFocus: true, corners: corners(300, 100, 800, 450) }).kind,
    ).toBe('focus');
  });

  it('hides the player in the browse pose and when the screen is not face-on', () => {
    expect(
      resolveLayout({ ...base, pose: 'browse', corners: corners(300, 100, 800, 450) }).kind,
    ).toBe('hidden');
    const skewed: ScreenCorners = [
      { x: 300, y: 100 },
      { x: 1100, y: 130 },
      { x: 1100, y: 550 },
      { x: 300, y: 550 },
    ];
    expect(resolveLayout({ ...base, corners: skewed }).kind).toBe('hidden');
  });

  it('uses the focus layout when the scene has published nothing, so the player is never lost', () => {
    expect(resolveLayout(base).kind).toBe('focus');
  });

  it('keeps the player at least 200 x 200 in every focus layout, and 360 x 240 on a 360 px phone', () => {
    for (const viewport of [
      { width: 360, height: 740 },
      { width: 320, height: 568 },
      { width: 740, height: 360 },
      { width: 1440, height: 900 },
      { width: 1024, height: 600 },
    ]) {
      const { rect } = focusRect(viewport);
      expect(rect.width, JSON.stringify(viewport)).toBeGreaterThanOrEqual(200);
      expect(rect.height, JSON.stringify(viewport)).toBeGreaterThanOrEqual(200);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
    }
    const phone = focusRect({ width: 360, height: 740 }).rect;
    expect(phone.width).toBe(360);
    expect(phone.height).toBeGreaterThanOrEqual(PHONE_MIN_PLAYER_H);
  });

  it('leaves room for the info row and dock below the focus player', () => {
    const v = { width: 360, height: 740 };
    const { rect, info } = focusRect(v);
    expect(info.y).toBeGreaterThanOrEqual(rect.y + rect.height);
    expect(info.y + info.height).toBeLessThanOrEqual(v.height - 64);
  });

  it('pauses and hides the player when a panel would cover it, never covers it', () => {
    const v = { width: 1440, height: 900 };
    const inline = resolveLayout({ ...base, corners: corners(300, 100, 800, 450) });
    expect(panelCoversPlayer('guide', inline, v)).toBe(true); // 300 < 560
    const right = resolveLayout({ ...base, corners: corners(640, 100, 700, 394) });
    expect(panelCoversPlayer('guide', right, v)).toBe(false);
    expect(panelCoversPlayer('notice', right, v)).toBe(true);
    expect(panelCoversPlayer(null, inline, v)).toBe(false);
    const focus = resolveLayout({ ...base, phone: true });
    expect(panelCoversPlayer('picker', focus, v)).toBe(true);
  });
});

describe('dock keep-out (never over the player, its info row or the 24 px margin)', () => {
  it('keeps the player in the room at 1024 x 600 when the one-row dock clears it', () => {
    const v = { width: 1024, height: 600 };
    const layout = resolveLayout({ ...base, viewport: v, corners: corners(212, 78, 600, 335) });
    expect(layout.kind).toBe('inline');
  });

  it('switches to focus at 1024 x 600 when the player would reach the dock', () => {
    const v = { width: 1024, height: 600 };
    const layout = resolveLayout({ ...base, viewport: v, corners: corners(172, 90, 680, 383) });
    expect(layout.kind).toBe('focus');
  });

  it('switches to focus at 1280 x 720 for a tall player, and keeps a smaller one inline', () => {
    const v = { width: 1280, height: 720 };
    expect(resolveLayout({ ...base, viewport: v, corners: corners(256, 150, 768, 432) }).kind).toBe(
      'focus',
    );
    expect(resolveLayout({ ...base, viewport: v, corners: corners(320, 56, 640, 360) }).kind).toBe(
      'inline',
    );
  });

  it('uses the focus layout without overlapping the dock, in every size', () => {
    for (const v of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 1024, height: 600 },
    ]) {
      const { rect, info } = focusRect(v);
      const dockTop = v.height - 100;
      expect(info.y + info.height, JSON.stringify(v)).toBeLessThanOrEqual(dockTop + 1);
      expect(rect.height).toBeGreaterThanOrEqual(200);
    }
  });
});
