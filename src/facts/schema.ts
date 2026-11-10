/**
 * Facts contract. Owner: architect.
 *
 * These types are shared by the build-time collector (scripts/facts/) and the
 * app. Types only: no runtime code, so the scripts can import this file under
 * Node's built-in type stripping. Bump FactsSchemaVersion on breaking changes.
 *
 * See docs/architecture.md §5 for where each fact comes from.
 */

export type FactsSchemaVersion = 1;

/** Stack packages reported in the intro. Labels live in scripts/facts/config.ts. */
export type StackPackageId =
  'react' | 'three' | 'fiber' | 'drei' | 'zustand' | 'vite' | 'typescript';

export interface CommitRef {
  /** Full 40-character SHA-1. */
  hash: string;
  /** First 7 characters of `hash` (fixed length, so builds are reproducible). */
  shortHash: string;
  /** Commit subject line. */
  subject: string;
  /** Author date, ISO 8601 with the commit's own UTC offset. */
  authorDate: string;
  /** Author date as "10 November 2026", in the commit's own offset. */
  dateDisplay: string;
}

export interface SourceFacts {
  /** HEAD commit the facts were generated from. */
  commitHash: string;
  shortHash: string;
  /** `shortHash`, plus "-dirty" when the working tree had uncommitted changes. Use this in "as of commit" copy. */
  revision: string;
  dirty: boolean;
  /** HEAD committer date (ISO 8601). The facts' timestamp; never the wall clock (NFR-9). */
  commitDate: string;
}

export interface GitFacts {
  /** `git rev-list --count HEAD`. True "as of commit" `source.shortHash`. */
  commitCount: number;
  firstCommit: CommitRef;
  latestCommit: CommitRef;
  /** Every commit reachable from HEAD, oldest first (build diary, FR-15). */
  commits: CommitRef[];
  /** Number of distinct calendar days (author date, own offset) with at least one commit. */
  activeDays: number;
}

export interface StackPackage {
  id: StackPackageId;
  /** npm package name. */
  name: string;
  /** Display label, for example "three.js". */
  label: string;
  /** Exact installed version from package-lock.json. */
  version: string;
}

export interface StackFacts {
  packages: StackPackage[];
  /** Pre-formatted "Label version" strings, in `packages` order. */
  list: string[];
  versions: Record<StackPackageId, string>;
  /** Entries in package.json dependencies plus devDependencies. */
  directDependencyCount: number;
  /** Packages installed according to package-lock.json (all depths). */
  installedPackageCount: number;
}

export interface AgentFacts {
  /** Agent ids from docs/handoffs/<id>.md, ordered by the commit that first added each note. */
  ids: string[];
  /** Display names in the same order, for example "UX/UI designer". */
  roles: string[];
  count: number;
}

export type PhaseStatus = 'Not started' | 'In progress' | 'Done';

export interface PhaseFacts {
  /** Phase names in order, from the "Phases" table in docs/project-status.md. */
  all: string[];
  done: string[];
  /** The phase marked "In progress", or null if none is. */
  current: string | null;
  doneCount: number;
  totalCount: number;
}

export interface ProvenanceFacts {
  /** From the "Build provenance" table in docs/project-status.md. */
  tool: string;
  plugin: string;
  pluginVersion: string;
  model: string;
  modelId: string;
  /** Commits whose message has a `Co-Authored-By: <model> <...>` trailer (from git, not docs). */
  modelCoAuthoredCommitCount: number;
}

export interface Facts {
  schemaVersion: FactsSchemaVersion;
  source: SourceFacts;
  git: GitFacts;
  stack: StackFacts;
  agents: AgentFacts;
  /** null when docs/project-status.md has no valid "Phases" table; see `unavailable`. */
  phases: PhaseFacts | null;
  /** null when docs/project-status.md has no valid "Build provenance" table; see `unavailable`. */
  provenance: ProvenanceFacts | null;
  /** Reason per unavailable group, for example { phases: "no '## Phases' table" }. */
  unavailable: Record<string, string>;
}

/* ---------- Resolved intro (output of src/content/intro.tmpl) ---------- */

export type IntroSegment =
  | { kind: 'copy'; text: string }
  /** `key` is the placeholder path, for example "git.commitCount". Render as `data-fact={key}`. */
  | { kind: 'fact'; key: string; text: string };

export interface IntroLine {
  /** Stable id: `<pageId>-<n>`, n from 1. */
  id: string;
  /** Full line text (all segments joined). */
  text: string;
  segments: IntroSegment[];
}

export interface IntroPage {
  id: string;
  lines: IntroLine[];
}

export interface ResolvedIntro {
  schemaVersion: FactsSchemaVersion;
  /** Same as Facts.source.revision. */
  revision: string;
  /** True while the template carries the `!draft` directive (FR-12 coverage not enforced). */
  draft: boolean;
  pages: IntroPage[];
  /** Distinct placeholder keys used, sorted. */
  factKeys: string[];
  /** Total characters across all lines; input to the 30 to 60 s timing check (FR-8). */
  characterCount: number;
}
