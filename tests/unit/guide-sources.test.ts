// Owner: architect (v2 Phase 2), handed to qa-engineer. ADR 0011 §3.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateGuideSources } from '../../src/guide/validate.ts';

const shipped = JSON.parse(
  readFileSync(new URL('../../src/content/guide-sources.json', import.meta.url), 'utf8'),
) as { channels: Array<Record<string, unknown>> } & Record<string, unknown>;

const entry = (over: Record<string, unknown> = {}) => ({
  number: 1,
  name: 'Test',
  channelId: 'UCKwucPzHZ7zCUIf7If-Wo1g',
  languages: ['en'],
  genre: 'news',
  country: 'IN',
  regionTested: ['IN'],
  attribution: {
    label: 'Test on YouTube',
    url: 'https://www.youtube.com/channel/UCKwucPzHZ7zCUIf7If-Wo1g',
  },
  terms: [],
  permission: 'not-required',
  confidence: 'high',
  checked: '2026-11-11',
  enabled: true,
  ...over,
});
const doc = (channels: unknown[]) => ({
  schemaVersion: 1,
  youtubeTerms: ['https://www.youtube.com/t/terms'],
  channels,
});
const today = '2026-11-11';

describe('guide-sources.json (shipped)', () => {
  it('passes the validator with no errors', () => {
    expect(validateGuideSources(shipped, { today }).errors).toEqual([]);
  });
  it('contains high-confidence channels only, and DD and Sansad are marked requested', () => {
    for (const c of shipped.channels) {
      expect(c.confidence).toBe('high');
      if (/^(DD |Sansad)/.test(String(c.name))) expect(c.permission).toBe('requested');
    }
  });
  it('never uses channel 0 (the Occupant)', () => {
    expect(shipped.channels.every((c) => Number(c.number) >= 1)).toBe(true);
  });
});

describe('validateGuideSources', () => {
  it('accepts a minimal valid document', () => {
    expect(validateGuideSources(doc([entry()]), { today })).toEqual({ errors: [], warnings: [] });
  });
  it.each([
    ['bad channel id', { channelId: 'UCshort' }, /channelId/],
    ['channel 0', { number: 0 }, /0 is the Occupant/],
    ['low confidence', { confidence: 'low' }, /confidence/],
    ['unknown permission', { permission: 'maybe' }, /permission/],
    ['http attribution', { attribution: { label: 'x', url: 'http://example.com' } }, /attribution/],
    ['credentials in a terms url', { terms: ['https://user:pw@example.com/terms'] }, /terms/],
    ['bad language', { languages: ['Hindi'] }, /languages/],
    ['bad regex', { preferTitle: '(' }, /preferTitle/],
    ['future date', { checked: '2027-01-01' }, /future/],
  ])('rejects %s', (_label, over, message) => {
    const { errors } = validateGuideSources(doc([entry(over)]), { today });
    expect(errors.join('\n')).toMatch(message);
  });
  it('rejects duplicate numbers and channel ids', () => {
    const { errors } = validateGuideSources(doc([entry(), entry()]), { today });
    expect(errors.join('\n')).toMatch(/duplicate number/);
    expect(errors.join('\n')).toMatch(/duplicate channelId/);
  });
  it('only warns about age, so the scheduled guide build never breaks on it', () => {
    const r = validateGuideSources(doc([entry({ checked: '2026-01-01' })]), { today });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(/more than 90 days/);
  });
});
