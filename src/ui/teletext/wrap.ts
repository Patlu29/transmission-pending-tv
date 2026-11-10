import type { IntroLine } from '@/facts/schema';

/** Word wrap on a plain string. Returns [start, end) ranges; hard-breaks words longer than `width`. */
export function wrapRanges(text: string, width: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const w = Math.max(1, width);
  const n = text.length;
  let i = 0;
  while (i < n) {
    while (i < n && text[i] === ' ' && out.length > 0) i++;
    if (i >= n) break;
    if (n - i <= w) {
      out.push([i, n]);
      break;
    }
    const k = text.lastIndexOf(' ', i + w);
    if (k > i) {
      out.push([i, k]);
      i = k + 1;
    } else {
      out.push([i, i + w]);
      i += w;
    }
  }
  if (out.length === 0) out.push([0, 0]);
  return out;
}

export interface FlatLine {
  text: string;
  /** True for each character that belongs to a fact segment. */
  fact: boolean[];
}

const flatCache = new WeakMap<IntroLine, FlatLine>();

export function flattenLine(line: IntroLine): FlatLine {
  const hit = flatCache.get(line);
  if (hit) return hit;
  const fact: boolean[] = [];
  let text = '';
  for (const seg of line.segments) {
    text += seg.text;
    for (let i = 0; i < seg.text.length; i++) fact.push(seg.kind === 'fact');
  }
  const flat = { text, fact };
  flatCache.set(line, flat);
  return flat;
}

export function wrappedHeight(line: IntroLine, cols: number): number {
  return wrapRanges(flattenLine(line).text, cols).length;
}
