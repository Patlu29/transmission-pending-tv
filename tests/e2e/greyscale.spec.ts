import {
  analyse,
  expect,
  openApp,
  openFake,
  powerOn,
  runUntil,
  test,
  webgl2Available,
  type Mode,
} from './fixtures.ts';

/** US-2 AC-2, FR-2: R, G and B within 2 levels in every pixel of a screenshot of every state, in every mode. */
const TOLERANCE = 2;
const MODES: Mode[] = ['2d', '3d-screen', '3d-set'];

for (const mode of MODES) {
  test.describe(`greyscale pixel sampling [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      if (mode !== '2d')
        test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    });

    const check = async (page: import('@playwright/test').Page, label: string) => {
      const png = await page.screenshot();
      const s = await analyse(page, png);
      expect(
        s.maxChannelDiff,
        `${label}: largest R/G/B difference in any pixel (${s.offenders} pixels over ${TOLERANCE})`,
      ).toBeLessThanOrEqual(TOLERANCE);
      // Not a black frame: something is drawn.
      expect(s.meanLum, `${label}: the frame is not blank`).toBeGreaterThan(0.002);
    };

    test(`US-2 AC-2: start screen (set off), warm-up, first page, diary and Calm are greyscale [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      await check(page, 'start screen');
      await powerOn(page);
      await page.waitForTimeout(1200);
      await check(page, 'warm-up');
      await page.waitForFunction(
        () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
        null,
        { timeout: 20_000, polling: 100 },
      );
      await page.waitForTimeout(2500);
      await check(page, 'story page');
      await page.locator('[data-key=skip]').click();
      await page.waitForTimeout(800);
      await check(page, 'diary index');
      await page.locator('[data-key=power]').click();
      await page.waitForTimeout(150);
      await check(page, 'power-off collapse');
    });

    test(`US-2 AC-2: Calm mode pages are greyscale [${mode}]`, async ({ page }) => {
      await openApp(page, mode, { calm: true });
      await powerOn(page);
      await page.waitForFunction(
        () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
        null,
        { timeout: 20_000, polling: 100 },
      );
      await page.waitForTimeout(1000);
      await check(page, 'calm page');
    });
  });
}

test('US-2 AC-2: the story pages with the ghost at its strongest are greyscale (2D, fake clock)', async ({
  page,
}) => {
  await openFake(page, '2d');
  await powerOn(page);
  await runUntil(page, (s) => s.ghost >= 0.75, { stepMs: 200 });
  await page.clock.runFor(500);
  const s = await analyse(page, await page.screenshot());
  expect(s.maxChannelDiff).toBeLessThanOrEqual(TOLERANCE);
});

test.describe('favicon (FR-2)', () => {
  test('the favicon is linked, and its source colours and rendered pixels are greyscale', async ({
    page,
  }) => {
    await openApp(page, '2d');
    const href = await page.locator('link[rel~="icon"]').first().getAttribute('href');
    expect(href).toBeTruthy();
    const url = new URL(href!, page.url()).toString();
    const svg = await (await page.request.get(url)).text();
    // Every colour literal in the source.
    const hex = [...svg.matchAll(/#([0-9a-f]{3,8})\b/gi)].map((m) => m[1]!);
    for (const h of hex) {
      const full = h.length <= 4 ? [...h].map((c) => c + c).join('') : h;
      const [rr, gg, bb] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
      expect(
        Math.max(Math.abs(rr! - gg!), Math.abs(gg! - bb!), Math.abs(rr! - bb!)),
        `#${h}`,
      ).toBeLessThanOrEqual(TOLERANCE);
    }
    const named = [...svg.matchAll(/(?:fill|stroke|stop-color)\s*=\s*"([a-z]+)"/gi)].map((m) =>
      m[1]!.toLowerCase(),
    );
    for (const n of named)
      expect(['black', 'white', 'gray', 'grey', 'none', 'currentcolor', 'transparent']).toContain(
        n,
      );
    expect(svg).not.toMatch(/rgb\(\s*(\d+)\s*,\s*(?!\1)\d+/i);
    // And the rendered pixels.
    const stats = await page.evaluate(async (u) => {
      const img = new Image();
      img.src = u;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0, 64, 64);
      const d = g.getImageData(0, 0, 64, 64).data;
      let max = 0,
        opaque = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3]! > 0) opaque++;
        max = Math.max(
          max,
          Math.abs(d[i]! - d[i + 1]!),
          Math.abs(d[i + 1]! - d[i + 2]!),
          Math.abs(d[i]! - d[i + 2]!),
        );
      }
      return { max, opaque };
    }, url);
    expect(stats.opaque).toBeGreaterThan(100);
    expect(stats.max).toBeLessThanOrEqual(TOLERANCE);
  });
});
