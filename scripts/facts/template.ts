/**
 * Intro template format (src/content/intro.tmpl), one instruction per line:
 *
 *   # comment                  ignored
 *   !draft                     FR-12 coverage not enforced (refused in --strict builds)
 *   !allow-digits 1970s 100    tokens containing digits that hand-written copy may use (FR-14)
 *   == page-id                 starts a page (kebab-case id)
 *   any other text             one logical screen line; wrapping is done by the renderer
 *
 * Placeholders: {{ path.to.fact }}. A placeholder must resolve to a non-empty
 * string, a finite number, or a non-empty list of strings ("a, b and c").
 * Blank lines are ignored.
 */
import type {
  Facts,
  IntroLine,
  IntroPage,
  IntroSegment,
  ResolvedIntro,
} from '../../src/facts/schema.ts';
import { REQUIRED_INTRO_KEYS } from './config.ts';
import { fail } from './errors.ts';

const PLACEHOLDER = /\{\{\s*([a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)*)\s*\}\}/g;

interface Problem {
  line: number;
  message: string;
}

function lookup(facts: Facts, key: string): { text: string } | { error: string } {
  const parts = key.split('.');
  let node: unknown = facts;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (node === null) {
      const group = parts.slice(0, i).join('.');
      const reason = facts.unavailable[group] ?? 'value is null';
      return { error: `"${key}" is unavailable: ${reason}` };
    }
    if (typeof node !== 'object' || Array.isArray(node) || !Object.hasOwn(node, part)) {
      return { error: `unknown fact "${key}"` };
    }
    node = (node as Record<string, unknown>)[part];
  }

  if (node === null) {
    const reason = facts.unavailable[key] ?? 'value is null';
    return { error: `"${key}" is unavailable: ${reason}` };
  }
  if (typeof node === 'string') {
    return node.trim() ? { text: node } : { error: `"${key}" resolved to an empty string` };
  }
  if (typeof node === 'number') {
    return Number.isFinite(node)
      ? { text: String(node) }
      : { error: `"${key}" is not a finite number` };
  }
  if (Array.isArray(node) && node.every((v) => typeof v === 'string')) {
    const items = node as string[];
    if (items.length === 0 || items.some((v) => !v.trim())) {
      return { error: `"${key}" resolved to an empty list or contains an empty item` };
    }
    return { text: joinList(items) };
  }
  return { error: `"${key}" is not printable (must be a string, number or list of strings)` };
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export interface RenderOptions {
  strict: boolean;
  file: string;
}

export function renderIntro(source: string, facts: Facts, options: RenderOptions): ResolvedIntro {
  const problems: Problem[] = [];
  const allowDigits = new Set<string>();
  const pages: IntroPage[] = [];
  const usedKeys = new Set<string>();
  let draft = false;

  source.split(/\r?\n/).forEach((raw, index) => {
    const lineNo = index + 1;
    const text = raw.trim();
    if (!text || text.startsWith('#')) return;

    if (text.startsWith('!')) {
      const [directive, ...args] = text.split(/\s+/);
      if (directive === '!draft' && args.length === 0) draft = true;
      else if (directive === '!allow-digits' && args.length > 0)
        args.forEach((a) => allowDigits.add(a));
      else problems.push({ line: lineNo, message: `unknown or malformed directive "${text}"` });
      return;
    }

    if (text.startsWith('==')) {
      const id = text.slice(2).trim();
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
        problems.push({ line: lineNo, message: `page id "${id}" must be kebab-case` });
      } else if (pages.some((p) => p.id === id)) {
        problems.push({ line: lineNo, message: `duplicate page id "${id}"` });
      } else {
        pages.push({ id, lines: [] });
      }
      return;
    }

    const page = pages[pages.length - 1];
    if (!page) {
      problems.push({ line: lineNo, message: 'text before the first "== page-id" line' });
      return;
    }

    const segments: IntroSegment[] = [];
    let cursor = 0;
    const pushCopy = (copy: string) => {
      if (!copy) return;
      if (/[{}]/.test(copy)) {
        problems.push({
          line: lineNo,
          message: `stray brace in "${copy}" (placeholders are {{ key }})`,
        });
      }
      for (const token of copy.split(/\s+/)) {
        const bare = token.replace(/^[^\w]+|[^\w]+$/g, '');
        if (/\d/.test(bare) && !allowDigits.has(bare)) {
          problems.push({
            line: lineNo,
            message: `digit in hand-written copy "${token}": use a placeholder, or add "!allow-digits ${bare}" if it is not a fact (FR-14)`,
          });
        }
      }
      segments.push({ kind: 'copy', text: copy });
    };

    for (const match of text.matchAll(PLACEHOLDER)) {
      pushCopy(text.slice(cursor, match.index));
      const key = match[1]!;
      const resolved = lookup(facts, key);
      if ('error' in resolved) {
        problems.push({
          line: lineNo,
          message: `unresolved placeholder {{${key}}}: ${resolved.error}`,
        });
      } else {
        segments.push({ kind: 'fact', key, text: resolved.text });
        usedKeys.add(key);
      }
      cursor = match.index + match[0].length;
    }
    pushCopy(text.slice(cursor));

    const line: IntroLine = {
      id: `${page.id}-${page.lines.length + 1}`,
      text: segments.map((s) => s.text).join(''),
      segments,
    };
    page.lines.push(line);
  });

  for (const page of pages) {
    if (page.lines.length === 0)
      problems.push({ line: 0, message: `page "${page.id}" has no lines` });
  }
  if (pages.length === 0) problems.push({ line: 0, message: 'template has no pages' });

  if (draft && options.strict) {
    problems.push({
      line: 0,
      message: 'template is marked !draft; strict builds need the final intro',
    });
  }
  if (!draft) {
    for (const alternatives of REQUIRED_INTRO_KEYS) {
      if (!alternatives.some((k) => usedKeys.has(k))) {
        problems.push({
          line: 0,
          message: `intro must state {{${alternatives.join('}} or {{')}}} (FR-12, FR-13)`,
        });
      }
    }
  }

  if (problems.length > 0) {
    const list = problems
      .map((p) => `  ${options.file}${p.line ? `:${p.line}` : ''}: ${p.message}`)
      .join('\n');
    fail(`Intro template has ${problems.length} problem(s):\n${list}`);
  }

  const characterCount = pages.reduce(
    (sum, p) => sum + p.lines.reduce((s, l) => s + l.text.length, 0),
    0,
  );

  return {
    schemaVersion: 1,
    revision: facts.source.revision,
    draft,
    pages,
    factKeys: [...usedKeys].sort(),
    characterCount,
  };
}
