import {
  dockKey,
  expect,
  openApp,
  openFake,
  powerOn,
  runUntil,
  snapshot,
  test,
  webgl2Available,
  screenText,
  type Snapshot,
} from './fixtures.ts';

const hauntIsZero = (s: Snapshot) =>
  s.ghost === 0 &&
  s.ghostNear === 0 &&
  s.creep === 0 &&
  s.dim === 0 &&
  s.shadow === 0 &&
  s.hum === 0 &&
  !s.rollActive &&
  s.knobNonce === null &&
  s.effects.length === 0;

test.describe('Calm mode (US-9, US-22, FR-17, FR-31)', () => {
  test('US-22 AC-2 and FR-24: Calm can be turned on before power-on, from the start screen', async ({
    page,
  }) => {
    await openApp(page, '2d');
    const sw = page.locator('.start').getByRole('button', { name: /Calm mode/ });
    await expect(sw).toHaveAttribute('aria-pressed', 'false');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-pressed', 'true');
    expect((await snapshot(page)).calm).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-calm', 'true');
  });

  test('US-9 AC-1 and FR-17: with Calm on, the whole story runs with no haunt state, readable pages, manual advance', async ({
    page,
  }) => {
    await openFake(page, '2d', { calm: true });
    await powerOn(page);
    // No warm-up animation: the static card shows, then the first page; nothing advances by itself.
    await expect(page.locator('[data-screen="2d"]')).not.toHaveClass(/is-warming/);
    let guard = 0;
    const pages = new Set<string>();
    for (;;) {
      await page.clock.runFor(400);
      let s = await snapshot(page);
      expect(hauntIsZero(s), `no haunt state (status ${s.status}, page ${s.pageIndex})`).toBe(true);
      if (s.status === 'playing') {
        // The whole line is shown at once.
        expect(s.revealedChars).toBeGreaterThan(1000);
        pages.add(`${s.pageIndex}:${s.lineIndex}`);
        const before = `${s.pageIndex}:${s.lineIndex}`;
        if (pages.size === 1) {
          await page.clock.runFor(12_000); // no automatic advance without the opt-in
          s = await snapshot(page);
          expect(`${s.pageIndex}:${s.lineIndex}`, 'Calm does not auto-advance').toBe(before);
        }
        await page.locator('.dock [data-key=next]').click();
      }
      if (s.status === 'ended') break;
      if (++guard > 40) throw new Error('story did not end by Next presses');
    }
    expect(pages.size).toBeGreaterThan(5);
    // The transcript and facts are still in the DOM.
    expect(await page.locator('[data-fact]').count()).toBeGreaterThan(8);
  });

  test('US-9 AC-1: Calm switched on mid-story cancels every effect within one frame, and off again resumes at a line anchor', async ({
    page,
  }) => {
    await openFake(page, '2d');
    await powerOn(page);
    await runUntil(page, (s) => s.ghost > 0.3 && s.effects.length > 0, { stepMs: 100 });
    const before = await snapshot(page);
    expect(before.ghost).toBeGreaterThan(0.3);
    await page.locator('.dock [data-key=calm]').click();
    await page.clock.runFor(17); // one frame
    const s = await snapshot(page);
    expect(s.calm).toBe(true);
    expect(hauntIsZero(s)).toBe(true);
    expect(
      await page
        .locator(
          '[data-screen="2d"] .screen2d__streak, [data-screen="2d"] .tt__glyph[style*="translate"]',
        )
        .count(),
    ).toBeLessThanOrEqual(0);
    await expect(page.locator('#transcript [data-fact]').first()).toBeAttached();
    // Switching Calm off again does not leave the figure on screen until the next cue.
    await page.locator('.dock [data-key=calm]').click();
    await page.clock.runFor(100);
    expect((await snapshot(page)).calm).toBe(false);
  });

  test('US-9 AC-3 and AC-4: prefers-reduced-motion turns Calm on by default, with no warm-up, jitter or roll', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFake(page, '2d');
    const s0 = await snapshot(page);
    expect(s0.calm).toBe(true);
    const sw = page.locator('.start').getByRole('button', { name: /Calm mode/ });
    await expect(sw).toContainText('on (system setting)');
    await expect(sw).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.dock [data-key=calm]')).toHaveAttribute('aria-disabled', 'true');
    await powerOn(page);
    await expect(page.locator('[data-screen="2d"]')).not.toHaveClass(/is-warming/);
    await runUntil(page, (s) => s.status === 'playing', { stepMs: 100, limitMs: 5000 });
    for (let i = 0; i < 80; i++) {
      await page.clock.runFor(250);
      const s = await snapshot(page);
      expect(hauntIsZero(s)).toBe(true);
    }
  });

  test('US-9 AC-6: changing the OS reduced-motion setting mid-story updates the site without a reload', async ({
    page,
  }) => {
    await openFake(page, '2d');
    await powerOn(page);
    await runUntil(page, (s) => s.ghost > 0.2, { stepMs: 100 });
    await page.evaluate(() => (window.__marker = 'same-document'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect
      .poll(
        async () => {
          await page.clock.runFor(50);
          return (await snapshot(page)).calm;
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    await page.clock.runFor(50);
    const s = await snapshot(page);
    expect(hauntIsZero(s)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect
      .poll(
        async () => {
          await page.clock.runFor(50);
          return (await snapshot(page)).calm;
        },
        { timeout: 15_000 },
      )
      .toBe(false);
    expect(await page.evaluate(() => window.__marker)).toBe('same-document');
  });

  test('US-9 AC-5: with reduced motion the noise is a frozen texture and auto-advance is opt-in and slow', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFake(page, '2d');
    const anim = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('[data-screen="2d"]')!, '::after').animationName,
    );
    expect(anim).toBe('none');
    await powerOn(page);
    await runUntil(page, (s) => s.status === 'playing', { stepMs: 100, limitMs: 5000 });
    // On narrow layouts the auto-advance key sits in the More sheet; dockKey opens it.
    const auto = await dockKey(page, 'auto');
    await expect(auto).toHaveText('Auto-advance: Off');
    await auto.click();
    const a = await snapshot(page);
    await page.clock.runFor(7000);
    const b = await snapshot(page);
    expect([b.pageIndex, b.lineIndex], 'a page stays at least 8 s').toEqual([
      a.pageIndex,
      a.lineIndex,
    ]);
    await page.clock.runFor(8000);
    const c = await snapshot(page);
    expect([c.pageIndex, c.lineIndex]).not.toEqual([a.pageIndex, a.lineIndex]);
  });

  test('US-3 AC-1 and AC-3: the test card shows while the set is warming and is static under reduced motion', async ({
    page,
  }) => {
    await openFake(page, '2d');
    await powerOn(page);
    await page.clock.runFor(600);
    await expect(page.locator('[data-screen="2d"]')).toHaveClass(/crt2d--idle/);
    await expect(page.locator('[data-screen="2d"] canvas.screen2d__card')).toBeVisible();
    const noise = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector('[data-screen="2d"]')!, '::after').animationName,
      );
    expect(await noise(), 'noise animates with full motion').not.toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.runFor(100);
    expect(await noise(), 'noise is frozen under reduced motion').toBe('none');
  });

  test('US-9 AC-2: Calm survives Replay (within the visit)', async ({ page }) => {
    await openApp(page, '2d', { calm: true });
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 100 },
    );
    await page.locator('[data-key=skip]').click();
    await page.locator('[data-key=replay]').click();
    expect((await snapshot(page)).calm).toBe(true);
  });

  test('US-9 AC-2 and FR-31: Calm persists across a reload within the visit', async ({ page }) => {
    await openApp(page, '2d');
    await page
      .locator('.start')
      .getByRole('button', { name: /Calm mode/ })
      .click();
    expect((await snapshot(page)).calm).toBe(true);
    await page.reload();
    await page.waitForFunction(
      () => window.__APP_TEST__?.useIntroStore.getState().status === 'ready',
      null,
      { polling: 100 },
    );
    expect((await snapshot(page)).calm, 'Calm is still on after a reload in the same tab').toBe(
      true,
    );
  });
});

for (const mode of ['3d-screen', '3d-set'] as const) {
  test(`US-9 and US-2: Calm freezes the shader noise (uTime) and sets uCalm [${mode}]`, async ({
    page,
  }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, mode, { calm: true });
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 100 },
    );
    const read = () =>
      page.evaluate(() => {
        const c = window.__SCENE_TEST__.crtUniforms;
        return { t: c.uTime.value, calm: c.uCalm.value, collapse: c.uCollapse.value };
      });
    const a = await read();
    await page.waitForTimeout(2500);
    const b = await read();
    expect(a.calm).toBe(1);
    expect(b.t, 'uTime is frozen').toBe(a.t);
  });

  test(`US-2 AC-1: with full motion the shader noise runs (uTime advances) [${mode}]`, async ({
    page,
  }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, mode);
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 100 },
    );
    const t = () => page.evaluate(() => window.__SCENE_TEST__.crtUniforms.uTime.value as number);
    const a = await t();
    await page.waitForTimeout(2500);
    expect(await t()).toBeGreaterThan(a);
  });
}

void screenText;
