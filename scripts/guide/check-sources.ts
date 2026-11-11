/**
 * Build-time check of src/content/guide-sources.json. Owner: architect.
 *   node scripts/guide/check-sources.ts          errors fail; age warnings print
 *   node scripts/guide/check-sources.ts --fail-stale   also fail on entries older than 90 days
 * Age uses the wall clock but never changes any output, so builds stay reproducible (NFR-9).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateGuideSources } from '../../src/guide/validate.ts';

export const SOURCES_PATH = fileURLToPath(
  new URL('../../src/content/guide-sources.json', import.meta.url),
);

function main(): number {
  const failStale = process.argv.includes('--fail-stale');
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'));
  } catch (error) {
    console.error(
      `[guide] BUILD STOPPED: cannot read src/content/guide-sources.json: ${String(error)}`,
    );
    return 1;
  }
  const today = new Date().toISOString().slice(0, 10);
  const { errors, warnings } = validateGuideSources(json, { today });
  for (const w of warnings) console.warn(`[guide] warning: ${w}`);
  const problems = failStale ? [...errors, ...warnings] : errors;
  if (problems.length > 0) {
    console.error(
      `\n[guide] BUILD STOPPED: guide-sources.json has ${problems.length} problem(s):\n` +
        problems.map((p) => `  - ${p}`).join('\n') +
        '\n',
    );
    return 1;
  }
  const channels = (json as { channels: Array<{ stateMedia?: boolean }> }).channels;
  const state = channels.filter((c) => c.stateMedia === true).length;
  console.log(`[guide] ok: ${channels.length} curated channel(s), ${state} marked state media.`);
  return 0;
}

process.exit(main());
