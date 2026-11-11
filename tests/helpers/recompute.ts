/**
 * Independent recomputation of every build fact (FR-11, architecture 5.7).
 *
 * This module must NOT import anything from scripts/facts/. Each fact is derived by a
 * different route from the collector: different git commands, node_modules instead of the
 * lockfile, a directory listing instead of the heading check, and its own markdown parser.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '../..');

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1', LC_ALL: 'C' },
  });
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-11-10T15:43:39+05:30" -> "10 November 2026" (date as written in the commit's own offset). */
export function displayDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** "a, b and c" (the copy's list style). */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/* Display wording (not facts). Kept here as the test's own copy. */
const STACK: Array<{ id: string; pkg: string; label: string }> = [
  { id: 'react', pkg: 'react', label: 'React' },
  { id: 'three', pkg: 'three', label: 'three.js' },
  { id: 'fiber', pkg: '@react-three/fiber', label: 'React Three Fiber' },
  { id: 'drei', pkg: '@react-three/drei', label: 'drei' },
  { id: 'zustand', pkg: 'zustand', label: 'Zustand' },
  { id: 'vite', pkg: 'vite', label: 'Vite' },
  { id: 'typescript', pkg: 'typescript', label: 'TypeScript' },
];
const ROLES: Record<string, string> = {
  'product-manager': 'product manager',
  architect: 'architect',
  'ux-ui-designer': 'UX/UI designer',
  'technical-artist': 'technical artist',
  'scene-developer': 'scene developer',
  'frontend-developer': 'frontend developer',
  'backend-developer': 'backend developer',
  'performance-optimiser': 'performance optimiser',
  'qa-engineer': 'QA engineer',
  'devops-engineer': 'DevOps engineer',
  'tech-lead': 'tech lead',
};

export interface Recomputed {
  headHash: string;
  shortHash: string;
  dirty: boolean;
  revision: string;
  commitCount: number;
  commits: Array<{ hash: string; subject: string; date: string }>;
  first: { hash: string; subject: string; dateDisplay: string; authorDate: string };
  stack: { versions: Record<string, string>; list: string[] };
  agentIds: string[];
  roles: string[];
  phases: { all: string[]; done: string[]; current: string | null };
  provenance: {
    tool: string;
    plugin: string;
    pluginVersion: string;
    model: string;
    modelId: string;
  };
  modelCoAuthored: number;
  /** Everything a `[data-fact]` or intro fact segment may show, by fact key. */
  byKey: Record<string, string>;
}

/** The test's own pipe-table parser: rows under "## <heading>" as arrays of cells. */
function tableUnder(markdown: string, heading: string): string[][] {
  const lines = markdown.split(/\r?\n/);
  const at = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (at < 0) throw new Error(`docs/project-status.md has no "## ${heading}"`);
  const rows: string[][] = [];
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (l.startsWith('#')) break;
    if (!l.startsWith('|')) {
      if (rows.length) break;
      continue;
    }
    const cells = l
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows.slice(1); // drop the header row
}

export function recompute(live = false): Recomputed {
  // A Playwright run takes one snapshot at its start (tests/helpers/global-setup.ts); see there for why.
  const snapshotFile = process.env.QA_RECOMPUTED_JSON;
  if (!live && snapshotFile && existsSync(snapshotFile)) {
    return JSON.parse(readFileSync(snapshotFile, 'utf8')) as Recomputed;
  }
  // Route 1: `git log -1 --format=%H`, not rev-parse.
  const headHash = git('log', '-1', '--format=%H').trim();

  // Route 2: count lines of `git log --format=%H <hash>`, not rev-list --count.
  const hashes = git('log', '--format=%H', headHash).split('\n').filter(Boolean);
  const commitCount = hashes.length;

  // Commits oldest first, via a tab-separated log.
  const commits = git('log', '--format=%H%x09%aI%x09%s', headHash)
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [hash = '', date = '', ...rest] = l.split('\t');
      return { hash, date, subject: rest.join('\t') };
    })
    .reverse();

  // Route 3: the root commit via --max-parents=0, then `git show -s`.
  const roots = git('rev-list', '--max-parents=0', headHash).split('\n').filter(Boolean);
  const rootHash = roots[roots.length - 1]!;
  const authorDate = git('show', '-s', '--format=%aI', rootHash).trim();
  const first = {
    hash: rootHash,
    subject: git('show', '-s', '--format=%s', rootHash).trim(),
    dateDisplay: displayDate(authorDate),
    authorDate,
  };

  // Dirty: tracked changes via diff-index, untracked via ls-files (the collector uses `status`).
  let dirty = false;
  try {
    git('diff-index', '--quiet', 'HEAD', '--');
  } catch {
    dirty = true;
  }
  if (git('ls-files', '--others', '--exclude-standard').trim().length > 0) dirty = true;
  const shortHash = headHash.slice(0, 7);
  const revision = dirty ? `${shortHash}-dirty` : shortHash;

  // Stack: node_modules/<pkg>/package.json, cross-checked against the exact pin in package.json.
  const pkgJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const pins = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  const versions: Record<string, string> = {};
  for (const s of STACK) {
    const installed = (
      JSON.parse(readFileSync(join(ROOT, 'node_modules', s.pkg, 'package.json'), 'utf8')) as {
        version: string;
      }
    ).version;
    const pin = pins[s.pkg];
    if (pin !== installed) {
      throw new Error(`${s.pkg}: package.json pins "${pin}" but node_modules has ${installed}`);
    }
    versions[s.id] = installed;
  }
  const list = STACK.map((s) => `${s.label} ${versions[s.id]}`);

  // Agents: directory listing (set), ordered by the first commit that added each note.
  const dir = join(ROOT, 'docs/handoffs');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    const first = readFileSync(join(dir, f), 'utf8')
      .split('\n')
      .find((l) => l.trim())
      ?.trim();
    if (first !== `# Handoff: ${f.slice(0, -3)}`) throw new Error(`bad handoff heading in ${f}`);
  }
  // One pass over history, oldest first: the first "@date" block that lists a file wins.
  const added = new Map<string, string>();
  let curDate = '';
  for (const line of git(
    'log',
    '--reverse',
    '--diff-filter=A',
    '--name-only',
    '--format=@%aI',
    '--',
    'docs/handoffs',
  ).split('\n')) {
    if (line.startsWith('@')) curDate = line.slice(1);
    else if (line.trim() && !added.has(line.trim())) added.set(line.trim(), curDate);
  }
  const ordered = files
    .map((f) => ({ id: f.slice(0, -3), added: added.get(`docs/handoffs/${f}`) ?? null }))
    .sort((a, b) => {
      if (a.added !== b.added) {
        if (a.added === null) return 1;
        if (b.added === null) return -1;
        return Date.parse(a.added) - Date.parse(b.added);
      }
      return a.id.localeCompare(b.id);
    });
  const agentIds = ordered.map((o) => o.id);
  const roles = agentIds.map((id) => ROLES[id] ?? id.replace(/-/g, ' '));

  // Phases and provenance: the test's own parser.
  const status = readFileSync(join(ROOT, 'docs/project-status.md'), 'utf8');
  const phaseRows = tableUnder(status, 'Phases');
  const phases = {
    all: phaseRows.map((r) => r[1]!),
    done: phaseRows.filter((r) => r[2] === 'Done').map((r) => r[1]!),
    current: phaseRows.find((r) => r[2] === 'In progress')?.[1] ?? null,
  };
  const prov = new Map(
    tableUnder(status, 'Build provenance').map((r) => [r[0]!.toLowerCase(), r[1]!]),
  );
  const provenance = {
    tool: prov.get('tool')!,
    plugin: prov.get('plugin')!,
    pluginVersion: prov.get('plugin version')!,
    model: prov.get('model')!,
    modelId: prov.get('model id')!,
  };

  // Co-author trailers via git's trailer formatter (the collector uses a regex over bodies).
  const trailerBlocks = git(
    'log',
    '--format=%x01%(trailers:key=Co-authored-by,valueonly,separator=%x1f)',
    headHash,
  )
    .split('\x01')
    .slice(1);
  const modelCoAuthored = trailerBlocks.filter((b) =>
    b.split('\x1f').some((t) => t.trim().startsWith(`${provenance.model} <`)),
  ).length;

  const byKey: Record<string, string> = {
    'source.revision': revision,
    'git.commitCount': String(commitCount),
    'git.firstCommit.dateDisplay': first.dateDisplay,
    'git.firstCommit.subject': first.subject,
    'provenance.tool': provenance.tool,
    'provenance.plugin': provenance.plugin,
    'provenance.pluginVersion': provenance.pluginVersion,
    'provenance.model': provenance.model,
    'provenance.modelId': provenance.modelId,
    'provenance.modelCoAuthoredCommitCount': String(modelCoAuthored),
    'agents.roles': joinList(roles),
    'phases.all': joinList(phases.all),
    'phases.done': joinList(phases.done),
    'stack.list': joinList(list),
  };

  return {
    headHash,
    shortHash,
    dirty,
    revision,
    commitCount,
    commits,
    first,
    stack: { versions, list },
    agentIds,
    roles,
    phases,
    provenance,
    modelCoAuthored,
    byKey,
  };
}

