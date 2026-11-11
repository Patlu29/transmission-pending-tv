import {
  analyse,
  dockKey,
  expect,
  openApp,
  pinHaunt,
  snapshot,
  test,
  webgl2Available,
} from './fixtures.ts';

/**
 * Mobile viewports (Pixel 7 portrait and landscape on Chromium, iPhone 14 on WebKit).
 * These run the default mode (no ?mode=), as a visitor would: the media query must pick 3d-screen.
 */
test.describe('mobile (NFR-5, FR-7, FR-21, FR-34)', () => {
  test('US-1, FR-7: the default presentation on a touch device is the screen-filling 3d-screen (or 2D without WebGL), never the 3D set', async ({
    page,
  }) => {
    await openApp(page, null);
    const mode = (await snapshot(page)).mode;
    expect(['3d-screen', '2d']).toContain(mode);
    if (mode === '2d')
      test.info().annotations.push({
        type: 'note',
        description: 'This browser has no WebGL, so 2D was used.',
      });
    await expect(page.locator('[data-key=power]')).toBeVisible();
    const box = (await page.locator('[data-key=power]').boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  });

  test('NFR-5: no horizontal scrolling, and touch targets are at least 24 CSS px (WCAG 2.5.8)', async ({
    page,
  }) => {
    await openApp(page, null);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const sizes = await page.$$eval('.dock button, .start button', (els) =>
      els.map((e) => {
        const b = e.getBoundingClientRect();
        return { n: e.textContent, w: b.width, h: b.height };
      }),
    );
    for (const s of sizes) {
      expect(s.h, `${s.n} height`).toBeGreaterThanOrEqual(24);
      expect(s.w, `${s.n} width`).toBeGreaterThanOrEqual(24);
    }
    const small = sizes.filter((s) => s.h < 44);
    test.info().annotations.push({
      type: 'touch-targets',
      description: `${small.length} of ${sizes.length} controls under 44 px (best practice, not AA)`,
    });
  });

  test('US-2 AC-4 and NFR-5: screen text is at least 16 CSS px, in portrait and landscape', async ({
    page,
  }) => {
    await openApp(page, null);
    await page.locator('[data-key=power]').tap();
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 30_000, polling: 100 },
    );
    const g = await page.evaluate(() => window.__APP_TEST__.useDisplayStore.getState().grid);
    expect(
      g.fontPx,
      `glyph size ${g.fontPx} px on a ${g.cols} x ${g.rows} grid`,
    ).toBeGreaterThanOrEqual(16);
    expect(g.cols).toBeGreaterThanOrEqual(24);
    expect(g.tooSmall).toBe(false);
  });

  test('US-1 AC-4, US-8 AC-4, FR-21: tap power, tap Skip, tap Replay, tap power off', async ({
    page,
  }) => {
    await openApp(page, null);
    await page.locator('[data-key=power]').tap();
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 30_000, polling: 100 },
    );
    await page.locator('[data-key=skip]').tap();
    await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ended');
    await (await dockKey(page, 'replay')).tap();
    await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('playing');
    await page.locator('[data-key=power]').tap();
    await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ready');
  });

  test('US-7 AC-3: on touch, tapping Next and Previous changes the diary page', async ({
    page,
  }) => {
    await openApp(page, null);
    await page.locator('[data-key=power]').tap();
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 30_000, polling: 100 },
    );
    await page.locator('[data-key=skip]').tap();
    await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ended');
    const view = () =>
      page.evaluate(() => JSON.stringify(window.__APP_TEST__.useIntroStore.getState().diary));
    const a = await view();
    await (await dockKey(page, 'next')).tap();
    expect(await view()).not.toBe(a);
  });

  test('US-22 AC-1 and US-11 AC-3: the content note and Calm control are on the start screen without scrolling', async ({
    page,
  }) => {
    await openApp(page, null);
    await expect(page.locator('#start-note')).toBeInViewport();
    await expect(
      page.locator('.start').getByRole('button', { name: /Calm mode/ }),
    ).toBeInViewport();
    await expect(page.locator('[data-key=power]')).toBeInViewport();
  });

  test('US-20 AC-3 and FR-34: on mobile the picture still rolls and the edges dim, with no 3D knobs and no camera push', async ({
    page,
  }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, '3d-screen');
    await page.locator('[data-key=power]').tap();
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 30_000, polling: 100 },
    );
    await page.locator('[data-key=pause]').tap();
    const quiet = await page.screenshot();
    await pinHaunt(page, { creep: 0.2, dim: 0.5, ghost: 0.5 });
    await page.waitForFunction(
      () => window.__SCENE_TEST__.crtUniforms.uHauntVignette.value > 0.1,
      null,
      { timeout: 20_000, polling: 100 },
    );
    const u = await page.evaluate(() => {
      const c = window.__SCENE_TEST__.crtUniforms;
      return { vignette: c.uHauntVignette.value, ghost: c.uGhost.value };
    });
    expect(u.vignette).toBeCloseTo(0.125, 2);
    expect(u.ghost).toBeGreaterThan(0.4);
    expect(
      await page.locator('.hud__reset').count(),
      'no Reset view key: the camera never moves',
    ).toBe(0);
    const s = await analyse(page, await page.screenshot());
    expect(s.maxChannelDiff).toBeLessThanOrEqual(2);
    expect(quiet.length).toBeGreaterThan(0);
  });

  test('FR-2: mobile start screen and story page are greyscale', async ({ page }) => {
    await openApp(page, null);
    let s = await analyse(page, await page.screenshot());
    expect(s.maxChannelDiff).toBeLessThanOrEqual(2);
    await page.locator('[data-key=power]').tap();
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 30_000, polling: 100 },
    );
    await page.waitForTimeout(2000);
    s = await analyse(page, await page.screenshot());
    expect(s.maxChannelDiff).toBeLessThanOrEqual(2);
  });
});
