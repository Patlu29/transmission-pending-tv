import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import factsJson from '../../src/generated/facts.json' with { type: 'json' };
import introJson from '../../src/generated/intro.json' with { type: 'json' };
import type { Facts, ResolvedIntro } from '../../src/facts/schema.ts';
import { parseCues } from '../../src/state/cues.ts';
import { buildFrame, type FrameInput } from '../../src/ui/teletext/frame.ts';
import { computeGrid } from '../../src/ui/teletext/grid.ts';
import { rewriteTimelineMs, type FxInput } from '../../src/ui/teletext/effects.ts';
import { letterIndices, wordRange } from '../../src/ui/teletext/effects.ts';

const facts = factsJson as unknown as Facts;
const intro = introJson as unknown as ResolvedIntro;
const cuesText = readFileSync(new URL('../../src/content/intro.cues', import.meta.url), 'utf8');
const { cues } = parseCues(cuesText, intro);
const data = { intro, facts };

function inputFor(lineId: string, fx: FxInput | null): FrameInput {
  const pageIndex = intro.pages.findIndex((p) => p.lines.some((l) => l.id === lineId));
  const lineIndex = intro.pages[pageIndex]?.lines.findIndex((l) => l.id === lineId) ?? 0;
  return {
    status: 'playing',
    blank: false,
    paused: false,
    pageIndex,
    lineIndex,
    revealedChars: Number.MAX_SAFE_INTEGER,
    diary: { kind: 'index', sub: 0 },
    diaryCursor: 0,
    pageEntry: '',
    noSuchPage: false,
    loadProgress: 1,
    assetFailed: false,
    reducedMotion: false,
    fx,
  };
}

const grids = [computeGrid(960, 720), computeGrid(324, 650), computeGrid(700, 330)];
const text = (f: ReturnType<typeof buildFrame>) =>
  f.runs.map((r) => r.map((x) => x.text).join('|'));
const factRuns = (f: ReturnType<typeof buildFrame>) =>
  f.runs.map((r) => r.filter((x) => x.kind === 'fact').map((x) => `${x.col}:${x.text}`));

describe('haunted text effects', () => {
  const effectCues = cues.filter(
    (c) => c.kind === 'tremble' || c.kind === 'rewrite' || c.kind === 'bleed',
  );

  it('has effect cues to test', () => expect(effectCues.length).toBeGreaterThan(5));

  for (const cue of effectCues) {
    const lineId = cue.anchor.lineId as string;
    const line = intro.pages.flatMap((p) => p.lines).find((l) => l.id === lineId);
    let durMs = Number(cue.params.dur) * 1000;
    if (cue.kind === 'rewrite' && line) {
      const range = wordRange(line.text, Number(cue.params.word));
      durMs = Math.max(
        durMs,
        rewriteTimelineMs(
          range ? letterIndices(line.text, range).length : 0,
          Number(cue.params.hold),
        ),
      );
    }
    const fxAt = (elapsedMs: number): FxInput => ({
      lineId,
      kind: cue.kind as FxInput['kind'],
      elapsedMs,
      durMs,
      params: {
        amp: cue.params.amp === undefined ? undefined : Number(cue.params.amp),
        word: cue.params.word === undefined ? undefined : Number(cue.params.word),
        to: cue.params.to === undefined ? undefined : String(cue.params.to),
        hold: cue.params.hold === undefined ? undefined : Number(cue.params.hold),
        rows: 1,
      },
    });

    it(`${cue.kind} on ${lineId}: settled text equals resolved text, facts never change`, () => {
      for (const grid of grids) {
        const plain = buildFrame(inputFor(lineId, null), grid, data);
        const done = buildFrame(inputFor(lineId, fxAt(durMs)), grid, data);
        expect(text(done)).toEqual(text(plain));
        expect(done.fx).toBeNull();
        for (let t = 0; t < durMs; t += 30) {
          const frame = buildFrame(inputFor(lineId, fxAt(t)), grid, data);
          expect(factRuns(frame)).toEqual(factRuns(plain));
          if (cue.kind !== 'rewrite') expect(text(frame)).toEqual(text(plain));
        }
      }
    });
  }

  it('rewrite ends exactly back on the original word and leaves other rows alone', () => {
    const cue = effectCues.find((c) => c.kind === 'rewrite');
    expect(cue).toBeDefined();
    const lineId = cue?.anchor.lineId as string;
    const grid = grids[0] as ReturnType<typeof computeGrid>;
    const plain = text(buildFrame(inputFor(lineId, null), grid, data));
    const mid = text(
      buildFrame(
        inputFor(lineId, {
          lineId,
          kind: 'rewrite',
          elapsedMs: 1500,
          durMs: 4000,
          params: {
            word: Number(cue?.params.word),
            to: String(cue?.params.to),
            hold: Number(cue?.params.hold),
          },
        }),
        grid,
        data,
      ),
    );
    expect(mid).not.toEqual(plain);
    expect(mid.filter((row, i) => row !== plain[i]).length).toBe(1);
  });

  it('no effect is drawn under reduced motion', () => {
    const cue = effectCues[0];
    const lineId = cue?.anchor.lineId as string;
    const fx: FxInput = {
      lineId,
      kind: 'tremble',
      elapsedMs: 1000,
      durMs: 3000,
      params: { amp: 0.05 },
    };
    const frame = buildFrame(
      { ...inputFor(lineId, fx), reducedMotion: true },
      grids[0] as ReturnType<typeof computeGrid>,
      data,
    );
    expect(frame.fx).toBeNull();
  });
});
