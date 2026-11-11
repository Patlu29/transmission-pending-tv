import { recompute } from '../helpers/recompute.ts';
import {
  expect,
  loadIntro,
  openApp,
  openFake,
  powerOn,
  runUntil,
  snapshot,
  test,
  webgl2Available,
  type Mode,
} from './fixtures.ts';

const r = recompute();
const active = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return a
      ? (a.getAttribute('data-key') ??
          a.getAttribute('aria-label') ??
          a.textContent?.trim().slice(0, 30) ??
          a.tagName)
      : null;
  });

test.describe('content note and start screen (US-22, US-11 AC-3, FR-24)', () => {
  test('US-22 AC-1 and US-11 AC-3: the start screen says mild horror, no jump scares, flicker and the Calm option', async ({
    page,
  }) => {
    await openApp(page, '2d');
    const note = (await page.locator('#start-note').textContent())!;
    expect(note).toMatch(/mild horror/i);
    expect(note).toMatch(/no jump scares/i);
    expect(note).toMatch(/flicker/i);
    expect(note).toMatch(/calm mode/i);
    await expect(page.locator('#start-note')).toBeVisible();
  });

  test('US-22 AC-3: the note and the Calm control are announced to a screen reader on the start screen', async ({
    page,
  }) => {
    await openApp(page, '2d');
    await expect(page.locator('[data-key=power]')).toHaveAttribute(
      'aria-describedby',
      /start-note/,
    );
    const sw = page.locator('.start').getByRole('button', { name: /Calm mode/ });
    await expect(sw).toHaveAttribute('aria-pressed', /true|false/);
    await expect(sw).toHaveAttribute('aria-describedby', 'start-note');
    // The accessibility tree exposes both.
    const tree = await page.locator('.start').ariaSnapshot();
    expect(tree).toMatch(/Mild horror theme/);
    expect(tree).toMatch(/button "Calm mode/);
  });

  test('NFR-6: the page has a language, a title and one h1', async ({ page }) => {
    await openApp(page, '2d');
    await expect(page.locator('html')).toHaveAttribute('lang', /en/);
    await expect(page).toHaveTitle(/Transmission Pending/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Transmission Pending');
  });
});

for (const mode of ['2d', '3d-screen'] as Mode[]) {
  test.describe(`keyboard-only operation [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      if (mode !== '2d')
        test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    });

    test(`US-8 AC-3: Tab order is logical, every control has a text label and a visible focus [${mode}]`, async ({
      page,
      browserName,
    }) => {
      // Safari on macOS does not put buttons in the Tab order unless the system option "Press Tab to highlight each
      // item" is on, so the Tab cycle can only be observed in Chromium and Firefox. (Focus order is the DOM order.)
      test.skip(browserName === 'webkit', 'macOS Safari skips buttons when tabbing by default');
      await openApp(page, mode);
      // Power takes initial focus once ready; start from the top of the document.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const order: string[] = [];
      const focusStyles: boolean[] = [];
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const cs = getComputedStyle(el);
          const visible =
            (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
            (cs.boxShadow && cs.boxShadow !== 'none');
          return {
            id:
              el.getAttribute('data-key') ??
              el.getAttribute('aria-label') ??
              el.textContent?.trim() ??
              el.tagName,
            visible: !!visible,
            label: (el.textContent ?? '').trim(),
            tag: el.tagName,
          };
        });
        order.push(info.id);
        if (info.tag === 'BUTTON') {
          expect(info.label.length, `button ${info.id} has a text label`).toBeGreaterThan(0);
          focusStyles.push(info.visible);
        }
      }
      // Tab order cycles: stage, start-screen Calm switch, then the dock Power, Calm, Sound, Read full text.
      const p0 = order.indexOf('power');
      expect(p0, `power is in the Tab cycle: ${order.join(', ')}`).toBeGreaterThanOrEqual(0);
      const after = (k: string) => order.indexOf(k, p0);
      expect(after('calm')).toBeGreaterThan(p0);
      expect(after('sound')).toBeGreaterThan(after('calm'));
      expect(after('text')).toBeGreaterThan(after('sound'));
      expect(
        order.some((o) => o.startsWith('Television')),
        'the stage region is a Tab stop',
      ).toBe(true);
      expect(focusStyles.length).toBeGreaterThan(3);
      expect(focusStyles.every(Boolean), 'every focused button shows an outline or ring').toBe(
        true,
      );
    });

    test(`keyboard flow: Enter powers on, Skip is reachable, focus moves to Replay then Pause, Enter switches off [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      await expect.poll(() => active(page)).toBe('power'); // initial focus once ready (design-spec 6.4)
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
        null,
        { timeout: 20_000, polling: 100 },
      );
      // Skip is in the dock, after Power and Calm.
      const keys = await page.$$eval('.dock [data-key]', (els) =>
        els.map((e) => e.getAttribute('data-key')),
      );
      expect(keys.indexOf('skip')).toBeGreaterThan(keys.indexOf('power'));
      await page.locator('[data-key=skip]').focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ended');
      await expect
        .poll(() => active(page), { message: 'focus moves to Replay after Skip' })
        .toBe('replay');
      await page.keyboard.press('Space');
      await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('playing');
      await expect
        .poll(() => active(page), { message: 'focus moves to Pause after Replay' })
        .toBe('pause');
      await page.locator('[data-key=power]').focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ready');
    });

    test(`US-10 AC-3: "Read full text" opens a labelled modal dialog, traps focus, and Escape returns focus [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      const opener = page.locator('.dock [data-key=text]');
      await opener.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Intro text' });
      await expect(dialog).toBeVisible();
      await expect.poll(() => active(page)).toBe('Close');
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        // Inside the dialog, or out on the browser's own chrome (activeElement is then the body). Never on the page behind.
        const where = await page.evaluate(() =>
          document.activeElement?.closest('dialog')
            ? 'dialog'
            : document.activeElement === document.body
              ? 'browser'
              : (document.activeElement as HTMLElement)?.outerHTML.slice(0, 60),
        );
        expect(
          ['dialog', 'browser'],
          `focus never reaches the page behind the dialog (Tab ${i + 1}): ${where}`,
        ).toContain(where);
      }
      // The dialog carries the whole intro text and the diary, in reading order, with no data-fact duplicates.
      const intro = await loadIntro(page);
      const text = ((await dialog.textContent()) ?? '').replace(/\s+/g, ' ');
      for (const l of intro.pages.flatMap((p) => p.lines))
        expect(text).toContain(l.text.replace(/\s+/g, ' '));
      expect(await dialog.locator('[data-fact]').count()).toBe(0);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect
        .poll(() => active(page), { message: 'focus returns to the opener' })
        .toBe('text');
    });

    test(`US-8 and WCAG 2.1.4: single-key shortcuts work only while focus is in the television region [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      await powerOn(page);
      await page.waitForFunction(
        () => window.__APP_TEST__.useIntroStore.getState().status === 'playing',
        null,
        { timeout: 20_000, polling: 100 },
      );
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.evaluate(() => document.body.focus());
      await page.keyboard.press('s');
      expect((await snapshot(page)).status, 'S does nothing with focus on the body').toBe(
        'playing',
      );
      await page.locator('.stage').focus();
      await page.keyboard.press('s');
      await expect.poll(() => snapshot(page).then((s) => s.status)).toBe('ended');
    });
  });
}

