/**
 * Haunted text effects (design-spec 16.4). Pure maths: visual only. The frame
 * builder applies `rewrite` to the displayed characters and attaches tremble and
 * bleed data to the frame; the canvas and the 2D screen render them. Once an
 * effect has finished (or when none is running) the frame equals the resolved text.
 */
export type FxKind = 'tremble' | 'rewrite' | 'bleed';

export interface FxInput {
  lineId: string;
  kind: FxKind;
  elapsedMs: number;
  durMs: number;
  params: { amp?: number; word?: number; to?: string; hold?: number; rows?: number };
}

export const REWRITE_FORWARD_MS = 90;
export const REWRITE_BACK_MS = 120;

export function isActive(fx: FxInput | null | undefined): fx is FxInput {
  return !!fx && fx.elapsedMs >= 0 && fx.elapsedMs < fx.durMs;
}

/** [start, end) of the nth (from 1) space-separated token, or null. */
export function wordRange(text: string, word: number): [number, number] | null {
  let n = 0;
  let i = 0;
  while (i < text.length) {
    while (text[i] === ' ') i++;
    if (i >= text.length) break;
    const start = i;
    while (i < text.length && text[i] !== ' ') i++;
    if (++n === word) return [start, i];
  }
  return null;
}

const isLetter = (ch: string | undefined) => !!ch && /[A-Za-z]/.test(ch);

/** Indices of the letters of a token (punctuation stays untouched). */
export function letterIndices(text: string, range: [number, number]): number[] {
  const out: number[] = [];
  for (let i = range[0]; i < range[1]; i++) if (isLetter(text[i])) out.push(i);
  return out;
}

/** Total time of a rewrite: letters change forward, hold, then change back. */
export function rewriteTimelineMs(letters: number, holdS: number): number {
  return letters * REWRITE_FORWARD_MS + holdS * 1000 + letters * REWRITE_BACK_MS;
}

export interface Rewritten {
  /** Same length as the input text. */
  text: string;
  /** True for each replaced character (drawn in the strong colour). */
  replaced: boolean[];
}

/**
 * Applies a rewrite at `elapsedMs`. Never touches a fact segment: if the word
 * overlaps one, the text is returned unchanged.
 */
export function rewriteText(text: string, fact: boolean[], fx: FxInput): Rewritten {
  const none: Rewritten = { text, replaced: new Array<boolean>(text.length).fill(false) };
  const { word, to, hold } = fx.params;
  if (!isActive(fx) || word === undefined || to === undefined) return none;
  const range = wordRange(text, word);
  if (!range) return none;
  for (let i = range[0]; i < range[1]; i++) if (fact[i]) return none;
  const letters = letterIndices(text, range);
  const n = letters.length;
  const fwd = n * REWRITE_FORWARD_MS;
  const holdMs = (hold ?? 1) * 1000;
  const t = fx.elapsedMs;
  let k: number;
  if (t < fwd) k = Math.floor(t / REWRITE_FORWARD_MS) + 1;
  else if (t < fwd + holdMs) k = n;
  else k = n - (Math.floor((t - fwd - holdMs) / REWRITE_BACK_MS) + 1);
  k = Math.max(0, Math.min(n, k));
  if (k === 0) return none;
  const chars = text.split('');
  const replaced = none.replaced;
  for (let j = 0; j < k; j++) {
    const at = letters[j];
    if (at === undefined) continue;
    chars[at] = to[j] ?? ' ';
    replaced[at] = true;
  }
  return { text: chars.join(''), replaced };
}

/** FNV-1a hash, for per-glyph seeds that are the same on every Replay. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 0.5 s in, hold, 0.5 s out (sine). */
function envelope(elapsedMs: number, durMs: number): number {
  const edge = 500;
  const rise = Math.min(1, elapsedMs / edge);
  const fall = Math.min(1, (durMs - elapsedMs) / edge);
  return Math.sin((Math.max(0, Math.min(rise, fall)) * Math.PI) / 2);
}

/** Offset of one glyph in em: band-limited noise around 8 Hz, per-glyph phase. */
export function trembleOffset(
  seed: number,
  row: number,
  col: number,
  elapsedMs: number,
  durMs: number,
  amp: number,
): [number, number] {
  const h = hashSeed(`${seed}:${row}:${col}`);
  const p1 = ((h & 0xffff) / 0xffff) * Math.PI * 2;
  const p2 = (((h >>> 16) & 0xffff) / 0xffff) * Math.PI * 2;
  const t = elapsedMs / 1000;
  const e = envelope(elapsedMs, durMs) * amp;
  const dx = Math.sin(2 * Math.PI * 8 * t + p1) * 0.6 + Math.sin(2 * Math.PI * 5.3 * t + p2) * 0.4;
  const dy =
    Math.sin(2 * Math.PI * 7.1 * t + p2) * 0.6 + Math.sin(2 * Math.PI * 4.7 * t + p1) * 0.4;
  return [dx * e, dy * e];
}

/** Bleed streak look at progress p (0 to 1): alpha 0.45 falling to 0, length easing out (cubic). */
export function bleedLook(elapsedMs: number, durMs: number): { alpha: number; length: number } {
  const p = Math.max(0, Math.min(1, elapsedMs / durMs));
  return { alpha: 0.45 * (1 - p), length: 1 - Math.pow(1 - p, 3) };
}

/** Which glyphs of a line drop a streak: every third, seeded by line id. */
export function bleedsAt(lineId: string, index: number): boolean {
  return hashSeed(`${lineId}#${index}`) % 3 === 0;
}
