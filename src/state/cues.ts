import type { ResolvedIntro } from '../facts/schema.ts';
import { letterIndices, wordRange } from '../ui/teletext/effects.ts';
import { HAUNT_MIN_STEP_S } from './timing.ts';

/**
 * Parser for src/content/intro.cues (design-spec 16.3). Pure: takes the file
 * text and the resolved intro, returns validated cues plus errors. Unknown
 * anchors, cues or keys are errors; out-of-range values are clamped with a warning.
 */
export const STATE_CUES = ['ghost', 'ghost-near', 'creep', 'dim', 'shadow', 'hum'] as const;
export const EVENT_CUES = ['tremble', 'rewrite', 'bleed', 'roll', 'knob'] as const;
export type StateCueKind = (typeof STATE_CUES)[number];
export type EventCueKind = (typeof EVENT_CUES)[number];
export type CueKind = StateCueKind | EventCueKind;

export interface CueAnchor {
  pageId: string;
  /** Line id (`<page>-<n>`), or null for a page anchor. */
  lineId: string | null;
  lineNumber: number | null;
  end: boolean;
  offsetS: number;
}

export type CueParams = Record<string, number | string>;

export interface Cue {
  /** Position in the file's cue order. */
  index: number;
  /** 1-based line number in the file. */
  fileLine: number;
  anchor: CueAnchor;
  kind: CueKind;
  params: CueParams;
}

export interface CueParseResult {
  cues: Cue[];
  errors: string[];
  warnings: string[];
}

type Spec = Record<
  string,
  {
    min?: number;
    max?: number;
    required: boolean;
    kind: 'number' | 'string' | 'enum';
    values?: string[];
  }
>;

const num = (min: number, max: number, required = true) => ({
  min,
  max,
  required,
  kind: 'number' as const,
});

const SPECS: Record<CueKind, Spec> = {
  ghost: { to: num(0, 1), over: num(HAUNT_MIN_STEP_S, 60) },
  'ghost-near': { to: num(0, 1), over: num(HAUNT_MIN_STEP_S, 60) },
  creep: { to: num(0, 1), over: num(HAUNT_MIN_STEP_S, 60) },
  dim: { to: num(0, 1), over: num(HAUNT_MIN_STEP_S, 60) },
  shadow: { to: num(0, 1), over: num(HAUNT_MIN_STEP_S, 60) },
  hum: { to: num(0, 1), over: num(HAUNT_MIN_STEP_S, 60) },
  tremble: { amp: num(0.02, 0.08), dur: num(1.5, 5) },
  rewrite: {
    word: num(1, 200),
    to: { required: true, kind: 'string' },
    hold: num(0.8, 2),
    dur: num(2, 4),
  },
  bleed: { dur: num(3, 6), rows: num(1, 1, false) },
  roll: { dur: num(1.5, 3) },
  knob: {
    which: { required: true, kind: 'enum', values: ['channel', 'volume'] },
    deg: num(-60, 60),
    over: num(HAUNT_MIN_STEP_S, 60),
  },
};

function parseAnchor(token: string, intro: ResolvedIntro): CueAnchor | string {
  let rest = token;
  let offsetS = 0;
  const plus = rest.lastIndexOf('+');
  if (plus >= 0) {
    const n = Number(rest.slice(plus + 1));
    if (!Number.isFinite(n) || n < 0) return `bad offset in anchor "${token}"`;
    offsetS = n;
    rest = rest.slice(0, plus);
  }
  let end = false;
  if (rest.endsWith('@end')) {
    end = true;
    rest = rest.slice(0, -4);
  }
  const page = intro.pages.find((p) => p.id === rest);
  if (page) return { pageId: page.id, lineId: null, lineNumber: null, end, offsetS };
  for (const p of intro.pages) {
    if (!rest.startsWith(`${p.id}-`)) continue;
    const n = Number(rest.slice(p.id.length + 1));
    if (Number.isInteger(n) && p.lines.some((l) => l.id === rest)) {
      return { pageId: p.id, lineId: rest, lineNumber: n, end, offsetS };
    }
  }
  return `unknown anchor "${token}" (no such page or line id)`;
}

