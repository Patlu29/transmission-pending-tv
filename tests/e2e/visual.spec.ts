import { analyse, expect, openApp, powerOn, test, webgl2Available } from './fixtures.ts';

/**
 * Visual regression (Chromium only, SwiftShader). Baselines live in tests/e2e/__screenshots__/chromium.
 * Determinism: Calm mode freezes the noise (uTime and the 2D noise tile), the camera snaps with no tween,
 * and the set-off start screens carry no build facts. The one page with facts (the header's revision)
 * is masked or covered by a threshold. Baselines are platform specific (macOS, SwiftShader): regenerate
 * with `npm run test:e2e:update` ONLY for an intended visual change, and record it in docs/qa-report.md.
 */
const opts = { animations: 'disabled' as const, caret: 'hide' as const };

test.describe('visual regression', () => {
  test('start screen, 2D, desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openApp(page, '2d', { calm: true });
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('start-2d.png', { ...opts, maxDiffPixelRatio: 0.005 });
  });

  test('start screen, 3d-set, desktop 1440 x 900', async ({ page }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, '3d-set', { calm: true });
    await page.waitForTimeout(2500); // let the first frames and the room light settle
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('start-3d-set.png', { ...opts, maxDiffPixelRatio: 0.02 });
  });

  test('start screen, 3d-screen, phone portrait 390 x 844', async ({ page }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page, '3d-screen', { calm: true });
    await page.waitForTimeout(2500);
    await expect(page).toHaveScreenshot('start-3d-screen-portrait.png', {
      ...opts,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Calm story page 1, 2D (header revision masked)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openApp(page, '2d', { calm: true });
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 100 },
    );
    await page.waitForTimeout(500);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('calm-page1-2d.png', {
      ...opts,
      maxDiffPixelRatio: 0.005,
      mask: [page.locator('[data-screen="2d"] .tt-row').first()],
    });
  });

  test('Calm story page 1, 3d-set (header revision under the threshold)', async ({ page }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, '3d-set', { calm: true });
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 30_000, polling: 100 },
    );
    await page.waitForTimeout(3000);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('calm-page1-3d-set.png', {
      ...opts,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('3d-set framing: the whole set, including the control panel, is inside the viewport at Watch', async ({
    page,
  }) => {
    // Not a pixel baseline: a geometric check for the tech lead's framing observation (see BUG-1).
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, '3d-set', { calm: true });
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 30_000, polling: 100 },
    );
    await page.waitForTimeout(2500);
    // When the set is framed and centred, both 120 px edge strips show only the dark room. If the camera is
    // centred on the glass instead, the knob panel runs off the right edge and lights up the right strip.
    const vp = page.viewportSize()!;
    const shot = await page.screenshot();
    const left = await analyse(page, shot, { x: 0, y: 0, width: 120, height: vp.height });
    const right = await analyse(page, shot, {
      x: vp.width - 120,
      y: 0,
      width: 120,
      height: vp.height,
    });
    test.info().annotations.push({
      type: 'framing',
      description: `edge strip p99 luminance: left ${left.rectP99!.toFixed(3)}, right ${right.rectP99!.toFixed(3)}`,
    });
    expect(right.rectP99!, 'right edge strip (knob panel must not run off the frame)').toBeLessThan(
      0.05,
    );
    expect(left.rectP99!, 'left edge strip').toBeLessThan(0.05);
  });
});
