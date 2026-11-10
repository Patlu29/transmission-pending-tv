import type { TextEffect } from '@/state/hauntStore';
import type { FxInput } from './effects';

/** First (only) running text effect as a frame input, or null. */
export function toFxInput(effects: Record<string, TextEffect>): FxInput | null {
  const id = Object.keys(effects)[0];
  const e = id ? effects[id] : undefined;
  if (!id || !e) return null;
  return { lineId: id, kind: e.kind, elapsedMs: e.elapsed, durMs: e.dur * 1000, params: e.params };
}

/** Redraw tick for an effect: at most 30 Hz (--haunt-text-redraw-hz). */
export function fxTick(fx: FxInput | null, hz = 30): number {
  return fx ? Math.floor(fx.elapsedMs / (1000 / hz)) : -1;
}