export function parseCues(text: string, intro: ResolvedIntro): CueParseResult {
  const cues: Cue[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    const at = `intro.cues:${i + 1}`;
    const [anchorToken, kindToken, ...pairs] = line.split(/\s+/);
    if (!anchorToken || !kindToken)
      return void errors.push(`${at}: expected "<anchor> <cue> [key=value ...]"`);

    const anchor = parseAnchor(anchorToken, intro);
    if (typeof anchor === 'string') return void errors.push(`${at}: ${anchor}`);

    const kind = [...STATE_CUES, ...EVENT_CUES].find((k) => k === kindToken);
    if (!kind) return void errors.push(`${at}: unknown cue "${kindToken}"`);
    const spec = SPECS[kind];

    const params: CueParams = {};
    let ok = true;
    for (const pair of pairs) {
      const eq = pair.indexOf('=');
      const key = eq < 0 ? pair : pair.slice(0, eq);
      const value = eq < 0 ? '' : pair.slice(eq + 1);
      const def = spec[key];
      if (!def) {
        errors.push(`${at}: unknown key "${key}" for cue "${kind}"`);
        ok = false;
        continue;
      }
      if (def.kind === 'number') {
        const n = Number(value);
        if (value === '' || !Number.isFinite(n)) {
          errors.push(`${at}: "${key}" must be a number`);
          ok = false;
          continue;
        }
        const clamped = Math.min(def.max ?? n, Math.max(def.min ?? n, n));
        if (clamped !== n) warnings.push(`${at}: "${key}=${n}" clamped to ${clamped}`);
        params[key] = clamped;
      } else if (def.kind === 'enum') {
        if (!def.values?.includes(value)) {
          errors.push(`${at}: "${key}" must be one of ${def.values?.join(', ')}`);
          ok = false;
        } else params[key] = value;
      } else params[key] = value;
    }
    for (const [key, def] of Object.entries(spec)) {
      if (def.required && params[key] === undefined) {
        errors.push(`${at}: cue "${kind}" needs "${key}"`);
        ok = false;
      }
    }

    // Anchor rules per cue.
    if (
      (kind === 'tremble' || kind === 'rewrite' || kind === 'bleed') &&
      (!anchor.lineId || !anchor.end)
    ) {
      errors.push(`${at}: "${kind}" needs a line anchor ending in @end (page-n@end)`);
      ok = false;
    }
    if (kind === 'roll') {
      const page = intro.pages.find((p) => p.id === anchor.pageId);
      const last = page?.lines[page.lines.length - 1]?.id;
      const onLastLine = anchor.lineId === null || anchor.lineId === last;
      if (!anchor.end || !onLastLine || anchor.offsetS > 4) {
        errors.push(
          `${at}: "roll" must anchor at the @end of a page's last line, offset 4 s or less`,
        );
        ok = false;
      }
    }
    if (kind === 'rewrite' && ok && anchor.lineId) {
      const ln = intro.pages.flatMap((p) => p.lines).find((l) => l.id === anchor.lineId);
      const range = ln ? wordRange(ln.text, Number(params.word)) : null;
      const to = String(params.to);
      if (!ln || !range) {
        errors.push(
          `${at}: rewrite word=${String(params.word)} does not exist in ${anchor.lineId}`,
        );
        ok = false;
      } else {
        const letters = letterIndices(ln.text, range);
        let pos = 0;
        const factChars: boolean[] = [];
        for (const seg of ln.segments) {
          for (let c = 0; c < seg.text.length; c++) factChars[pos++] = seg.kind === 'fact';
        }
        if (factChars.slice(range[0], range[1]).some(Boolean)) {
          errors.push(
            `${at}: rewrite may not touch a fact segment (${anchor.lineId} word ${String(params.word)})`,
          );
          ok = false;
        }
        if (!/^[A-Za-z]+$/.test(to)) {
          errors.push(`${at}: rewrite "to" must be letters only (no digits)`);
          ok = false;
        } else if (to.length > letters.length) {
          errors.push(`${at}: rewrite "to" has more letters than the original word`);
          ok = false;
        } else params.to = to.toUpperCase();
      }
    }

    if (ok) cues.push({ index: cues.length, fileLine: i + 1, anchor, kind, params });
  });

  if (cues.filter((c) => c.kind === 'roll').length > 2)
    errors.push('intro.cues: at most two "roll" cues');
  if (cues.filter((c) => c.kind === 'knob').length > 2)
    warnings.push('intro.cues: more than two "knob" cues');
  return { cues, errors, warnings };
}

export const isStateCue = (k: CueKind): k is StateCueKind =>
  (STATE_CUES as readonly string[]).includes(k);
