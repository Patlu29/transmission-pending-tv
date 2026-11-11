/**
 * WCAG 2.3.1 style flash analysis on a series of relative-luminance samples (0..1).
 * A "flash" is a pair of opposing changes, each of at least `threshold` relative luminance,
 * where the darker of the two states is below 0.80. At most 3 flashes are allowed in any 1 s.
 */
export interface FlashResult {
  maxDelta: number;
  transitions: number;
  worstFlashesPerSecond: number;
}

export function detectFlashes(series: number[], sampleHz: number, threshold = 0.1): FlashResult {
  const events: Array<{ i: number; dir: 1 | -1 }> = [];
  let maxDelta = 0;
  for (let i = 1; i < series.length; i++) {
    const d = series[i]! - series[i - 1]!;
    maxDelta = Math.max(maxDelta, Math.abs(d));
    if (Math.abs(d) >= threshold && Math.min(series[i]!, series[i - 1]!) < 0.8) {
      events.push({ i, dir: d > 0 ? 1 : -1 });
    }
  }
  // Count opposing pairs (up then down, or down then up) that end inside each 1 s window.
  const pairEnds: number[] = [];
  for (let k = 1; k < events.length; k++)
    if (events[k]!.dir !== events[k - 1]!.dir) pairEnds.push(events[k]!.i);
  let worst = 0;
  for (const end of pairEnds) {
    const inWindow = pairEnds.filter((e) => e <= end && e > end - sampleHz).length;
    worst = Math.max(worst, inWindow);
  }
  return { maxDelta, transitions: events.length, worstFlashesPerSecond: worst };
}
