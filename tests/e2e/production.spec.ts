import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { expect, test as base } from '@playwright/test';
import { ROOT, recompute } from '../helpers/recompute.ts';

/**
 * The production build on port 4391 (no test hooks). US-14, NFR-3, NFR-7, NFR-8, NFR-11.
 * Uses only the DOM: `.app[data-status]` reports the intro status.
 */
const PROD = 'http://localhost:4391';
const r = recompute();
const test = base;
test.use({ baseURL: PROD, viewport: { width: 1440, height: 900 } });

test.describe('production build', () => {
  test('the test hooks are not shipped in production', async ({ page }) => {
    await page.goto('/?mode=2d');
    await page.waitForSelector('.app[data-status="ready"]');
    expect(await page.evaluate(() => typeof window.__APP_TEST__)).toBe('undefined');
    expect(await page.evaluate(() => typeof window.__SCENE_TEST__)).toBe('undefined');
  });

  test('US-14 AC-1 and AC-2, NFR-7: every request is same-origin, no cookies, no storage, no console errors', async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    const origins = new Set<string>();
    const failed: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (rq) => {
      if (!/^(data|blob):/.test(rq.url())) origins.add(new URL(rq.url()).origin);
    });
    page.on('response', (rs) => rs.status() >= 400 && failed.push(`${rs.status()} ${rs.url()}`));
    await page.goto('/?mode=3d-screen');
    await page.waitForSelector('.app[data-status="ready"]', { timeout: 45_000 });
    await page.locator('[data-key=power]').click();
    await page.waitForSelector('.app[data-status="playing"]', { timeout: 20_000 });
    await page.locator('[data-key=skip]').click();
    await page.waitForSelector('.app[data-status="ended"]');
    expect([...origins]).toEqual([PROD]);
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => document.cookie)).toBe('');
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('NFR-3 and US-13 AC-3: the first view (3d-set, desktop) downloads under 5 MB; 2D under 2 MB', async ({
    page,
  }) => {
    for (const [mode, limit] of [
      ['3d-set', 5 * 1024 * 1024],
      ['2d', 2 * 1024 * 1024],
    ] as const) {
      let bytes = 0;
      const pending: Promise<void>[] = [];
      page.on('response', (rs) =>
        pending.push(
          rs.body().then(
            (b) => {
              bytes += b.length;
            },
            () => {},
          ),
        ),
      );
      await page.goto(`/?mode=${mode}`);
      await page.waitForSelector('.app[data-status="ready"]', { timeout: 60_000 });
      await Promise.all(pending);
      test.info().annotations.push({
        type: 'download',
        description: `${mode}: ${(bytes / 1024).toFixed(0)} kB raw`,
      });
      expect(bytes, `${mode} first-view bytes`).toBeLessThan(limit);
      page.removeAllListeners('response');
    }
  });

  test('US-12 AC-3 and FR-11: production page text carries the recomputed facts', async ({
    page,
  }) => {
    await page.goto('/?mode=2d');
    await page.waitForSelector('.app[data-status="ready"]');
    const found = await page.$$eval('[data-fact]', (els) =>
      els.map((e) => [e.getAttribute('data-fact'), e.textContent]),
    );
    expect(found.length).toBeGreaterThan(8);
    for (const [k, v] of found) expect(v, String(k)).toBe(r.byKey[k as string]);
  });

  test('NFR-2 and US-13 AC-1: on an emulated 4G link (9 Mbps, 170 ms RTT) the power control is ready within 3 s (2D); 3D time is reported', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'network emulation uses the Chromium DevTools protocol');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 170,
      downloadThroughput: (9 * 1024 * 1024) / 8,
      uploadThroughput: (9 * 1024 * 1024) / 8,
    });
    const times: Record<string, number> = {};
    for (const mode of ['2d', '3d-screen']) {
      await page.goto('about:blank');
      const t0 = Date.now();
      await page.goto(`/?mode=${mode}`, { waitUntil: 'commit' });
      await page.waitForSelector('.app[data-status="ready"]', { timeout: 60_000 });
      times[mode] = (Date.now() - t0) / 1000;
    }
    test.info().annotations.push({
      type: 'time-to-ready-4g',
      description: `2d ${times['2d']!.toFixed(2)} s, 3d-screen ${times['3d-screen']!.toFixed(2)} s (desktop CPU, software WebGL, cold cache)`,
    });
    expect(times['2d'], '2D: power control ready').toBeLessThan(3);
    // NFR-2 asks for 3 s on a 2022 phone. Software WebGL on a desktop CPU cannot stand in for that, so the 3D time is
    // reported (see the annotation and docs/qa-report.md) and only bounded loosely here.
    expect(
      times['3d-screen'],
      '3d-screen: power control ready (loose bound, software WebGL)',
    ).toBeLessThan(12);
  });

  test('NFR-8 and US-14 AC-3: dist/ holds only static files', () => {
    const allowed = new Set([
      '.html',
      '.js',
      '.css',
      '.json',
      '.svg',
      '.woff2',
      '.png',
      '.glb',
      '.ktx2',
      '.txt',
      '.md',
      '.map',
      '.webp',
      '.ico',
      '.mp3',
      '.ogg',
      '.wav',
      '.hdr',
      '.exr',
      '.jpg',
      '.webmanifest',
    ]);
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    const odd = walk(join(ROOT, 'dist')).filter(
      (f) => !f.endsWith('.gitkeep') && !allowed.has(extname(f)),
    );
    expect(odd).toEqual([]);
  });
});
