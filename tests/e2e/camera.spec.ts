import {
  expect,
  openApp,
  pinHaunt,
  powerOn,
  test,
  unpinHaunt,
  webgl2Available,
} from './fixtures.ts';

/**
 * Camera and knobs, through the scene's own test hooks (`__SCENE_TEST__.cameraPose()` and `knobAngles()`):
 * US-20 AC-1, US-21 AC-1 to AC-4, FR-28, FR-29, design-spec 4 and 16.6.
 */
const pose = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__SCENE_TEST__.cameraPose!());
const knobs = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__SCENE_TEST__.knobAngles!());

async function play3dSet(page: import('@playwright/test').Page, calm = false) {
  await openApp(page, '3d-set', { calm });
  await powerOn(page);
  await page.waitForFunction(
    () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
    null,
    { timeout: 60_000, polling: 100 },
  );
}

test.describe('3d-set camera (US-21, FR-29)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
  });

  test('BUG-1: Watch frames the whole set, centred, and every pose aims at the set centre', async ({
    page,
  }) => {
    await openApp(page, '3d-set');
    const idle = await pose(page);
    await powerOn(page);
    await page.waitForFunction(
      () => window.__SCENE_TEST__.cameraPose!().distanceOverD < 1.05,
      null,
      { timeout: 60_000, polling: 100 },
    );
    const watch = await pose(page);
    expect(watch.distanceOverD, 'Watch is 1.0 x D').toBeCloseTo(1, 1);
    expect(idle.distanceOverD, 'Idle is further back than Watch').toBeGreaterThan(1.3);
    expect(watch.target, 'the camera aims at the same set centre in every pose').toEqual(
      idle.target,
    );
    // The orbit follower is damped, so the last degree takes a moment on a slow renderer.
    await page.waitForFunction(
      () => Math.abs(window.__SCENE_TEST__.cameraPose!().azimuthDeg) < 0.5,
      null,
      { timeout: 30_000, polling: 100 },
    );
    // Pixel check: both 120 px edge strips show only the dark room.
    await page.waitForTimeout(1500);
    const { analyse } = await import('./fixtures.ts');
    const vp = page.viewportSize()!;
    const shot = await page.screenshot();
    const left = await analyse(page, shot, { x: 0, y: 0, width: 120, height: vp.height });
    const right = await analyse(page, shot, {
      x: vp.width - 120,
      y: 0,
      width: 120,
      height: vp.height,
    });
    expect(left.rectP99!).toBeLessThan(0.05);
    expect(right.rectP99!).toBeLessThan(0.05);
  });

  test('US-21 AC-1 and AC-2: creep moves the camera closer, slowly, and never past 0.78 x D', async ({
    page,
  }) => {
    await play3dSet(page);
    await page.waitForFunction(
      () => window.__SCENE_TEST__.cameraPose!().distanceOverD < 1.05,
      null,
      { timeout: 60_000, polling: 100 },
    );
    await page.locator('[data-key=pause]').click();
    const start = await pose(page);
    await pinHaunt(page, { creep: 1 });
    // The follower is limited to 0.04 per second, so after a few seconds it is part-way, never jumping.
    const samples: Array<{ t: number; creep: number; k: number }> = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 12_000) {
      const p = await pose(page);
      samples.push({ t: Date.now() - t0, creep: p.creep, k: p.distanceOverD });
      await page.waitForTimeout(500);
    }
    await unpinHaunt(page);
    const last = samples[samples.length - 1]!;
    expect(last.creep, 'creep rises').toBeGreaterThan(0.02);
    expect(last.k, 'the camera is closer').toBeLessThan(start.distanceOverD - 0.003);
    for (let i = 1; i < samples.length; i++) {
      const dt = (samples[i]!.t - samples[i - 1]!.t) / 1000;
      expect(samples[i]!.creep - samples[i - 1]!.creep, 'no jump').toBeLessThanOrEqual(
        0.04 * dt + 0.03,
      );
    }
    for (const s of samples)
      expect(s.k, 'bounded by the 22 per cent ceiling').toBeGreaterThanOrEqual(0.78 - 0.005);
  });

  test('US-21 AC-4 and US-9: under Calm the camera does not creep', async ({ page }) => {
    await play3dSet(page, true);
    await pinHaunt(page, { creep: 1 });
    await page.waitForTimeout(6000);
    const p = await pose(page);
    await unpinHaunt(page);
    expect(p.creep).toBe(0);
    expect(p.distanceOverD).toBeCloseTo(1, 1);
  });

  test('US-21 AC-3: 3d-screen has no camera rig, so nothing can move', async ({ page }) => {
    await openApp(page, '3d-screen');
    await powerOn(page);
    await page.waitForFunction(
      () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
      null,
      { timeout: 60_000, polling: 100 },
    );
    expect(await page.evaluate(() => typeof window.__SCENE_TEST__.cameraPose)).toBe('undefined');
  });
});

test.describe('haunted knobs (US-20 AC-1, FR-28)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
  });

  test('a knob cue turns the channel knob by its angle and leaves it there', async ({ page }) => {
    await play3dSet(page);
    await page.locator('[data-key=pause]').click();
    const before = await knobs(page); // the power knob rests at 40 degrees while the set is on
    expect(Math.abs(before.channel)).toBeLessThan(1);
    await page.evaluate(() =>
      window.__APP_TEST__.useHauntStore.setState({
        knobCue: { nonce: 9001, which: 'channel', deg: 25, dur: 3 },
      }),
    );
    await page.waitForFunction(
      () => Math.abs(window.__SCENE_TEST__.knobAngles!().channel - 25) < 3,
      null,
      {
        timeout: 40_000,
        polling: 100,
      },
    );
    const a = await knobs(page);
    expect(a.channel).toBeGreaterThan(22);
    expect(Math.abs(a.volume - before.volume), 'the other knobs stay put').toBeLessThan(1);
    expect(Math.abs(a.power - before.power)).toBeLessThan(1);
    await page.waitForTimeout(1500);
    expect((await knobs(page)).channel, 'it stays where it ended').toBeGreaterThan(22);
  });

  test('power-off returns the knobs to rest, and Calm never turns them', async ({ page }) => {
    await play3dSet(page);
    await page.locator('[data-key=pause]').click();
    await page.evaluate(() =>
      window.__APP_TEST__.useHauntStore.setState({
        knobCue: { nonce: 9002, which: 'volume', deg: -30, dur: 2 },
      }),
    );
    await page.waitForFunction(() => window.__SCENE_TEST__.knobAngles!().volume < -20, null, {
      timeout: 40_000,
      polling: 100,
    });
    await page.locator('[data-key=power]').click();
    await page.waitForFunction(
      () => Math.abs(window.__SCENE_TEST__.knobAngles!().volume) < 2,
      null,
      { timeout: 20_000, polling: 100 },
    );
  });

  test('US-20 AC-4: under Calm a knob cue does not turn a knob', async ({ page }) => {
    await play3dSet(page, true);
    await page.evaluate(() =>
      window.__APP_TEST__.useHauntStore.setState({
        knobCue: { nonce: 9003, which: 'channel', deg: 25, dur: 2 },
      }),
    );
    await page.waitForTimeout(5000);
    expect(Math.abs((await knobs(page)).channel)).toBeLessThan(1);
  });
});
