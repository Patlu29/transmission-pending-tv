import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ROOT,
  diffFacts,
  readDistFacts,
  readDistIntro,
  recompute,
  type FactsJson,
  type IntroJson,
  type Recomputed,
} from '../helpers/recompute.ts';

/**
 * US-6 AC1, FR-11, architecture 5.7: recompute each fact by a route that is different from
 * the collector and compare with the BUILT artefact (dist/facts.json, dist/intro.json).
 * This file must not import scripts/facts/* (ESLint enforces it).
 */
let r: Recomputed;
let facts: FactsJson;
let intro: IntroJson;

beforeAll(() => {
  r = recompute();
  facts = readDistFacts();
  intro = readDistIntro();
});

describe('dist/facts.json equals the independently recomputed facts', () => {
  it('the build is not stale: its commit is the current HEAD (git log -1)', () => {
    expect(facts.source.commitHash).toBe(r.headHash);
  });

  it('commit count equals the number of lines of `git log --format=%H <hash>`', () => {
    expect(facts.git.commitCount).toBe(r.commitCount);
  });

  it('first commit (root via rev-list --max-parents=0) matches hash, subject and date', () => {
    expect(facts.git.firstCommit.hash).toBe(r.first.hash);
    expect(facts.git.firstCommit.subject).toBe(r.first.subject);
    expect(facts.git.firstCommit.dateDisplay).toBe(r.first.dateDisplay);
  });

  it('every commit in the diary matches the git log, in order', () => {
    expect(facts.git.commits.map((c) => [c.hash, c.subject, c.authorDate])).toEqual(
      r.commits.map((c) => [c.hash, c.subject, c.date]),
    );
  });

  it('stack versions equal node_modules/<pkg>/package.json and the exact pins', () => {
    expect(facts.stack.versions).toEqual(r.stack.versions);
    expect(facts.stack.list).toEqual(r.stack.list);
  });

  it('agent ids equal the handoff directory listing (set), in first-commit order', () => {
    expect([...facts.agents.ids].sort()).toEqual([...r.agentIds].sort());
    expect(facts.agents.ids).toEqual(r.agentIds);
    expect(facts.agents.roles).toEqual(r.roles);
  });

  it('phases and provenance equal the test parser over docs/project-status.md', () => {
    expect(facts.phases).toMatchObject(r.phases);
    expect(facts.provenance).toMatchObject(r.provenance);
  });

  it('modelCoAuthoredCommitCount equals git trailers counted with %(trailers)', () => {
    expect(facts.provenance?.modelCoAuthoredCommitCount).toBe(r.modelCoAuthored);
  });

  it('revision is the short hash, with -dirty exactly when the tree has changes', () => {
    expect(facts.source.revision).toBe(r.revision);
  });

  it('the whole facts file has no difference at all', () => {
    expect(diffFacts(facts, r)).toEqual([]);
  });
});

describe('dist/intro.json fact segments equal the recomputed values', () => {
  const facts_ = () =>
    intro.pages.flatMap((p) =>
      p.lines.flatMap((l) =>
        l.segments.filter((s) => s.kind === 'fact').map((s) => ({ line: l.id, ...s })),
      ),
    );

  it('every fact segment shows exactly the recomputed text for its key', () => {
    const wrong: string[] = [];
    for (const s of facts_()) {
      const expected = r.byKey[s.key ?? ''];
      if (expected === undefined) wrong.push(`${s.line}: unknown fact key ${s.key}`);
      else if (expected !== s.text) wrong.push(`${s.line} ${s.key}: "${s.text}" vs "${expected}"`);
    }
    expect(wrong).toEqual([]);
  });

  it('FR-12 and FR-13: the story carries every required fact', () => {
    const keys = new Set(facts_().map((s) => s.key));
    for (const k of [
      'source.revision',
      'git.commitCount',
      'git.firstCommit.dateDisplay',
      'agents.roles',
      'phases.all',
      'phases.done',
      'stack.list',
      'provenance.tool',
      'provenance.plugin',
      'provenance.model',
    ]) {
      expect(keys.has(k), `fact ${k} appears in the story`).toBe(true);
    }
  });

  it('US-5 AC4: the commit count line says "as of commit <hash>" with the revision', () => {
    const line = intro.pages
      .flatMap((p) => p.lines)
      .find((l) => l.segments.some((s) => s.key === 'git.commitCount'));
    expect(line, 'a line states the commit count').toBeDefined();
    const text = line!.text;
    // The line itself or its neighbour must carry "AS OF COMMIT <revision>".
    const all = intro.pages.flatMap((p) => p.lines);
    const near = [all[all.indexOf(line!)]!, all[all.indexOf(line!) + 1]]
      .map((l) => l?.text ?? '')
      .join(' ');
    expect(near.toUpperCase()).toContain(`AS OF COMMIT ${r.revision.toUpperCase()}`);
    expect(text).toContain(String(r.commitCount));
  });

  it('every fact that depends on the commit count is true at that revision', () => {
    // `git rev-list --count <hash>` (US-5 AC5), a third route to the same number.
    const out = execRevList(r.shortHash);
    expect(out).toBe(r.commitCount);
  });

  it('US-6 AC3 (Should): hand-written copy carries no digit outside the allow-list', () => {
    const tmpl = readFileSync(join(ROOT, 'src/content/intro.tmpl'), 'utf8');
    const allowed = new Set(
      tmpl
        .split('\n')
        .filter((l) => l.startsWith('!allow-digits'))
        .flatMap((l) => l.split(/\s+/).slice(1)),
    );
    const offenders: string[] = [];
    for (const p of intro.pages) {
      for (const l of p.lines) {
        for (const s of l.segments) {
          if (s.kind !== 'copy') continue;
          for (const tok of s.text.split(/\s+/)) {
            if (/\d/.test(tok) && ![...allowed].some((a) => tok.includes(a)))
              offenders.push(`${l.id}: ${tok}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the comparison itself catches drift (US-6 AC2)', () => {
  it('flags a changed stack version, commit count, hash and role list', () => {
    const tampered = structuredClone(facts);
    tampered.stack.versions.react = '0.0.1';
    tampered.git.commitCount = 9999;
    tampered.source.commitHash = '0'.repeat(40);
    tampered.agents.roles = [...tampered.agents.roles, 'ghost'];
    const diffs = diffFacts(tampered, r).join('\n');
    expect(diffs).toContain('stack.versions');
    expect(diffs).toContain('git.commitCount');
    expect(diffs).toContain('source.commitHash');
    expect(diffs).toContain('agents.roles');
  });

  it('dist/facts.json is a regular build output (exists and parses)', () => {
    expect(existsSync(join(ROOT, 'dist/facts.json'))).toBe(true);
  });
});

import { execFileSync } from 'node:child_process';
function execRevList(rev: string): number {
  return Number(
    execFileSync('git', ['rev-list', '--count', rev], { cwd: ROOT, encoding: 'utf8' }).trim(),
  );
}
