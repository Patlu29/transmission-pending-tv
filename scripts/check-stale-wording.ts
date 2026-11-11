/**
 * T50-12 stale-wording check (docs/requirements/v2-theme-2050.md). Owner: architect.
 * Fails when user-facing or repo-facing copy on v2 still presents the site as a 1970s set, a CRT,
 * teletext, a wood TV or a "television set".
 *
 *   node scripts/check-stale-wording.ts            source copy only
 *   node scripts/check-stale-wording.ts --dist     also the built pages and dist/intro.json (run after build)
 *   node scripts/check-stale-wording.ts --strict   expired allow-list entries are errors (CI on main and v2)
 *
 * Not part of `npm run build`, so the scheduled guide rebuild of an old tag is never affected.
 *
 * What is scanned:
 *   - copy files in full (comment lines in .tmpl and .cues skipped): see TARGETS and the allow file's `extraFiles`;
 *   - src/**\/*.{ts,tsx} (not src/generated): only user-facing strings, found with the TypeScript parser:
 *     JSX text, user-facing JSX attributes (aria-*, title, alt, placeholder, label), and string or
 *     template literals that contain whitespace (sentences). Identifiers, import paths, class names
 *     and comments are code, not copy;
 *   - src/**\/*.css: `content:` strings only.
 * Built-in exemption: fact segments (commit subjects and other facts) are the truthful build
 * history (NFR-12 forbids rewriting it), so dist/facts.json and intro fact segments are never scanned.
 * Everything else goes through scripts/stale-wording.allow.json.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));

export const TERMS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: '1970s', re: /\b(?:19)?70s\b/gi },
  { name: 'seventies', re: /\bseventies\b/gi },
  { name: 'CRT', re: /\bCRTs?\b/gi },
  { name: 'teletext', re: /\bteletext\b/gi },
  { name: 'wood TV', re: /\bwood(?:en)?[ -]?(?:TV|television|set|cabinet)s?\b/gi },
  { name: 'television set', re: /\btelevision[ -]sets?\b/gi },
  { name: 'TV set', re: /\bTV[ -]sets?\b/gi },
];

const TARGETS = [
  'index.html',
  'privacy.html',
  'README.md',
  'src/content/intro.tmpl',
  'src/content/intro.cues',
];

const UI_ATTRS = /^(aria-[a-z]+|title|alt|placeholder|label)$/;

export interface AllowEntry {
  /** Regex source (case-insensitive). A hit inside any span this matches is allowed. */
  pattern: string;
  reason: string;
  /** Repo-relative path prefixes the entry applies to. Omitted: every file. */
  files?: string[];
  /** YYYY-MM-DD. After it: a warning, or an error with --strict. */
  expires?: string;
}

export interface AllowFile {
  schemaVersion: 1;
  allow: AllowEntry[];
  /** More repo-relative copy files to scan in full (for example the permission email). */
  extraFiles?: string[];
}

/** A piece of text to check, with the line it starts on. */
export interface Unit {
  file: string;
  line: number;
  text: string;
}

export interface Finding extends Unit {
  term: string;
  match: string;
}

/* ---------------- extraction ---------------- */

function lineUnits(file: string, text: string, skipComments: boolean): Unit[] {
  return text
    .split('\n')
    .flatMap((t, i) =>
      skipComments && t.trimStart().startsWith('#') ? [] : [{ file, line: i + 1, text: t }],
    );
}

export function tsUnits(file: string, source: string): Unit[] {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const units: Unit[] = [];
  const add = (node: ts.Node, text: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    units.push({ file, line: line + 1, text });
  };
  const isModuleSpecifier = (node: ts.Node) => {
    const p = node.parent;
    return (
      ts.isImportDeclaration(p) ||
      ts.isExportDeclaration(p) ||
      (ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword) ||
      ts.isExternalModuleReference(p) ||
      ts.isImportTypeNode(p.parent ?? p)
    );
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      if (node.text.trim()) add(node, node.text);
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      const init = node.initializer;
      if (init && ts.isStringLiteral(init) && UI_ATTRS.test(name)) add(init, init.text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isModuleSpecifier(node) && !ts.isJsxAttribute(node.parent) && /\s/.test(node.text)) {
        add(node, node.text);
      }
    } else if (ts.isTemplateExpression(node)) {
      const parts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
      if (/\s/.test(parts)) add(node, parts);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return units;
}

export function cssUnits(file: string, source: string): Unit[] {
  const units: Unit[] = [];
  const re = /content\s*:\s*(["'])((?:\\.|(?!\1).)*)\1/g;
  for (const m of source.matchAll(re)) {
    const line = source.slice(0, m.index).split('\n').length;
    units.push({ file, line, text: m[2] ?? '' });
  }
  return units;
}

/** Visible text and user-facing attributes of an HTML page (script and style bodies removed). */
export function htmlUnits(file: string, source: string): Unit[] {
  const units: Unit[] = [];
  // Blank out comments, scripts and style bodies, keeping newlines so line numbers stay right.
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  const cleaned = source
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, blank);
  cleaned.split('\n').forEach((l, i) => {
    // Collect user-facing attribute values first, then drop the tags themselves.
    const attrs = [...l.matchAll(/\b(?:content|title|alt|aria-label|placeholder)="([^"]*)"/gi)].map(
      (m) => m[1] ?? '',
    );
    const text = [l.replace(/<[^>]*>/g, ' ').replace(/\b[\w-]+="[^"]*"/g, ' '), ...attrs].join(' ');
    if (text.trim()) units.push({ file, line: i + 1, text });
  });
  return units;
}

/** Copy segments of the built intro; fact segments are exempt (truthful history). */
export function introUnits(file: string, json: unknown): Unit[] {
  const units: Unit[] = [];
  const pages =
    (
      json as {
        pages?: Array<{
          lines?: Array<{ id: string; segments?: Array<{ kind: string; text: string }> }>;
        }>;
      }
    ).pages ?? [];
  for (const page of pages) {
    for (const line of page.lines ?? []) {
      const copy = (line.segments ?? [])
        .filter((s) => s.kind === 'copy')
        .map((s) => s.text)
        .join(' ');
      if (copy.trim()) units.push({ file: `${file}#${line.id}`, line: 1, text: copy });
    }
  }
  return units;
}

function walk(dir: string, filter: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return walk(path, filter);
    return filter(path) ? [path] : [];
  });
}

