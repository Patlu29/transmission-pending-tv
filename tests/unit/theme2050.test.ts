import { describe, expect, it } from 'vitest';
import { computeGlassSolid } from '../../src/state/glassRule.ts';
import { GLITCH_MIN_OPACITY, glitchOpacity } from '../../src/state/hauntStore.ts';

describe('solid panels rule (T50-6, T50-7)', () => {
  const none = {
    manual: false,
    reducedTransparency: false,
    contrastMore: false,
    backdropSupported: true,
    dprStepped: false,
  };
  it('is off with nothing asking for it', () => {
    expect(computeGlassSolid(none)).toBe(false);
  });
  it('turns on for each trigger', () => {
    expect(computeGlassSolid({ ...none, manual: true })).toBe(true);
    expect(computeGlassSolid({ ...none, reducedTransparency: true })).toBe(true);
    expect(computeGlassSolid({ ...none, contrastMore: true })).toBe(true);
    expect(computeGlassSolid({ ...none, backdropSupported: false })).toBe(true);
    expect(computeGlassSolid({ ...none, dprStepped: true })).toBe(true);
  });
});

describe('glitch opacity envelope (design-spec-2050 4.3)', () => {
  const g = { amp: 1, dur: 1.4 };
  it('is 1 outside the cue and never below 0.55 inside it', () => {
    expect(glitchOpacity(g, -10)).toBe(1);
    expect(glitchOpacity(g, 1400)).toBe(1);
    expect(glitchOpacity(g, 5000)).toBe(1);
    let min = 1;
    for (let t = 0; t <= 1400; t += 10) min = Math.min(min, glitchOpacity(g, t));
    expect(min).toBeGreaterThanOrEqual(GLITCH_MIN_OPACITY);
    expect(min).toBeLessThan(0.7);
  });
  it('changes smoothly (no step over 0.1 in 50 ms) and dips once', () => {
    let prev = glitchOpacity(g, 0);
    let turns = 0;
    let dir = 0;
    for (let t = 10; t <= 1400; t += 10) {
      const v = glitchOpacity(g, t);
      if (t % 50 === 0) expect(Math.abs(v - prev)).toBeLessThan(0.1);
      const d = Math.sign(v - prev);
      if (d !== 0 && d !== dir) {
        turns++;
        dir = d;
      }
      prev = v;
    }
    expect(turns).toBeLessThanOrEqual(2); // down, then up: one dip
  });
  it('a gentle cue dips less', () => {
    expect(glitchOpacity({ amp: 0.4, dur: 1.4 }, 700)).toBeGreaterThan(
      glitchOpacity({ amp: 1, dur: 1.4 }, 700),
    );
  });
});
