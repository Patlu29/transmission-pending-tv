import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import introJson from '../../src/generated/intro.json' with { type: 'json' };
import type { IntroLine, ResolvedIntro } from '../../src/facts/schema.ts';
import { parseCues } from '../../src/state/cues.ts';
import { estimateStoryDurationMs } from '../../src/state/duration.ts';

const intro = introJson as unknown as ResolvedIntro;
const { cues } = parseCues(
  readFileSync(new URL('../../src/content/intro.cues', import.meta.url), 'utf8'),
  intro,
);

/** Replaces the text of every fact segment with the given key, keeping line text consistent. */
function withFact(base: ResolvedIntro, key: string, text: string): ResolvedIntro {
  const pages = base.pages.map((p) => ({
    ...p,
    lines: p.lines.map((l): IntroLine => {
      const segments = l.segments.map((s) =>
        s.kind === 'fact' && s.key === key ? { ...s, text } : s,
      );
      return { ...l, segments, text: segments.map((s) => s.text).join('') };
    }),
  }));
  return { ...base, pages };
}

/** Projected worst case: 10 role labels, a 3-digit commit count, today's stack, a long first-commit subject. */
function worstCase(): ResolvedIntro {
  const roles =
    'product manager, architect, tech lead, UX/UI designer, scene developer, technical artist, ' +
    'frontend developer, performance optimiser, QA engineer and devops engineer';
  const subject =
    'Start the build diary: add the project brief, the licence notes and the first .gitignore file';
  let out = withFact(intro, 'agents.roles', roles);
  out = withFact(out, 'git.commitCount', '999');
  out = withFact(out, 'git.firstCommit.subject', subject);
  return out;
}

describe('story duration (FR-8: 45 to 90 s)', () => {
  it('real generated facts give at least 45 s (and stay near 65 to 75 s)', () => {
    const s = estimateStoryDurationMs(intro, cues) / 1000;
    console.log(`today's facts: ${s.toFixed(1)} s`);
    expect(s).toBeGreaterThanOrEqual(45);
    expect(s).toBeLessThanOrEqual(90);
  });

  it('the projected worst case stays at or under 85 s', () => {
    const s = estimateStoryDurationMs(worstCase(), cues) / 1000;
    console.log(`worst case: ${s.toFixed(1)} s`);
    expect(s).toBeLessThanOrEqual(85);
  });
});
