// Owner: architect (v2 Phase 2), handed to qa-engineer. Player placement rules, ADR 0011 §1.
import { describe, expect, it } from 'vitest';
import {
  classifyPlacement,
  ENVIRONMENT_IDS,
  type ScreenCorners,
} from '../../src/scene/environments/contract.ts';

const vp = { width: 1440, height: 900 };
const quad = (x: number, y: number, w: number, h: number, skew = 0): ScreenCorners => [
  { x, y },
  { x: x + w, y: y + skew },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const opts = { pose: 'watch' as const, phone: false, userFocus: false, mode2d: false };

describe('classifyPlacement', () => {
  it('shows a face-on, large-enough, on-screen player inline', () => {
    expect(classifyPlacement(quad(100, 100, 960, 540), vp, opts)).toEqual({
      kind: 'inline',
      rect: { x: 100, y: 100, width: 960, height: 540 },
    });
  });
  it('accepts up to 1 px of misalignment and rejects more', () => {
    expect(classifyPlacement(quad(100, 100, 960, 540, 1), vp, opts).kind).toBe('inline');
    expect(classifyPlacement(quad(100, 100, 960, 540, 2), vp, opts)).toEqual({
      kind: 'hidden',
      reason: 'not-face-on',
    });
  });
  it('hides the player when any part is off screen', () => {
    expect(classifyPlacement(quad(800, 100, 960, 540), vp, opts)).toEqual({
      kind: 'hidden',
      reason: 'off-screen',
    });
  });
  it('uses focus mode below 480 x 270, on phones, on request and in 2D', () => {
    expect(classifyPlacement(quad(0, 0, 479, 300), vp, opts)).toEqual({
      kind: 'focus',
      reason: 'too-small',
    });
    expect(classifyPlacement(quad(0, 0, 960, 540), vp, { ...opts, phone: true }).kind).toBe(
      'focus',
    );
    expect(classifyPlacement(null, vp, { ...opts, userFocus: true })).toEqual({
      kind: 'focus',
      reason: 'user',
    });
    expect(classifyPlacement(null, vp, { ...opts, mode2d: true })).toEqual({
      kind: 'focus',
      reason: '2d',
    });
  });
  it('never shows the player in the browse pose', () => {
    expect(classifyPlacement(quad(100, 100, 960, 540), vp, { ...opts, pose: 'browse' })).toEqual({
      kind: 'hidden',
      reason: 'browse',
    });
  });
  it('lists the eight approved environments with the TV room first', () => {
    expect(ENVIRONMENT_IDS).toEqual([
      'tv-room',
      'cinema',
      'drive-in',
      'open-air',
      'bedroom',
      'chai-stall',
      'train',
      'space-deck',
    ]);
  });
});

describe('registry', () => {
  it('registers every id and each stub loads with a matching id', async () => {
    const { ENVIRONMENTS } = await import('../../src/scene/environments/registry.ts');
    for (const id of ENVIRONMENT_IDS) {
      const mod = await ENVIRONMENTS[id].load();
      expect(mod.default.id).toBe(id);
      expect(Boolean(mod.default.hostsChannel0)).toBe(id === 'tv-room');
    }
  });
});
