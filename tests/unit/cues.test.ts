import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import introJson from '../../src/generated/intro.json' with { type: 'json' };
import type { ResolvedIntro } from '../../src/facts/schema.ts';
import { parseCues } from '../../src/state/cues.ts';

const intro = introJson as unknown as ResolvedIntro;
const shipped = readFileSync(new URL('../../src/content/intro.cues', import.meta.url), 'utf8');

describe('intro.cues (shipped file)', () => {
  const result = parseCues(shipped, intro);

  it('parses with no errors', () => {
    expect(result.errors).toEqual([]);
    expect(result.cues.length).toBeGreaterThan(20);
  });

  it('resolves every anchor to a real page or line id of the generated intro', () => {
    const pageIds = new Set(intro.pages.map((p) => p.id));
    const lineIds = new Set(intro.pages.flatMap((p) => p.lines.map((l) => l.id)));
    for (const cue of result.cues) {
      expect(pageIds.has(cue.anchor.pageId), `page ${cue.anchor.pageId}`).toBe(true);
      if (cue.anchor.lineId)
        expect(lineIds.has(cue.anchor.lineId), `line ${cue.anchor.lineId}`).toBe(true);
    }
  });

  it('has at most two roll cues and no digits in replacement words', () => {
    expect(result.cues.filter((c) => c.kind === 'roll').length).toBeLessThanOrEqual(2);
    for (const c of result.cues.filter((c) => c.kind === 'rewrite'))
      expect(String(c.params.to)).not.toMatch(/\d/);
  });
});

describe('parseCues rejects bad input', () => {
  const errorsFor = (line: string) => parseCues(line, intro).errors;

  it('unknown anchor', () =>
    expect(errorsFor('nowhere ghost to=0.1 over=4').join()).toMatch(/unknown anchor/));
  it('unknown line number', () =>
    expect(errorsFor('signal-9@end tremble amp=0.04 dur=3').join()).toMatch(/unknown anchor/));
  it('unknown cue', () =>
    expect(errorsFor('signal levitate to=1 over=4').join()).toMatch(/unknown cue/));
  it('unknown key', () =>
    expect(errorsFor('signal ghost to=0.1 over=4 colour=red').join()).toMatch(/unknown key/));
  it('missing key', () => expect(errorsFor('signal ghost to=0.1').join()).toMatch(/needs "over"/));
  it('event cue without a line anchor', () =>
    expect(errorsFor('signal tremble amp=0.04 dur=3').join()).toMatch(/line anchor/));
  it('roll away from a page end', () =>
    expect(errorsFor('signal-1@end roll dur=2').join()).toMatch(/roll/));
  it('rewrite over a fact segment', () => {
    // makers-1 word 9 is the first word of the provenance.tool fact.
    expect(errorsFor('makers-1@end rewrite word=9 to=ABC hold=1 dur=3').join()).toMatch(
      /fact segment/,
    );
  });
  it('rewrite with digits', () => {
    expect(errorsFor('makers-3@end rewrite word=6 to=H0ST hold=1 dur=3').join()).toMatch(
      /letters only/,
    );
  });
  it('clamps out-of-range values with a warning instead of exceeding them', () => {
    const r = parseCues('signal ghost to=3 over=0.5', intro);
    expect(r.errors).toEqual([]);
    expect(r.cues[0]?.params).toMatchObject({ to: 1, over: 2 });
    expect(r.warnings.length).toBe(2);
  });
});

describe('glitch cue (2050)', () => {
  const shippedResult = parseCues(shipped, intro);
  const errorsFor = (line: string) => parseCues(line, intro).errors;
  it('parses with an amp and a duration on a line anchor', () => {
    const r = parseCues('staff-2@end+7 glitch amp=0.4 dur=1.4', intro);
    expect(r.errors).toEqual([]);
    expect(r.cues[0]).toMatchObject({ kind: 'glitch', params: { amp: 0.4, dur: 1.4 } });
  });
  it('needs a line anchor ending in @end, and both keys', () => {
    expect(errorsFor('staff glitch amp=0.4 dur=1.4').join()).toMatch(/line anchor/);
    expect(errorsFor('staff-2@end glitch amp=0.4').join()).toMatch(/needs "dur"/);
    expect(errorsFor('staff-2@end glitch dur=1.4').join()).toMatch(/needs "amp"/);
  });
  it('clamps amp and dur into range with a warning', () => {
    const r = parseCues('staff-2@end glitch amp=5 dur=9', intro);
    expect(r.cues[0]?.params).toMatchObject({ amp: 1, dur: 2 });
    expect(r.warnings.length).toBe(2);
  });
  it('ships the two glitch cues from the design (after staff and after diary)', () => {
    const glitches = shippedResult.cues.filter((c) => c.kind === 'glitch');
    expect(glitches.map((c) => c.anchor.lineId)).toEqual(['staff-2', 'diary-5']);
  });
});
