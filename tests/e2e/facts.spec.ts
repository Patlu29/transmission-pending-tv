import { recompute } from '../helpers/recompute.ts';
import {
  expect,
  loadIntro,
  openApp,
  openFake,
  powerOn,
  runUntil,
  test,
  webgl2Available,
  type Mode,
} from './fixtures.ts';

const MODES: Mode[] = ['2d', '3d-screen', '3d-set'];
const r = recompute();

for (const mode of MODES) {
  test.describe(`facts on the page [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      if (mode !== '2d')
        test.skip(!(await webgl2Available(page)), 'WebGL2 is not available in this browser');
    });

    test(`US-5 AC-3, US-6 AC-1, US-12 AC-3, FR-11: every [data-fact] equals the recomputed value [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      const found = await page.$$eval('[data-fact]', (els) =>
        els.map((e) => ({ key: e.getAttribute('data-fact')!, text: e.textContent ?? '' })),
      );
      expect(found.length).toBeGreaterThan(8);
      const wrong = found
        .filter((f) => r.byKey[f.key] !== f.text)
        .map((f) => `${f.key}: "${f.text}" vs "${r.byKey[f.key]}"`);
      expect(wrong).toEqual([]);
      // Every fact segment of the built intro is on the page, once, in the transcript only.
      const intro = await loadIntro(page);
      const expected = intro.pages.flatMap((p) =>
        p.lines.flatMap((l) => l.segments.filter((s) => s.kind === 'fact').map((s) => s.key!)),
      );
      expect(found.map((f) => f.key)).toEqual(expected);
      expect(await page.locator('#transcript [data-fact]').count()).toBe(found.length);
    });

    test(`FR-12, FR-13: the transcript states commit count, first-commit date, roles, phases, stack, tool, plugin, model and "as of commit" [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      const text = (await page.locator('#transcript').textContent())!.replace(/\s+/g, ' ');
      for (const needle of [
        String(r.commitCount),
        r.first.dateDisplay,
        ...r.roles,
        ...r.phases.all,
        ...r.stack.list,
        r.provenance.tool,
        r.provenance.plugin,
        r.provenance.model,
      ]) {
        expect(text, `transcript mentions "${needle}"`).toContain(needle);
      }
      expect(text.toUpperCase()).toContain(`AS OF COMMIT ${r.revision.toUpperCase()}`);
    });

    test(`US-10 AC-1 and FR-32: the transcript is DOM text in reading order, equal to the built intro [${mode}]`, async ({
      page,
    }) => {
      await openApp(page, mode);
      const intro = await loadIntro(page);
      const lines = await page.$$eval(
        '#transcript section[data-page]:not([data-page="diary-list"]) p',
        (ps) => ps.map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim()),
      );
      expect(lines).toEqual(
        intro.pages.flatMap((p) => p.lines.map((l) => l.text.replace(/\s+/g, ' ').trim())),
      );
      const pageIds = await page.$$eval('#transcript section[data-page]', (s) =>
        s.map((x) => x.getAttribute('data-page')),
      );
      expect(pageIds.slice(0, -1)).toEqual(intro.pages.map((p) => p.id));
    });
  });
}

test.describe('what is rendered on the visible screen (2D, fake clock)', () => {
  test('US-5 and FR-11: every fact appears, as the recomputed text, on the painted screen during the story', async ({
    page,
  }) => {
    await openFake(page, '2d');
    await powerOn(page);
    const seen = new Set<string>();
    await runUntil(page, (s) => s.status === 'ended', {
      stepMs: 250,
      withScreen: true,
      onStep: (s) => {
        seen.add((s as { text: string }).text);
      },
    });
    const all = [...seen].join(' | ');
    const missing: string[] = [];
    // Some long facts wrap across rows and are broken by the grid, so each is checked word by word, in order.
    for (const [key, value] of Object.entries(r.byKey)) {
      if (['provenance.pluginVersion', 'provenance.modelId'].includes(key)) continue; // not used in the story
      const words = value.split(/\s+/);
      const re = new RegExp(
        words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'),
        'i',
      );
      if (!re.test(all)) missing.push(`${key}=${value}`);
    }
    expect(missing).toEqual([]);
  });
});
