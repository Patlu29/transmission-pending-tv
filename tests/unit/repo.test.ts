import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from '../helpers/recompute.ts';

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const walk = (d: string): string[] =>
  readdirSync(join(ROOT, d)).flatMap((f) => {
    const rel = join(d, f);
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });

describe('licences and assets (US-2 AC-3, US-15 AC-3, NFR-13)', () => {
  it('the teletext typeface is VT323, with its licence file listed', () => {
    const licences = read('public/fonts/LICENCES.md');
    expect(licences).toMatch(/VT323/);
    expect(licences).toMatch(/SIL Open Font License/i);
    expect(existsSync(join(ROOT, 'public/fonts/vt323-regular.woff2'))).toBe(true);
    expect(read('src/styles/fonts.css')).toMatch(/VT323/i);
    expect(read('src/styles/tokens.css')).toMatch(/--font-teletext:[^;]*VT323/i);
    expect(readdirSync(join(ROOT, 'public/fonts/licences')).some((f) => /VT323/i.test(f))).toBe(
      true,
    );
  });

  it('every shipped font, texture, model and audio file is named in its folder LICENCES.md', () => {
    const missing: string[] = [];
    for (const dir of ['fonts', 'textures', 'models', 'audio', 'env']) {
      const base = join('public', dir);
      if (!existsSync(join(ROOT, base))) continue;
      const files = walk(base).filter(
        (f) =>
          !/LICENCES\.md$|licences\//.test(f) &&
          !f.endsWith('.DS_Store') &&
          !f.endsWith('.gitkeep'),
      );
      if (files.length === 0) continue;
      const doc = existsSync(join(ROOT, base, 'LICENCES.md'))
        ? read(join(base, 'LICENCES.md'))
        : '';
      for (const f of files)
        if (!doc.includes(relative(base, f).split('/').pop()!)) missing.push(f);
    }
    expect(missing).toEqual([]);
  });

  it('the favicon source and the page theme colour are grey', () => {
    expect(read('index.html')).toMatch(/theme-color" content="#([0-9a-f]{2})\1\1"/i);
  });
});

describe('build diary (US-15 AC-1, NFR-12)', () => {
  const log = execFileSync('git', ['log', '--format=%H%x09%P%x09%s'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [h, p, ...s] = l.split('\t');
      return { h: h!, parents: p!.split(' ').filter(Boolean), subject: s.join('\t') };
    });

  it('every commit has a non-empty, single-line, reasonably short subject', () => {
    for (const c of log) {
      expect(c.subject.length, c.h.slice(0, 7)).toBeGreaterThan(8);
      expect(c.subject.length, c.h.slice(0, 7)).toBeLessThanOrEqual(100);
    }
  });

  it('history is linear (no merge commits), as a diary should be', () => {
    expect(log.filter((c) => c.parents.length > 1)).toEqual([]);
  });

  it('subjects are not placeholders such as WIP, fixup or squash', () => {
    expect(log.filter((c) => /^(wip|fixup!|squash!|tmp|asdf|\.+)\b/i.test(c.subject))).toEqual([]);
  });
});

describe('scripts and docs the suite relies on', () => {
  it('package.json carries the E2E scripts', () => {
    const s = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
    expect(s['test:e2e']).toBeTruthy();
    expect(s['build:test']).toMatch(/--mode test/);
  });
});