test.describe('screen reader support (US-10)', () => {
  test('US-10 AC-2: the canvas is hidden from assistive technology', async ({ page }) => {
    test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    await openApp(page, '3d-screen');
    await expect(page.locator('[data-scene-host]')).toHaveAttribute('aria-hidden', 'true');
    expect(
      await page
        .locator('canvas')
        .first()
        .evaluate((c) => !!c.closest('[aria-hidden="true"]')),
    ).toBe(true);
    const tree = await page.locator('body').ariaSnapshot();
    expect(tree).not.toMatch(/canvas|img "/i);
  });

  test('US-10 AC-3: one polite live region reports status changes, never the story line by line', async ({
    page,
  }) => {
    await openFake(page, '2d');
    const live = page.locator('[role=status][aria-live=polite]').first();
    await expect(live).toBeAttached();
    expect(await page.locator('[role=status][aria-live=polite]').count()).toBeGreaterThanOrEqual(1);
    const intro = await loadIntro(page);
    const lines = intro.pages.flatMap((p) => p.lines.map((l) => l.text.slice(0, 20)));
    await powerOn(page);
    const messages = new Set<string>();
    await runUntil(page, (s) => s.status === 'ended', {
      stepMs: 250,
      onStep: async (_s, t) => {
        // Only the app's live region (the first role=status), not the notice bar.
        if (t % 1000 === 0 || messages.size < 2) messages.add((await live.textContent()) ?? '');
      },
    });
    messages.delete('');
    expect([...messages]).toContain('TV on');
    for (const m of messages) {
      expect(m.length, `announcement "${m}" is short`).toBeLessThan(80);
      for (const l of lines)
        expect(m.includes(l), `announcement "${m}" is not story text`).toBe(false);
    }
    expect(messages.size, 'announcements during the whole story').toBeLessThanOrEqual(5);
  });

  test('FR-18: the transcript and its facts remain in the DOM at all times, including while the set is off', async ({
    page,
  }) => {
    await openApp(page, '2d');
    expect(await page.locator('#transcript [data-fact]').count()).toBeGreaterThan(8);
    expect(await page.locator('#transcript').getAttribute('aria-label')).toBe('Intro text');
    expect((await page.locator('#transcript').textContent()) ?? '').toContain(r.provenance.model);
  });
});

test.describe('US-16 AC-1 and AC-2: no audio until the visitor unmutes', () => {
  test('no AudioContext is created at load, power-on or during the story; Sound is off by default', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__audioContexts = 0;
      const Orig = window.AudioContext;
      if (Orig) {
        window.AudioContext = class extends Orig {
          constructor(options?: AudioContextOptions) {
            super(options);
            window.__audioContexts++;
          }
        };
      }
    });
    await openFake(page, '2d');
    await expect(page.locator('.dock [data-key=sound]')).toHaveText('Sound off');
    await powerOn(page);
    await page.clock.runFor(8000);
    expect(await page.evaluate(() => window.__audioContexts)).toBe(0);
    // US-16 AC-2: only an explicit unmute starts audio, and a visible control mutes it again.
    await page.locator('.dock [data-key=sound]').click();
    await expect(page.locator('.dock [data-key=sound]')).toHaveText('Sound on');
    expect(await page.evaluate(() => window.__audioContexts)).toBe(1);
    await page.locator('.dock [data-key=sound]').click();
    await expect(page.locator('.dock [data-key=sound]')).toHaveText('Sound off');
  });
});
