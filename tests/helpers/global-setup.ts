import { readFileSync } from 'node:fs';

/**
 * Runs once per Playwright run, after the web servers have built and started. playwright.config.ts took a snapshot of
 * the independently recomputed facts before the builds began (see there). If someone committed between that moment and
 * the build, the served pages describe a different commit from the snapshot, and every fact comparison would fail for a
 * reason that has nothing to do with the app. Stop early with a clear message instead.
 */
export default async function globalSetup() {
  const file = process.env.QA_RECOMPUTED_JSON;
  if (!file) return;
  const snap = JSON.parse(readFileSync(file, 'utf8')) as { headHash: string; shortHash: string };
  for (const [name, url] of [
    ['test build', 'http://localhost:4390/facts.json'],
    ['production build', 'http://localhost:4391/facts.json'],
  ] as const) {
    const served = (await (await fetch(url)).json()) as {
      source: { commitHash: string; shortHash: string };
    };
    if (served.source.commitHash !== snap.headHash) {
      throw new Error(
        `The ${name} was built from commit ${served.source.shortHash}, but the repository was at ${snap.shortHash} ` +
          'when this run started: HEAD moved during the build. Run the suite again.',
      );
    }
  }
}
