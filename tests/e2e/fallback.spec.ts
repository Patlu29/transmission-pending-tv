import { recompute } from '../helpers/recompute.ts';
import {
  expect,
  openApp,
  powerOn,
  snapshot,
  test,
  waitReady,
  webgl2Available,
} from './fixtures.ts';

const r = recompute();

/** Makes every WebGL context request fail, as on a device with WebGL disabled. */
async function disableWebGL(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (/webgl/i.test(type)) return null;
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
    } as typeof orig;
  });
}

test.describe('no WebGL (US-12, FR-20)', () => {
  test('US-12 AC-1: with WebGL disabled, a notice shows and the 2D presentation is used', async ({
    page,
  }) => {
    await disableWebGL(page);
    await openApp(page, null);
    expect((await snapshot(page)).mode).toBe('2d');
    await expect(page.locator('.notice')).toContainText('3D is not available here');
    await expect(page.locator('[data-screen="2d"]')).toBeVisible();
  });

  test('US-12 AC-1: power, intro, skip and replay all work in the fallback', async ({ page }) => {
    await disableWebGL(page);
    await openApp(page, null);
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 100 },
    );
    await page.locator('[data-key=skip]').click();
    await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ended');
    await page.locator('[data-key=replay]').click();
    await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('playing');
    await page.locator('[data-key=power]').click();
    await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ready');
  });

  test('US-12 AC-3: the same facts appear in the fallback as in the 3D modes', async ({ page }) => {
    await disableWebGL(page);
    await openApp(page, null);
    const found = await page.$$eval('[data-fact]', (els) =>
      els.map((e) => [e.getAttribute('data-fact'), e.textContent]),
    );
    expect(found.length).toBeGreaterThan(8);
    for (const [k, v] of found) expect(v).toBe(r.byKey[k!]);
  });

  test('US-12 AC-1: a forced 3D mode without WebGL still ends up in the readable 2D presentation', async ({
    page,
    monitor,
  }) => {
    monitor.allowErrors('creating a WebGL context is made to fail');
    await disableWebGL(page);
    await page.goto('/?mode=3d-set');
    await waitReady(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useDisplayStore.getState().renderMode === '2d',
      null,
      { timeout: 20_000, polling: 100 },
    );
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 100 },
    );
  });

  test('US-12 AC-2: when the WebGL context is lost mid-intro, 2D takes over at the current line', async ({
    page,
    monitor,
  }) => {
    monitor.allowErrors('three.js logs a lost context');
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, '3d-screen');
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 20_000, polling: 100 },
    );
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().pageIndex >= 1,
      null,
      { timeout: 30_000, polling: 100 },
    );
    const before = await snapshot(page);
    await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGL2RenderingContext;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await page.waitForFunction(
      () => window.__APP_TEST__.useDisplayStore.getState().renderMode === '2d',
      null,
      { timeout: 10_000, polling: 50 },
    );
    const after = await snapshot(page);
    expect(after.status).toBe('playing');
    expect(
      after.pageIndex,
      'the story resumes at the same page, not from the start',
    ).toBeGreaterThanOrEqual(before.pageIndex);
    await expect(page.locator('[data-screen="2d"]')).toBeVisible();
    await expect(page.locator('.notice')).toBeVisible();
  });
});
