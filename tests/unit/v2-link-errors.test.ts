import { describe, expect, it } from 'vitest';
import { LINK_MESSAGES, parseVideoLink } from '../../src/ui/guide/parseLink.ts';
import { NO_SIGNAL, mapPlayerError } from '../../src/ui/player/errors.ts';

const ID = 'dQw4w9WgXcQ';

describe('paste-a-link parser (single videos only)', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=30s`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc`],
    [`https://www.youtube.com/live/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`  youtube.com/watch?v=${ID}  `],
  ])('accepts %s', (link) => {
    expect(parseVideoLink(link)).toEqual({ ok: true, videoId: ID });
  });

  it('rejects playlist, channel, handle and list links with the list message', () => {
    for (const link of [
      'https://www.youtube.com/playlist?list=PL1234567890ABCDEF',
      'https://www.youtube.com/channel/UCKwucPzHZ7zCUIf7If-Wo1g',
      'https://www.youtube.com/@NASA',
      'https://www.youtube.com/@NASA/live',
      'https://www.youtube.com/c/NASA',
      'https://www.youtube.com/user/NASA',
      'https://www.youtube.com/embed/videoseries?list=PL1234567890ABCDEF',
      'https://www.youtube.com/watch?list=PL1234567890ABCDEF',
    ]) {
      expect(parseVideoLink(link), link).toEqual({ ok: false, problem: 'list' });
    }
  });

  it('rejects other hosts, look-alikes and non-links', () => {
    expect(parseVideoLink('https://vimeo.com/12345678')).toEqual({ ok: false, problem: 'host' });
    expect(parseVideoLink(`https://youtube.com.evil.example/watch?v=${ID}`)).toEqual({
      ok: false,
      problem: 'host',
    });
    expect(parseVideoLink(`https://evil.example/youtu.be/${ID}`)).toEqual({
      ok: false,
      problem: 'host',
    });
    expect(parseVideoLink('hello there')).toEqual({ ok: false, problem: 'not-url' });
    expect(parseVideoLink('hello')).toEqual({ ok: false, problem: 'not-url' });
    expect(parseVideoLink('javascript:alert(1)')).toEqual({ ok: false, problem: 'not-url' });
    expect(parseVideoLink('')).toEqual({ ok: false, problem: 'empty' });
    expect(parseVideoLink('   ')).toEqual({ ok: false, problem: 'empty' });
  });

  it('rejects links with no valid 11-character id', () => {
    expect(parseVideoLink('https://www.youtube.com/watch?v=short')).toEqual({
      ok: false,
      problem: 'no-id',
    });
    expect(parseVideoLink('https://youtu.be/')).toEqual({ ok: false, problem: 'no-id' });
    expect(parseVideoLink('https://www.youtube.com/')).toEqual({ ok: false, problem: 'no-id' });
    expect(parseVideoLink(`https://www.youtube.com/watch?v=${ID}extra`)).toEqual({
      ok: false,
      problem: 'no-id',
    });
  });

  it('has a plain message for every problem', () => {
    for (const problem of ['empty', 'not-url', 'host', 'list', 'no-id'] as const) {
      expect(LINK_MESSAGES[problem].length).toBeGreaterThan(10);
    }
  });
});

describe('player error mapping (V2-YT-8)', () => {
  it('maps each documented code to its class', () => {
    expect(mapPlayerError(2)).toBe('garbled');
    expect(mapPlayerError(5)).toBe('fault');
    expect(mapPlayerError(100)).toBe('off-air');
    expect(mapPlayerError(101)).toBe('not-for-set');
    expect(mapPlayerError(150)).toBe('not-for-set');
    expect(mapPlayerError(153)).toBe('unverified');
  });

  it('treats unknown codes as a player fault', () => {
    expect(mapPlayerError(0)).toBe('fault');
    expect(mapPlayerError(999)).toBe('fault');
  });

  it('gives every class a heading, plain text and a next action', () => {
    for (const cls of [
      'garbled',
      'fault',
      'off-air',
      'not-for-set',
      'unverified',
      'blocked',
    ] as const) {
      const copy = NO_SIGNAL[cls];
      expect(copy.heading).toMatch(/^[A-Z' ]+$/);
      expect(copy.body.length).toBeGreaterThan(20);
      expect(copy.actions.length).toBeGreaterThan(0);
    }
    // Region and embedding blocks never offer a way around them (V2-YT-15).
    expect(NO_SIGNAL['not-for-set'].body).toMatch(/not try to get around/);
    expect(NO_SIGNAL.unverified.body).toMatch(/153/);
  });
});