export interface FactsJson {
  source: { commitHash: string; shortHash: string; revision: string; dirty: boolean };
  git: {
    commitCount: number;
    firstCommit: { hash: string; subject: string; dateDisplay: string; authorDate: string };
    commits: Array<{ hash: string; subject: string; authorDate: string; shortHash: string }>;
  };
  stack: { versions: Record<string, string>; list: string[] };
  agents: { ids: string[]; roles: string[]; count: number };
  phases: { all: string[]; done: string[]; current: string | null } | null;
  provenance: {
    tool: string;
    plugin: string;
    pluginVersion: string;
    model: string;
    modelId: string;
    modelCoAuthoredCommitCount: number;
  } | null;
}

/** Every difference between the shipped facts and the recomputed values (empty means equal). */
export function diffFacts(f: FactsJson, r: Recomputed): string[] {
  const out: string[] = [];
  const eq = (name: string, actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      out.push(
        `${name}: shipped ${JSON.stringify(actual)?.slice(0, 160)}, recomputed ${JSON.stringify(expected)?.slice(0, 160)}`,
      );
    }
  };
  eq('source.commitHash (stale build?)', f.source.commitHash, r.headHash);
  eq('source.shortHash', f.source.shortHash, r.shortHash);
  eq('source.revision', f.source.revision, r.revision);
  eq('git.commitCount', f.git.commitCount, r.commitCount);
  eq('git.firstCommit.hash', f.git.firstCommit.hash, r.first.hash);
  eq('git.firstCommit.subject', f.git.firstCommit.subject, r.first.subject);
  eq('git.firstCommit.dateDisplay', f.git.firstCommit.dateDisplay, r.first.dateDisplay);
  eq('git.firstCommit.authorDate', f.git.firstCommit.authorDate, r.first.authorDate);
  eq(
    'git.commits (hash, date, subject)',
    f.git.commits.map((c) => [c.hash, c.authorDate, c.subject]),
    r.commits.map((c) => [c.hash, c.date, c.subject]),
  );
  eq('stack.versions', f.stack.versions, r.stack.versions);
  eq('stack.list', f.stack.list, r.stack.list);
  eq('agents.ids', f.agents.ids, r.agentIds);
  eq('agents.roles', f.agents.roles, r.roles);
  eq('agents.count', f.agents.count, r.agentIds.length);
  eq(
    'phases',
    f.phases && { all: f.phases.all, done: f.phases.done, current: f.phases.current },
    r.phases,
  );
  eq(
    'provenance',
    f.provenance && {
      tool: f.provenance.tool,
      plugin: f.provenance.plugin,
      pluginVersion: f.provenance.pluginVersion,
      model: f.provenance.model,
      modelId: f.provenance.modelId,
    },
    r.provenance,
  );
  eq(
    'provenance.modelCoAuthoredCommitCount',
    f.provenance?.modelCoAuthoredCommitCount,
    r.modelCoAuthored,
  );
  return out;
}

export function readDistFacts(distDir = 'dist'): FactsJson {
  const p = join(ROOT, distDir, 'facts.json');
  if (!existsSync(p)) throw new Error(`${p} is missing. Run "npm run build" first.`);
  return JSON.parse(readFileSync(p, 'utf8')) as FactsJson;
}

export interface IntroJson {
  pages: Array<{
    id: string;
    lines: Array<{
      id: string;
      text: string;
      segments: Array<{ kind: 'copy' | 'fact'; key?: string; text: string }>;
    }>;
  }>;
  factKeys: string[];
}

export function readDistIntro(distDir = 'dist'): IntroJson {
  const p = join(ROOT, distDir, 'intro.json');
  if (!existsSync(p)) throw new Error(`${p} is missing. Run "npm run build" first.`);
  return JSON.parse(readFileSync(p, 'utf8')) as IntroJson;
}
