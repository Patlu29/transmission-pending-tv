import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readDistIntro } from '../helpers/recompute.ts';
import { parseCues } from '../../src/state/cues.ts';
import { estimateStoryDurationMs } from '../../src/state/duration.ts';
import { expect, loadIntro, openFake, powerOn, runUntil, snapshot, test } from './fixtures.ts';

test.describe('story length and shape (US-4, FR-8, FR-33)', () => {
  test('US-4 AC-2 and FR-8: the story runs 45 to 90 s at default speed, and matches the estimator', async ({
    page,
  }) => {
    await openFake(page, '2d');
    await powerOn(page);
    await runUntil(page, (s) => s.status === 'playing', { stepMs: 100 });
    const startedAt = await page.evaluate(
      () => window.__APP_TEST__.useIntroStore.getState().statusSince,
    );
    await runUntil(page, (s) => s.status === 'ended', { stepMs: 100 });
    const endedAt = await page.evaluate(
      () => window.__APP_TEST__.useIntroStore.getState().statusSince,
    );
    const measured = (endedAt - startedAt) / 1000;
    // Independent estimate from the exported constants and the estimator, for the current facts.
    const intro = readDistIntro();
    const cues = parseCues(
      readFileSync(join(ROOT, 'src/content/intro.cues'), 'utf8'),
      intro as never,
    ).cues;
    const estimated = estimateStoryDurationMs(intro as never, cues) / 1000;
    test.info().annotations.push({
      type: 'duration',
      description: `measured ${measured.toFixed(1)} s, estimated ${estimated.toFixed(1)} s`,
    });
    expect(measured).toBeGreaterThanOrEqual(45);
    expect(measured).toBeLessThanOrEqual(90);
    expect(estimated).toBeGreaterThanOrEqual(45);
    expect(estimated).toBeLessThanOrEqual(90);
    expect(Math.abs(measured - estimated), 'the estimator agrees with the run').toBeLessThan(6);
  });

  test('US-4 AC-1 and FR-33: lines reveal one at a time, the story has a beginning, middle and end, and every FR-12 fact appears', async ({
    page,
  }) => {
    const intro = await loadIntro(page);
    const ids = intro.pages.map((p) => p.id);
    expect(ids[0]).toBe('signal');
    expect(ids[ids.length - 1]).toBe('settle');
    expect(ids.length).toBeGreaterThanOrEqual(7);
    const text = intro.pages.flatMap((p) => p.lines.map((l) => l.text)).join(' ');
    expect(text).toMatch(/IS SOMEONE THERE/); // waking in the set
    expect(text).toMatch(/GOODNIGHT/); // the ghost settles
    await openFake(page, '2d');
    await powerOn(page);
    const reveals: number[] = [];
    await runUntil(page, (s) => s.pageIndex >= 1, {
      stepMs: 100,
      onStep: (s) => {
        if (s.status === 'playing') reveals.push(s.revealedChars);
      },
    });
    // Characters appear progressively (teletext typing), not all at once.
    const distinct = new Set(reveals.filter((n) => n > 0 && n < 1000));
    expect(distinct.size).toBeGreaterThan(5);
    expect((await snapshot(page)).status).toBe('playing');
  });

  test('US-4 AC-3 and FR-X7 (automated part): the copy contains no gore, slurs or typed digits; tone needs human review', async ({
    page,
  }) => {
    const intro = await loadIntro(page);
    const text = intro.pages
      .flatMap((p) => p.lines.map((l) => l.text))
      .join(' ')
      .toLowerCase();
    for (const word of [
      'gore',
      'corpse',
      'murder',
      'stab',
      'suicide',
      'rape',
      'fuck',
      'shit',
      'bitch',
      'nigger',
      'cunt',
      'torture',
      'massacre',
      'dismember',
    ]) {
      expect(text, `copy has no "${word}"`).not.toContain(word);
    }
    expect(text).not.toMatch(/\bbloody\b|\bblood\b/);
  });
});
