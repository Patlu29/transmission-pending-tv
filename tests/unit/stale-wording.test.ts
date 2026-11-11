// Owner: architect (v2 2050 Phase 3), handed to qa-engineer. T50-12 stale-wording check.
import { describe, expect, it } from 'vitest';
import {
  findStale,
  htmlUnits,
  introUnits,
  readAllowFile,
  tsUnits,
  type AllowEntry,
  type Unit,
} from '../../scripts/check-stale-wording.ts';

const unit = (text: string, file = 'x.txt'): Unit => ({ file, line: 1, text });
const terms = (units: Unit[], allow: AllowEntry[] = []) =>
  findStale(units, allow).findings.map((f) => f.term);

describe('stale-wording terms', () => {
  it.each([
    ['A 1970s television', ['1970s']],
    ['back in the seventies', ['seventies']],
    ['a curved CRT glass', ['CRT']],
    ['Teletext page 100', ['teletext']],
    ['a wooden TV on a shelf', ['wood TV']],
    ['the television set hums', ['television set']],
    ['your TV set', ['TV set']],
  ])('flags %j', (text, expected) => {
    expect(terms([unit(text)])).toEqual(expected);
  });
  it.each([
    'a holographic display',
    'crt2d class',
    'useCrtMaterial',
    'the 2050 pane',
    'sensational',
  ])('does not flag %j', (text) => {
    expect(terms([unit(text)])).toEqual([]);
  });
});

describe('allow-list', () => {
  const allow: AllowEntry[] = [
    { pattern: '--crt-[a-z0-9-]+', reason: 'token' },
    { pattern: 'v1 was the 1970s release', reason: 'history note', files: ['privacy.html'] },
  ];
  it('allows a hit inside an allowed span', () => {
    expect(terms([unit('box-shadow: 0 0 8px var(--crt-glow)')], allow)).toEqual([]);
  });
  it('respects the file scope', () => {
    expect(terms([unit('v1 was the 1970s release', 'privacy.html')], allow)).toEqual([]);
    expect(terms([unit('v1 was the 1970s release', 'index.html')], allow)).toEqual(['1970s']);
  });
  it('reports which entries were used', () => {
    expect([...findStale([unit('var(--crt-x) and more')], allow).used]).toEqual([0]);
  });
  it('the shipped allow file is valid', () => {
    const f = readAllowFile(
      new URL('../../scripts/stale-wording.allow.json', import.meta.url).pathname,
    );
    expect(f.allow.every((e) => e.reason.length > 0 && e.expires)).toBe(true);
  });
});

describe('extraction', () => {
  it('takes JSX text, user-facing attributes and sentences, not imports, identifiers or class names', () => {
    const src = `
      import { teletext } from '@/ui/teletext/index.ts';
      const cls = 'teletext-screen';
      const msg = 'The CRT warmed up';
      export const A = () => <div className="crt2d" aria-label="Teletext page" title="ok">Old teletext here</div>;
    `;
    const texts = tsUnits('a.tsx', src).map((u) => u.text.trim());
    expect(texts).toEqual(['The CRT warmed up', 'Teletext page', 'ok', 'Old teletext here']);
  });
  it('reads visible HTML text and meta content, not comments or scripts', () => {
    const html = `<meta name="description" content="A 1970s TV" />
<!-- a CRT comment -->
<script>const x = "teletext";</script>
<p>Hello</p>`;
    expect(terms(htmlUnits('index.html', html))).toEqual(['1970s']);
  });
  it('checks intro copy segments but never fact segments (truthful history)', () => {
    const intro = {
      pages: [
        {
          lines: [
            {
              id: 'p-1',
              segments: [
                { kind: 'copy', text: 'Last entry: ' },
                {
                  kind: 'fact',
                  key: 'git.firstCommit.subject',
                  text: 'add CRT shader and teletext',
                },
              ],
            },
          ],
        },
      ],
    };
    expect(terms(introUnits('dist/intro.json', intro))).toEqual([]);
  });
});
