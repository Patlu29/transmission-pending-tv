import { execFileSync } from 'node:child_process';
import type { CommitRef, GitFacts, SourceFacts } from '../../src/facts/schema.ts';
import { MONTHS, ROOT } from './config.ts';
import { fail } from './errors.ts';

const FIELD = '\x1f';
const RECORD = '\x1e';

/** Runs git in the repo root with settings that make output stable across machines. */
export function git(args: string[]): string {
  try {
    return execFileSync(
      'git',
      ['-c', 'log.showSignature=false', '-c', 'core.quotepath=off', ...args],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Replace refs and grafts can rewrite history as seen by log; ignore them.
          GIT_NO_REPLACE_OBJECTS: '1',
          LC_ALL: 'C',
        },
      },
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    if (err.code === 'ENOENT') {
      fail('git is not installed or not on PATH. The facts pipeline needs git at build time.');
    }
    fail(`git ${args.join(' ')} failed: ${(err.stderr ?? err.message).trim()}`);
  }
}

/**
 * Fails loudly when git history cannot be trusted. Counting commits in a
 * shallow or exported checkout would produce a confident, wrong number.
 */
export function assertTrustworthyHistory(): void {
  let inside: string;
  try {
    inside = git(['rev-parse', '--is-inside-work-tree']).trim();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('git is not installed')) throw error;
    fail(
      'Not a git work tree. The build must run from a git clone, not a tarball or export, ' +
        'because intro facts come from git history.',
    );
  }
  if (inside !== 'true') fail('Not inside a git work tree.');

  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    fail(
      'Shallow clone detected: commit counts and the first-commit date would be wrong. ' +
        'Fetch full history ("git fetch --unshallow", or actions/checkout with fetch-depth: 0).',
    );
  }

  try {
    git(['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']);
  } catch {
    fail('HEAD does not point at a commit. Make at least one commit before building.');
  }
}

export function formatDisplayDate(isoWithOffset: string): string {
  // Use the date as written in the commit's own offset; no timezone conversion.
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(isoWithOffset);
  if (!match) fail(`Unexpected git date format: "${isoWithOffset}"`);
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) fail(`Unexpected month in git date: "${isoWithOffset}"`);
  return `${Number(day)} ${monthName} ${year}`;
}

interface RawCommit extends CommitRef {
  body: string;
}

function readCommits(): RawCommit[] {
  const out = git([
    'log',
    '--reverse',
    `--format=%H${FIELD}%aI${FIELD}%s${FIELD}%B${RECORD}`,
    'HEAD',
  ]);
  return out
    .split(RECORD)
    .map((chunk) => chunk.replace(/^\n/, ''))
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const [hash = '', authorDate = '', subject = '', body = ''] = chunk.split(FIELD);
      if (!/^[0-9a-f]{40}$/.test(hash))
        fail(`Could not parse git log entry: "${chunk.slice(0, 80)}"`);
      return {
        hash,
        shortHash: hash.slice(0, 7),
        subject,
        authorDate,
        dateDisplay: formatDisplayDate(authorDate),
        body,
      };
    });
}

export interface GitCollection {
  source: SourceFacts;
  git: GitFacts;
  /** Full messages, used only for the co-author cross-check. Not written to the bundle. */
  bodies: string[];
}

export function collectGit(): GitCollection {
  assertTrustworthyHistory();

  const head = git(['rev-parse', 'HEAD']).trim();
  const commitDate = git(['show', '-s', '--format=%cI', 'HEAD']).trim();
  const dirty = git(['status', '--porcelain=v1', '--untracked-files=normal']).trim().length > 0;
  const count = Number(git(['rev-list', '--count', 'HEAD']).trim());

  const raw = readCommits();
  if (!Number.isInteger(count) || count < 1) fail(`git rev-list --count returned "${count}".`);
  if (raw.length !== count) {
    fail(`git log returned ${raw.length} commits but rev-list counts ${count}. Refusing to guess.`);
  }

  const commits: CommitRef[] = raw.map((c) => ({
    hash: c.hash,
    shortHash: c.shortHash,
    subject: c.subject,
    authorDate: c.authorDate,
    dateDisplay: c.dateDisplay,
  }));
  const first = commits[0];
  const latest = commits[commits.length - 1];
  if (!first || !latest) fail('No commits found.');
  if (latest.hash !== head) {
    fail(`Newest logged commit ${latest.shortHash} is not HEAD ${head.slice(0, 7)}.`);
  }

  const activeDays = new Set(commits.map((c) => c.authorDate.slice(0, 10))).size;
  const shortHash = head.slice(0, 7);

  return {
    source: {
      commitHash: head,
      shortHash,
      revision: dirty ? `${shortHash}-dirty` : shortHash,
      dirty,
      commitDate,
    },
    git: { commitCount: count, firstCommit: first, latestCommit: latest, commits, activeDays },
    bodies: raw.map((c) => c.body),
  };
}

/** Author date of the commit that first added `path`, or null if it is not committed yet. */
export function firstAddedDate(path: string): string | null {
  const out = git(['log', '--diff-filter=A', '--reverse', '--format=%aI', '--', path]).trim();
  return out.split('\n')[0] || null;
}