export function collectUnits(
  root: string,
  options: { dist: boolean; extraFiles?: string[] },
): Unit[] {
  const rel = (p: string) => relative(root, p).split('\\').join('/');
  const units: Unit[] = [];
  for (const f of [...TARGETS, ...(options.extraFiles ?? [])]) {
    const path = join(root, f);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    units.push(
      ...(f.endsWith('.html') ? htmlUnits(f, text) : lineUnits(f, text, /\.(tmpl|cues)$/.test(f))),
    );
  }
  for (const path of walk(join(root, 'public'), (p) => p.endsWith('.svg'))) {
    units.push(...htmlUnits(rel(path), readFileSync(path, 'utf8')));
  }
  const src = join(root, 'src');
  for (const path of walk(
    src,
    (p) => /\.(ts|tsx)$/.test(p) && !p.includes(`${join('src', 'generated')}`),
  )) {
    units.push(...tsUnits(rel(path), readFileSync(path, 'utf8')));
  }
  for (const path of walk(src, (p) => p.endsWith('.css'))) {
    units.push(...cssUnits(rel(path), readFileSync(path, 'utf8')));
  }
  if (options.dist) {
    const dist = join(root, 'dist');
    for (const path of walk(dist, (p) => p.endsWith('.html'))) {
      units.push(...htmlUnits(rel(path), readFileSync(path, 'utf8')));
    }
    const intro = join(dist, 'intro.json');
    if (existsSync(intro))
      units.push(...introUnits('dist/intro.json', JSON.parse(readFileSync(intro, 'utf8'))));
  }
  return units;
}

/* ---------------- matching ---------------- */

export function findStale(
  units: Unit[],
  allow: AllowEntry[],
): { findings: Finding[]; used: Set<number> } {
  const findings: Finding[] = [];
  const used = new Set<number>();
  for (const unit of units) {
    const spans: Array<[number, number, number]> = [];
    allow.forEach((entry, idx) => {
      if (entry.files && !entry.files.some((prefix) => unit.file.startsWith(prefix))) return;
      for (const m of unit.text.matchAll(new RegExp(entry.pattern, 'gi'))) {
        spans.push([m.index, m.index + m[0].length, idx]);
      }
    });
    for (const term of TERMS) {
      for (const m of unit.text.matchAll(term.re)) {
        const start = m.index;
        const end = start + m[0].length;
        const cover = spans.find(([s, e]) => s <= start && end <= e);
        if (cover) {
          used.add(cover[2]);
          continue;
        }
        findings.push({ ...unit, term: term.name, match: m[0] });
      }
    }
  }
  return { findings, used };
}

export function readAllowFile(path: string): AllowFile {
  const json = JSON.parse(readFileSync(path, 'utf8')) as AllowFile;
  if (json.schemaVersion !== 1 || !Array.isArray(json.allow)) {
    throw new Error(`${path}: expected { "schemaVersion": 1, "allow": [...] }`);
  }
  json.allow.forEach((e, i) => {
    if (typeof e.pattern !== 'string' || !e.reason)
      throw new Error(`${path}: allow[${i}] needs pattern and reason`);
    new RegExp(e.pattern, 'gi'); // throws on a bad pattern
    if (e.expires !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(e.expires)) {
      throw new Error(`${path}: allow[${i}].expires must be YYYY-MM-DD`);
    }
  });
  return json;
}

function main(): number {
  const args = new Set(process.argv.slice(2));
  const allowPath = join(ROOT, 'scripts', 'stale-wording.allow.json');
  const allowFile = readAllowFile(allowPath);
  const today = new Date().toISOString().slice(0, 10);
  const expired = allowFile.allow.filter((e) => e.expires && e.expires < today);
  const active = allowFile.allow.filter(
    (e) => !(e.expires && e.expires < today && args.has('--strict')),
  );

  const units = collectUnits(ROOT, { dist: args.has('--dist'), extraFiles: allowFile.extraFiles });
  const { findings, used } = findStale(units, active);

  for (const e of expired) {
    console[args.has('--strict') ? 'error' : 'warn'](
      `[wording] allow-list entry expired ${e.expires}: /${e.pattern}/ (${e.reason})`,
    );
  }
  active.forEach((e, i) => {
    if (!used.has(i))
      console.warn(`[wording] note: allow-list entry no longer needed: /${e.pattern}/`);
  });

  if (findings.length > 0) {
    console.error(`\n[wording] T50-12: ${findings.length} stale reference(s):`);
    for (const f of findings) {
      const ctx = f.text.trim().replace(/\s+/g, ' ').slice(0, 100);
      console.error(`  ${f.file}:${f.line}: "${f.match}" (${f.term}) in "${ctx}"`);
    }
    console.error(
      '\nRewrite the copy, or add a justified entry to scripts/stale-wording.allow.json.\n',
    );
    return 1;
  }
  if (args.has('--strict') && expired.length > 0) return 1;
  console.log(
    `[wording] ok: ${units.length} text unit(s) checked${args.has('--dist') ? ' (with dist)' : ''}.`,
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main());
}
