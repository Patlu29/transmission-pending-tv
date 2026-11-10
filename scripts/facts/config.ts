import { fileURLToPath } from 'node:url';
import type { StackPackageId } from '../../src/facts/schema.ts';

/** Repository root (two levels above this file). */
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export const PATHS = {
  packageJson: 'package.json',
  packageLock: 'package-lock.json',
  handoffsDir: 'docs/handoffs',
  projectStatus: 'docs/project-status.md',
  introTemplate: 'src/content/intro.tmpl',
  outDir: 'src/generated',
} as const;

/**
 * Packages reported as "the stack". Labels are display wording, not facts;
 * versions always come from package-lock.json.
 */
export const STACK_PACKAGES: ReadonlyArray<{ id: StackPackageId; name: string; label: string }> = [
  { id: 'react', name: 'react', label: 'React' },
  { id: 'three', name: 'three', label: 'three.js' },
  { id: 'fiber', name: '@react-three/fiber', label: 'React Three Fiber' },
  { id: 'drei', name: '@react-three/drei', label: 'drei' },
  { id: 'zustand', name: 'zustand', label: 'Zustand' },
  { id: 'vite', name: 'vite', label: 'Vite' },
  { id: 'typescript', name: 'typescript', label: 'TypeScript' },
];

/** Display names for agent ids. Unknown ids fall back to the id with hyphens as spaces. */
export const ROLE_LABELS: Readonly<Record<string, string>> = {
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

/**
 * Placeholders the intro must use once it is no longer a draft (FR-12, FR-13,
 * and the user's decision to name the tool, plugin and model).
 * Each entry is a list of alternatives; at least one must appear.
 */
export const REQUIRED_INTRO_KEYS: ReadonlyArray<ReadonlyArray<string>> = [
  ['source.revision'],
  ['git.commitCount'],
  ['git.firstCommit.dateDisplay', 'git.firstCommit.authorDate'],
  ['agents.roles'],
  ['phases.all', 'phases.done'],
  ['stack.list'],
  ['provenance.tool'],
  ['provenance.plugin'],
  ['provenance.model'],
];

export const MONTHS = [
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
] as const;
