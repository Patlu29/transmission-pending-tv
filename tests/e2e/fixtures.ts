import { expect, test as base, type Page } from '@playwright/test';
import type { IntroJson } from '../helpers/recompute.ts';

export type Mode = '2d' | '3d-screen' | '3d-set';

export interface Snapshot {
  status: string;
  paused: boolean;
  pageIndex: number;
  lineIndex: number;
  revealedChars: number;
  calm: boolean;
  ghost: number;
  ghostNear: number;
  creep: number;
  dim: number;
  shadow: number;
  hum: number;
  rollActive: boolean;
  knobNonce: number | null;
  effects: string[];
  mode: string;
}

/** Collects console errors, page errors, failed requests and third-party requests for every test. */
export interface Monitor {
  errors: string[];
  warnings: string[];
  failed: string[];
  thirdParty: string[];
  requests: string[];
  /** Call in a test that deliberately provokes errors (for example a lost WebGL context). */
  allowErrors(reason: string): void;
}

export const test = base.extend<{ monitor: Monitor }>({
  monitor: [
    async ({ page, baseURL }, use, testInfo) => {
      const origin = new URL(baseURL ?? 'http://localhost').origin;
      let allowed: string | null = null;
      const m: Monitor = {
        errors: [],
        warnings: [],
        failed: [],
        thirdParty: [],
        requests: [],
        allowErrors: (r) => {
          allowed = r;
        },
      };
      page.on('console', (msg) => {
        if (msg.type() === 'error') m.errors.push(msg.text());
        else if (msg.type() === 'warning') m.warnings.push(msg.text());
      });
      page.on('pageerror', (e) => m.errors.push(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) => m.failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
      page.on('response', (r) => {
        if (r.status() >= 400) m.failed.push(`${r.url()} HTTP ${r.status()}`);
      });
      page.on('request', (r) => {
        const u = r.url();
        if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
        m.requests.push(u);
        if (new URL(u).origin !== origin) m.thirdParty.push(u);
      });
      await use(m);
      if (m.warnings.length) {
        await testInfo.attach('console-warnings', {
          body: [...new Set(m.warnings)].join('\n'),
          contentType: 'text/plain',
        });
      }
      if (allowed === null) {
        expect(m.errors, 'console errors and page errors').toEqual([]);
        expect(m.failed, 'failed network requests').toEqual([]);
        expect(m.thirdParty, 'requests to other origins').toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };

export async function webgl2Available(page: Page): Promise<boolean> {
  // Probe on a blank page: navigating away from the real app would abort its requests.
  await page.goto('about:blank');
  return page.evaluate(() => {
    try {
      return !!document.createElement('canvas').getContext('webgl2');
    } catch {
      return false;
    }
  });
}

/** Opens the app and waits until the power control is enabled (status `ready`). */
export async function openApp(
  page: Page,
  mode: Mode | null,
  opts: { calm?: boolean; query?: string } = {},
): Promise<void> {
  const q = [mode ? `mode=${mode}` : '', opts.query ?? ''].filter(Boolean).join('&');
  await page.goto(`/${q ? `?${q}` : ''}`);
  await waitReady(page);
  if (opts.calm)
    await page.evaluate(() => window.__APP_TEST__.useDisplayStore.getState().setCalm(true));
}

export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => window.__APP_TEST__?.useIntroStore.getState().status === 'ready',
    null,
    { timeout: 45_000, polling: 100 },
  );
}

/** Installs the fake clock BEFORE navigation, so a 70 s story can be played in about a second. */
export async function openFake(
  page: Page,
  mode: Mode,
  opts: { calm?: boolean } = {},
): Promise<void> {
  await page.clock.install({ time: 0 });
  await page.goto(`/?mode=${mode}`);
  await page.waitForFunction(
    () => window.__APP_TEST__?.useIntroStore.getState().status === 'ready',
    null,
    { timeout: 45_000, polling: 100 },
  );
  // After install() fake time still flows at real speed. Pause it, so that only runFor() moves it and a test
  // is deterministic even when screenshots and analysis take real time.
  const now = await page.evaluate(() => performance.now());
  await page.clock.pauseAt(now + 500);
  if (opts.calm)
    await page.evaluate(() => window.__APP_TEST__.useDisplayStore.getState().setCalm(true));
}

export interface ScreenExtras {
  text: string;
  glyphMoves: number;
  streaks: number;
  transcript: string;
}

export function snapshot(page: Page, withScreen: true): Promise<Snapshot & ScreenExtras>;
export function snapshot(page: Page, withScreen?: false): Promise<Snapshot>;
export function snapshot(
  page: Page,
  withScreen = false,
): Promise<Snapshot & Partial<ScreenExtras>> {
  return page.evaluate((withScreen) => {
    const a = window.__APP_TEST__;
    const i = a.useIntroStore.getState();
    const h = a.useHauntStore.getState();
    const d = a.useDisplayStore.getState();
    const extra = withScreen
      ? {
          text: [
            ...document.querySelectorAll(
              '[data-screen="2d"] .screen2d__content:first-child .tt-row',
            ),
          ]
            .map((r) => r.textContent ?? '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
          glyphMoves: [...document.querySelectorAll('[data-screen="2d"] .tt__glyph')].filter((g) =>
            /translate\((?!0px, 0px)/.test((g as HTMLElement).style.transform),
          ).length,
          streaks: document.querySelectorAll('[data-screen="2d"] .screen2d__streak').length,
          transcript: document.querySelector('#transcript')?.textContent ?? '',
        }
      : {};
    return {
      ...extra,
      status: i.status,
      paused: i.paused,
      pageIndex: i.pageIndex,
      lineIndex: i.lineIndex,
      revealedChars: i.revealedChars,
      calm: d.reducedMotion,
      ghost: h.ghost,
      ghostNear: h.ghostNear,
      creep: h.creep,
      dim: h.dim,
      shadow: h.shadow,
      hum: h.hum,
      rollActive: h.roll.active,
      knobNonce: h.knobCue ? h.knobCue.nonce : null,
      effects: Object.values(h.textEffects as Record<string, { kind: string }>).map((e) => e.kind),
      mode: d.renderMode,
    };
  }, withScreen);
}

/** Advances the fake clock in `stepMs` steps until `until` is true (or `limitMs` passes). Returns elapsed ms. */
export async function runUntil(
  page: Page,
  until: (s: Snapshot) => boolean,
  opts: {
    stepMs?: number;
    limitMs?: number;
    withScreen?: boolean;
    onStep?: (s: Snapshot & Partial<ScreenExtras>, elapsed: number) => Promise<void> | void;
  } = {},
): Promise<number> {
  const stepMs = opts.stepMs ?? 200;
  const limit = opts.limitMs ?? 150_000;
  let elapsed = 0;
  for (;;) {
    const s = opts.withScreen ? await snapshot(page, true) : await snapshot(page);
    if (opts.onStep) await opts.onStep(s, elapsed);
    if (until(s)) return elapsed;
    if (elapsed >= limit)
      throw new Error(`condition not reached in ${limit} ms of fake time (status ${s.status})`);
    await page.clock.runFor(stepMs);
    elapsed += stepMs;
  }
}

export async function powerOn(page: Page): Promise<void> {
  await page.locator('[data-key=power]').click();
}

export async function loadIntro(page: Page): Promise<IntroJson> {
  const r = await page.request.get('/intro.json');
  return (await r.json()) as IntroJson;
}

export async function loadFacts(page: Page) {
  return (await (await page.request.get('/facts.json')).json()) as Record<string, unknown>;
}

/** Text of the visible 2D screen (rows joined with a space, whitespace collapsed). */
export function screenText(page: Page): Promise<string> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-screen="2d"] .screen2d__content:first-child .tt-row')]
      .map((r) => r.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/**
 * Decodes a PNG in a scratch page and returns pixel statistics. Used for greyscale sampling and
 * for the flash analysis. Tiles are 341 x 256 CSS px (the 10-degree field of WCAG 2.3.1).
 */
export interface PixelStats {
  w: number;
  h: number;
  maxChannelDiff: number;
  offenders: number;
  meanLum: number;
  rectLum: number | null;
  /** Luminance of the 99th and 25th percentile pixel inside rect (text versus background). */
  rectP99: number | null;
  rectP25: number | null;
  tiles: number[];
}

/**
 * The decoder page lives in its OWN browser context. A second page in the app's context takes the foreground, the app's
 * page is then treated as hidden, and the app (correctly) pauses its clock, which would change what the test measures.
 */
const analysers = new WeakMap<object, Page>();
export async function analyse(
  page: Page,
  png: Buffer,
  rect?: { x: number; y: number; width: number; height: number } | null,
): Promise<PixelStats> {
  const browser = page.context().browser()!;
  let helper = analysers.get(browser);
  if (!helper || helper.isClosed()) {
    const ctx = await browser.newContext();
    helper = await ctx.newPage();
    await helper.goto('about:blank');
    analysers.set(browser, helper);
  }
  return helper.evaluate(
    async ({ b64, rect }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const cv = document.createElement('canvas');
      cv.width = bmp.width;
      cv.height = bmp.height;
      const g = cv.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(bmp, 0, 0);
      const { data } = g.getImageData(0, 0, cv.width, cv.height);
      const lin = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const c = i / 255;
        lin[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      let maxDiff = 0,
        off = 0,
        sum = 0;
      const W = cv.width,
        H = cv.height;
      const TW = 341,
        TH = 256;
      const nx = Math.floor(W / TW),
        ny = Math.floor(H / TH);
      const tiles = new Array(nx * ny).fill(0);
      let rsum = 0,
        rn = 0;
      const hist = new Uint32Array(256);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const r = data[i]!,
            gg = data[i + 1]!,
            b = data[i + 2]!;
          const d = Math.max(Math.abs(r - gg), Math.abs(gg - b), Math.abs(r - b));
          if (d > maxDiff) maxDiff = d;
          if (d > 2) off++;
          const l = 0.2126 * lin[r]! + 0.7152 * lin[gg]! + 0.0722 * lin[b]!;
          sum += l;
          const tx = Math.floor(x / TW),
            ty = Math.floor(y / TH);
          if (tx < nx && ty < ny) tiles[ty * nx + tx] += l;
          if (
            rect &&
            x >= rect.x &&
            x < rect.x + rect.width &&
            y >= rect.y &&
            y < rect.y + rect.height
          ) {
            rsum += l;
            rn++;
            hist[r]!++;
          }
        }
      }
      const pct = (p: number) => {
        let acc = 0;
        for (let v = 0; v < 256; v++) {
          acc += hist[v]!;
          if (acc >= p * rn) return lin[v]!;
        }
        return lin[255]!;
      };
      return {
        w: W,
        h: H,
        maxChannelDiff: maxDiff,
        offenders: off,
        meanLum: sum / (W * H),
        rectLum: rect && rn ? rsum / rn : null,
        rectP99: rect && rn ? pct(0.99) : null,
        rectP25: rect && rn ? pct(0.25) : null,
        tiles: tiles.map((t) => t / (TW * TH)),
      };
    },
    { b64: png.toString('base64'), rect: rect ?? null },
  );
}

/** Locates a dock key, opening the "More" sheet first when compact layouts have moved it there. */
export async function dockKey(page: Page, id: string) {
  const key = page.locator(`[data-key="${id}"]`);
  if ((await key.count()) === 0) {
    const more = page.locator('[data-key="more"]');
    if ((await more.count()) > 0 && (await more.getAttribute('aria-expanded')) !== 'true')
      await more.click();
  }
  return key;
}

export async function pressKey(page: Page, id: string): Promise<void> {
  await (await dockKey(page, id)).click();
}

/**
 * CSS animations (the 2D warm-up, collapse and noise) run on the browser's real timeline, not on the fake clock,
 * so a capture loop that advances the fake clock in 100 ms steps would see them jump. This pauses every running
 * animation and sets its currentTime to the fake time elapsed since it was first seen, so frame N shows the
 * picture at exactly N x step.
 */
export async function syncAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const now = performance.now(); // the fake clock
    for (const a of document.getAnimations()) {
      const anim = a as Animation & { __t0?: number };
      if (anim.__t0 === undefined) anim.__t0 = now;
      anim.pause();
      anim.currentTime = now - anim.__t0;
    }
  });
}

/**
 * Real-time frame capture with the DevTools screencast (Chromium only). Returns the frames the compositor
 * produced, with their timestamps, resampled onto a fixed grid so that "change per 100 ms" is exact even though
 * painting and decoding are slower than 10 Hz.
 */
export async function screencast(
  page: Page,
  run: () => Promise<void>,
  opts: { gridMs?: number } = {},
): Promise<{ t: number; png: Buffer }[]> {
  const cdp = await page.context().newCDPSession(page);
  const frames: { t: number; png: Buffer }[] = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: (f.metadata.timestamp ?? 0) * 1000, png: Buffer.from(f.data, 'base64') });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await run();
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  const grid = opts.gridMs ?? 100;
  if (frames.length === 0) return [];
  const t0 = frames[0]!.t;
  const end = frames[frames.length - 1]!.t;
  const out: { t: number; png: Buffer }[] = [];
  let k = 0;
  for (let t = t0; t <= end; t += grid) {
    while (k + 1 < frames.length && frames[k + 1]!.t <= t) k++;
    out.push({ t: t - t0, png: frames[k]!.png });
  }
  return out;
}

/**
 * The scheduler rewrites the haunt store on every frame, so a value set once is overwritten before the scene reads it.
 * This pins values: whenever anything changes the store, they are put straight back (zustand notifies synchronously).
 */
export async function pinHaunt(page: Page, values: Record<string, number>): Promise<void> {
  await page.evaluate((v) => {
    const store = window.__APP_TEST__.useHauntStore;
    window.__unpin?.();
    const apply = () => {
      const s = store.getState();
      if (Object.entries(v).some(([k, x]) => s[k] !== x)) store.setState(v);
    };
    window.__unpin = store.subscribe(apply);
    apply();
  }, values);
}

export async function unpinHaunt(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__unpin?.();
    window.__unpin = undefined;
  });
}
