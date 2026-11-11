import {
  analyse,
  expect,
  loadIntro,
  openApp,
  openFake,
  pinHaunt,
  powerOn,
  runUntil,
  snapshot,
  test,
  unpinHaunt,
  webgl2Available,
  type Snapshot,
} from './fixtures.ts';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

interface Sample extends Snapshot {
  t: number;
  text: string;
  glyphMoves: number;
  streaks: number;
  transcript: string;
}

/** Plays the full-motion story in 2D on the fake clock, sampling every 100 ms of story time. */
async function recordStory(
  page: import('@playwright/test').Page,
  withText = true,
): Promise<Sample[]> {
  await openFake(page, '2d');
  await powerOn(page);
  const out: Sample[] = [];
  await runUntil(page, (s) => s.status === 'ended', {
    stepMs: withText ? 200 : 100,
    withScreen: withText,
    onStep: (s, t) => {
      out.push({ text: '', glyphMoves: 0, streaks: 0, transcript: '', ...s, t } as Sample);
    },
  });
  return out;
}

test.describe('haunted text (US-18, FR-25, FR-26, FR-32)', () => {
  test.setTimeout(240_000);
  test('US-18 AC-1: a line trembles, rewrites a word and bleeds at least once during the story', async ({
    page,
  }) => {
    const story = await recordStory(page);
    const kinds = new Set(story.flatMap((s) => s.effects));
    expect([...kinds].sort()).toEqual(['bleed', 'rewrite', 'tremble']);
    // The effects are visible on the screen, not only in the store.
    expect(
      story.some((s) => s.glyphMoves > 0),
      'tremble moves glyphs',
    ).toBe(true);
    expect(
      story.some((s) => s.streaks > 0),
      'bleed draws streaks',
    ).toBe(true);
  });

  test('US-18 AC-2 and FR-26: once an effect has finished, the line equals the resolved story text exactly', async ({
    page,
  }) => {
    const intro = await loadIntro(page);
    const story = await recordStory(page);
    let checked = 0;
    let rewriteSeen = false;
    const wrong: string[] = [];
    for (const s of story) {
      if (s.status !== 'playing') continue;
      const line = intro.pages[s.pageIndex]?.lines[s.lineIndex];
      if (!line) continue;
      const full = s.revealedChars >= line.text.length;
      if (!full) continue;
      const settled = norm(line.text);
      if (s.effects.length === 0) {
        checked++;
        if (!s.text.includes(settled))
          wrong.push(`t=${s.t} ${line.id}: "${s.text}" lacks "${settled}"`);
        if (s.glyphMoves > 0 || s.streaks > 0)
          wrong.push(`t=${s.t} ${line.id}: effect residue after the effect ended`);
      } else if (s.effects.includes('rewrite') && !s.text.includes(settled)) {
        rewriteSeen = true;
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
    expect(checked).toBeGreaterThan(40);
    expect(rewriteSeen, 'a word actually differs on screen while a rewrite runs').toBe(true);
  });

  test('US-18 AC-3 and FR-32: the DOM transcript never changes during an effect, and facts are never rewritten', async ({
    page,
  }) => {
    const intro = await loadIntro(page);
    const story = await recordStory(page);
    const first = story[0]!.transcript;
    expect(first.length).toBeGreaterThan(500);
    expect(
      story.every((s) => s.transcript === first),
      'transcript text identical in every sample',
    ).toBe(true);
    // Facts on the line being rewritten, trembled or bled keep their true text on the painted screen.
    const wrong: string[] = [];
    for (const s of story) {
      if (s.status !== 'playing' || s.effects.length === 0) continue;
      const line = intro.pages[s.pageIndex]?.lines[s.lineIndex];
      if (!line || s.revealedChars < line.text.length) continue;
      for (const seg of line.segments) {
        if (seg.kind === 'fact' && !s.text.includes(norm(seg.text)))
          wrong.push(`t=${s.t} ${seg.key}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

test.describe('the ghost, the set and the camera (US-19, US-20, US-21, FR-27 to FR-30)', () => {
  test('US-19 AC-1 and AC-2: the figure forms slowly and drifts closer with no sudden change', async ({
    page,
  }) => {
    const story = await recordStory(page, false);
    const ghost = story.map((s) => s.ghost);
    expect(Math.max(...ghost)).toBeGreaterThanOrEqual(0.7);
    // Forms over at least 3 s: from "first trace" (0.05) to "clearly there" (0.30).
    const t05 = story.find((s) => s.ghost >= 0.05)!.t;
    const t30 = story.find((s) => s.ghost >= 0.3)!.t;
    expect(t30 - t05).toBeGreaterThanOrEqual(3000);
    // It becomes clearly visible in the middle of the story, not at the start or the very end.
    const total = story[story.length - 1]!.t;
    expect(t30 / total).toBeGreaterThan(0.3);
    expect(t30 / total).toBeLessThan(0.9);
    // Nothing the figure does changes by more than 0.1 of its range in any 300 ms (design-spec 16.7).
    for (const key of ['ghost', 'ghostNear'] as const) {
      let worst = 0;
      for (let i = 3; i < story.length; i++)
        worst = Math.max(worst, Math.abs(story[i]![key] - story[i - 3]![key]));
      expect(worst, `${key} change per 300 ms`).toBeLessThanOrEqual(0.1);
    }
    expect(Math.max(...story.map((s) => s.ghostNear))).toBeGreaterThan(0.5);
  });

  test('US-4 AC-4, FR-30: no jump scare, so no haunt value changes by more than 0.1 in 300 ms and none by more than 0.04 per second beyond its rate limit', async ({
    page,
  }) => {
    const story = await recordStory(page, false);
    const limits: Record<string, number> = {
      ghost: 0.08,
      ghostNear: 0.12,
      creep: 0.04,
      dim: 0.15,
      shadow: 0.15,
      hum: 0.15,
    };
    const bad: string[] = [];
    for (const key of Object.keys(limits) as Array<keyof Snapshot>) {
      for (let i = 3; i < story.length; i++) {
        const d300 = Math.abs((story[i]![key] as number) - (story[i - 3]![key] as number));
        if (d300 > 0.1) bad.push(`${key} moved ${d300.toFixed(3)} in 300 ms at t=${story[i]!.t}`);
      }
      // 1 s windows, measured on the natural run only (the final ease-out has its own limit).
      for (let i = 10; i < story.length; i++) {
        const d = Math.abs((story[i]![key] as number) - (story[i - 10]![key] as number));
        if (d > limits[key as string]! + 0.02 && story[i]!.status === 'playing')
          bad.push(`${key} moved ${d.toFixed(3)} in 1 s at t=${story[i]!.t}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  test('US-20 AC-1 and AC-2: a knob turns, the picture rolls for at least 1 s and the room dims', async ({
    page,
  }) => {
    const story = await recordStory(page, false);
    expect(
      story.some((s) => s.knobNonce !== null),
      'a knob cue fires',
    ).toBe(true);
    expect(
      new Set(story.map((s) => s.knobNonce).filter((n) => n !== null)).size,
      'both knobs turn',
    ).toBeGreaterThanOrEqual(2);
    expect(Math.max(...story.map((s) => s.dim)), 'the room dims').toBeGreaterThan(0.3);
    const rolling = story.filter((s) => s.rollActive);
    expect(rolling.length).toBeGreaterThan(0);
    // Roll durations: contiguous runs of rollActive, in ms (samples are 100 ms apart).
    let run = 0;
    const runs: number[] = [];
    for (const s of story) {
      if (s.rollActive) run += 100;
      else if (run) {
        runs.push(run);
        run = 0;
      }
    }
    expect(Math.min(...runs)).toBeGreaterThanOrEqual(1000);
    expect(runs.length, 'at most two rolls per run').toBeLessThanOrEqual(2);
  });

  test('US-21 AC-1 and AC-2: the camera creep is slow, bounded, and eases back at the end', async ({
    page,
  }) => {
    const story = await recordStory(page, false);
    const creep = story.map((s) => s.creep);
    expect(Math.max(...creep)).toBeGreaterThan(0.5);
    expect(Math.max(...creep)).toBeLessThanOrEqual(1);
    let worst = 0;
    for (let i = 10; i < story.length; i++)
      if (story[i]!.status === 'playing')
        worst = Math.max(worst, Math.abs(creep[i]! - creep[i - 10]!));
    expect(worst, 'creep change per second').toBeLessThanOrEqual(0.06);
    // After the natural end it is on its way back to zero.
    await page.clock.runFor(4000);
    expect((await snapshot(page)).creep).toBeLessThan(0.05);
  });

  test('US-19 and FR-19: no haunt state is left running after Skip, Replay or power-off', async ({
    page,
  }) => {
    await openFake(page, '2d');
    await powerOn(page);
    await runUntil(page, (s) => s.ghost > 0.3, { stepMs: 200 });
    await page.locator('[data-key=skip]').click();
    await page.clock.runFor(1500);
    let s = await snapshot(page);
    expect(s.ghost + s.creep + s.dim).toBeLessThan(0.2);
    await page.locator('[data-key=replay]').click();
    await page.clock.runFor(300);
    s = await snapshot(page);
    expect(s.creep).toBeLessThan(0.05);
    await runUntil(page, (x) => x.ghost > 0.1, { stepMs: 200 });
    await page.locator('[data-key=power]').click();
    await page.clock.runFor(100); // one scheduler frame
    s = await snapshot(page);
    expect([s.ghost, s.creep, s.dim, s.hum]).toEqual([0, 0, 0, 0]);
  });
});

for (const mode of ['3d-screen', '3d-set'] as const) {
  test.describe(`haunt values reach the 3D scene [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    });

    test(`FR-27 and FR-28: the scene's CRT uniforms follow the haunt store (full motion) [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      await powerOn(page);
      await page.waitForFunction(
        () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
        null,
        { timeout: 20_000, polling: 50 },
      );
      // Pause so that the scheduler does not overwrite what the test sets.
      await page.locator('[data-key=pause]').click();
      await pinHaunt(page, { ghost: 0.6, ghostNear: 0.4, dim: 0.5 });
      await page.waitForFunction(() => window.__SCENE_TEST__.crtUniforms.uGhost.value > 0.5, null, {
        timeout: 30_000,
        polling: 100,
      });
      const u = await page.evaluate(() => {
        const c = window.__SCENE_TEST__.crtUniforms;
        return {
          ghost: c.uGhost.value,
          near: c.uGhostNear.value,
          vignette: c.uHauntVignette.value,
          calm: c.uCalm.value,
        };
      });
      expect(u.ghost).toBeCloseTo(0.6, 2);
      expect(u.near).toBeCloseTo(0.4, 2);
      expect(u.calm).toBe(0);
      // 3d-screen darkens the corners (dim x 0.25); 3d-set dims the room instead.
      if (mode === '3d-screen') expect(u.vignette).toBeCloseTo(0.125, 2);
      else expect(u.vignette).toBe(0);
    });

    test(`US-9 AC-1: switching Calm on mid-story zeroes the scene's haunt uniforms [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      await powerOn(page);
      await page.waitForFunction(
        () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
        null,
        { timeout: 20_000, polling: 50 },
      );
      await page.locator('[data-key=pause]').click();
      await pinHaunt(page, { ghost: 0.6, ghostNear: 0.4, dim: 0.5 });
      await page.waitForFunction(() => window.__SCENE_TEST__.crtUniforms.uGhost.value > 0.5, null, {
        timeout: 30_000,
        polling: 100,
      });
      await page.locator('.dock [data-key=calm]').click();
      await page.waitForFunction(
        () => {
          const c = window.__SCENE_TEST__.crtUniforms;
          return (
            c.uGhost.value === 0 &&
            c.uGhostNear.value === 0 &&
            c.uHauntVignette.value === 0 &&
            c.uRoll.value === 0 &&
            c.uCalm.value === 1
          );
        },
        null,
        { timeout: 30_000, polling: 100 },
      );
      // (The store itself is checked in calm.spec.ts; here it is pinned, so only the scene's view is asserted.)
      await unpinHaunt(page);
    });
  });
}

test.describe('the camera does not creep in 3d-screen (US-21 AC-3, FR-34)', () => {
  test('3d-screen frames are identical with creep at 0 and at 0.2', async ({ page }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, '3d-screen');
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 50 },
    );
    await page.locator('[data-key=pause]').click();
    await pinHaunt(page, { ghost: 0, ghostNear: 0, creep: 0, dim: 0 });
    await page.waitForTimeout(1500);
    const a = await page.screenshot();
    await unpinHaunt(page);
    await pinHaunt(page, { ghost: 0, ghostNear: 0, creep: 0.2, dim: 0 });
    await page.waitForTimeout(6000);
    const b = await page.screenshot();
    const sa = await analyse(page, a);
    const sb = await analyse(page, b);
    // Same layout: tile luminances agree closely (noise is the only difference).
    sa.tiles.forEach((v, i) => expect(Math.abs(v - sb.tiles[i]!)).toBeLessThan(0.03));
  });
});
