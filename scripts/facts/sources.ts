import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AgentFacts,
  PhaseFacts,
  PhaseStatus,
  ProvenanceFacts,
  StackFacts,
  StackPackageId,
} from '../../src/facts/schema.ts';
import { PATHS, ROLE_LABELS, ROOT, STACK_PACKAGES } from './config.ts';
import { fail } from './errors.ts';
import { firstAddedDate } from './git.ts';

function readRequired(relPath: string): string {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) fail(`Required fact source is missing: ${relPath}`);
  return readFileSync(abs, 'utf8');
}

function parseJson(relPath: string): unknown {
  try {
    return JSON.parse(readRequired(relPath));
  } catch (error) {
    if (error instanceof SyntaxError) fail(`${relPath} is not valid JSON: ${error.message}`);
    throw error;
  }
}

/* ---------- Stack (package.json + package-lock.json) ---------- */

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface PackageLock {
  lockfileVersion?: number;
  packages?: Record<string, { version?: string }>;
}

export function collectStack(): StackFacts {
  const pkg = parseJson(PATHS.packageJson) as PackageJson;
  const lock = parseJson(PATHS.packageLock) as PackageLock;
  if (!lock.packages || (lock.lockfileVersion ?? 0) < 2) {
    fail(`${PATHS.packageLock} must be lockfileVersion 2 or later (has a "packages" map).`);
  }
  const direct = { ...pkg.dependencies, ...pkg.devDependencies };

  const packages = STACK_PACKAGES.map(({ id, name, label }) => {
    if (!(name in direct)) fail(`Stack package "${name}" is not listed in ${PATHS.packageJson}.`);
    const version = lock.packages?.[`node_modules/${name}`]?.version;
    if (!version)
      fail(`No installed version for "${name}" in ${PATHS.packageLock}. Run npm install.`);
    return { id, name, label, version };
  });

  const versions = Object.fromEntries(packages.map((p) => [p.id, p.version])) as Record<
    StackPackageId,
    string
  >;

  return {
    packages,
    list: packages.map((p) => `${p.label} ${p.version}`),
    versions,
    directDependencyCount: Object.keys(direct).length,
    installedPackageCount: Object.keys(lock.packages).filter((k) => k.startsWith('node_modules/'))
      .length,
  };
}

/* ---------- Agents (docs/handoffs/*.md) ---------- */

export function collectAgents(): AgentFacts {
  const dir = join(ROOT, PATHS.handoffsDir);
  if (!existsSync(dir)) fail(`Required fact source is missing: ${PATHS.handoffsDir}/`);

  const entries = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const id = file.slice(0, -3);
      const relPath = `${PATHS.handoffsDir}/${file}`;
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
        fail(`${relPath}: handoff file names must be kebab-case agent ids.`);
      }
      const firstLine = readRequired(relPath)
        .split('\n')
        .find((l) => l.trim().length > 0)
        ?.trim();
      if (firstLine !== `# Handoff: ${id}`) {
        fail(`${relPath}: first line must be "# Handoff: ${id}" (found "${firstLine ?? ''}").`);
      }
      return { id, added: firstAddedDate(relPath) };
    });

  if (entries.length === 0) fail(`${PATHS.handoffsDir}/ has no handoff notes.`);

  // Order of first appearance in history; uncommitted notes last; ties by id.
  entries.sort((a, b) => {
    if (a.added !== b.added) {
      if (a.added === null) return 1;
      if (b.added === null) return -1;
      return Date.parse(a.added) - Date.parse(b.added);
    }
    return a.id.localeCompare(b.id);
  });

  const ids = entries.map((e) => e.id);
  return {
    ids,
    roles: ids.map((id) => ROLE_LABELS[id] ?? id.replace(/-/g, ' ')),
    count: ids.length,
  };
}

/* ---------- Markdown tables in docs/project-status.md ---------- */

interface Table {
  header: string[];
  rows: string[][];
  line: number;
}

/** Finds the first pipe table under `## <heading>`, or returns a reason it is unavailable. */
function findTable(markdown: string, heading: string): Table | string {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return `${PATHS.projectStatus} has no "## ${heading}" section`;

  const cells = (l: string) =>
    l
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  let i = start + 1;
  while (i < lines.length && !lines[i]!.trim().startsWith('|')) {
    if (lines[i]!.startsWith('#')) return `"## ${heading}" in ${PATHS.projectStatus} has no table`;
    i++;
  }
  if (i >= lines.length) return `"## ${heading}" in ${PATHS.projectStatus} has no table`;

  const header = cells(lines[i]!);
  const separator = lines[i + 1]?.trim() ?? '';
  if (!/^\|?\s*:?-{3,}/.test(separator)) {
    fail(`${PATHS.projectStatus}:${i + 2}: "## ${heading}" table has no separator row.`);
  }
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j]!.trim().startsWith('|'); j++) {
    const row = cells(lines[j]!);
    if (row.length !== header.length) {
      fail(
        `${PATHS.projectStatus}:${j + 1}: expected ${header.length} cells, found ${row.length}.`,
      );
    }
    rows.push(row);
  }
  return { header, rows, line: i + 1 };
}

function column(table: Table, name: string, heading: string): number {
  const index = table.header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  if (index === -1) {
    fail(`${PATHS.projectStatus}:${table.line}: "## ${heading}" table needs a "${name}" column.`);
  }
  return index;
}

const PHASE_STATUSES: readonly PhaseStatus[] = ['Not started', 'In progress', 'Done'];

export type Optional<T> = { value: T } | { unavailable: string };

export function collectPhases(): Optional<PhaseFacts> {
  const table = findTable(readRequired(PATHS.projectStatus), 'Phases');
  if (typeof table === 'string') return { unavailable: table };

  const numCol = column(table, '#', 'Phases');
  const nameCol = column(table, 'Phase', 'Phases');
  const statusCol = column(table, 'Status', 'Phases');
  if (table.rows.length === 0) fail(`${PATHS.projectStatus}: "## Phases" table is empty.`);

  const phases = table.rows.map((row, index) => {
    const where = `${PATHS.projectStatus}:${table.line + 2 + index}`;
    if (row[numCol] !== String(index + 1))
      fail(`${where}: phases must be numbered 1, 2, 3 in order.`);
    const name = row[nameCol] ?? '';
    if (!name) fail(`${where}: phase name is empty.`);
    const status = row[statusCol] as PhaseStatus;
    if (!PHASE_STATUSES.includes(status)) {
      fail(`${where}: status "${row[statusCol]}" must be one of: ${PHASE_STATUSES.join(', ')}.`);
    }
    return { name, status };
  });

  const inProgress = phases.filter((p) => p.status === 'In progress');
  if (inProgress.length > 1) fail(`${PATHS.projectStatus}: more than one phase is "In progress".`);
  const done = phases.filter((p) => p.status === 'Done').map((p) => p.name);

  return {
    value: {
      all: phases.map((p) => p.name),
      done,
      current: inProgress[0]?.name ?? null,
      doneCount: done.length,
      totalCount: phases.length,
    },
  };
}

const PROVENANCE_ITEMS = {
  tool: 'Tool',
  plugin: 'Plugin',
  pluginVersion: 'Plugin version',
  model: 'Model',
  modelId: 'Model ID',
} as const;

export function collectProvenance(commitBodies: string[]): Optional<ProvenanceFacts> {
  const heading = 'Build provenance';
  const table = findTable(readRequired(PATHS.projectStatus), heading);
  if (typeof table === 'string') return { unavailable: table };

  const itemCol = column(table, 'Item', heading);
  const valueCol = column(table, 'Value', heading);
  const lookup = new Map(
    table.rows.map((r) => [(r[itemCol] ?? '').toLowerCase(), r[valueCol] ?? '']),
  );

  const read = (label: string) => {
    const value = lookup.get(label.toLowerCase());
    if (!value) fail(`${PATHS.projectStatus}: "## ${heading}" needs a non-empty "${label}" row.`);
    return value;
  };

  const model = read(PROVENANCE_ITEMS.model);
  // Cross-check the documented model against git trailers, which the docs cannot fake.
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trailer = new RegExp(`^co-authored-by:\\s*${escaped}\\s*<`, 'im');

  return {
    value: {
      tool: read(PROVENANCE_ITEMS.tool),
      plugin: read(PROVENANCE_ITEMS.plugin),
      pluginVersion: read(PROVENANCE_ITEMS.pluginVersion),
      model,
      modelId: read(PROVENANCE_ITEMS.modelId),
      modelCoAuthoredCommitCount: commitBodies.filter((b) => trailer.test(b)).length,
    },
  };
}
