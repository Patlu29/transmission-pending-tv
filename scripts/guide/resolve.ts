/**
 * Guide resolver CLI, called by the scheduled guide workflow (devops). Owner: architect.
 *
 *   YOUTUBE_API_KEY=... node scripts/guide/resolve.ts \
 *     --out dist/guide.json \
 *     --release v2.0.0 \
 *     [--previous https://<site>/guide.json | path]   last published guide (default: none)
 *     [--ledger .guide-cache/ledger.json]             quota ledger, read and rewritten
 *     [--sources src/content/guide-sources.json]
 *
 *   YOUTUBE_API_KEY=... node scripts/guide/resolve.ts --lookup @handle   (curation: prints the channel id)
 *
 * The key is read from the environment only; there is no flag for it. Exit codes:
 *   0  guide written (possibly degraded: stale or unresolved entries, see the log)
 *   1  configuration error (no key, invalid sources, bad arguments, unwritable output); nothing written
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { parseArgs } from 'node:util';
import { asGuideSources, parseGuide, validateGuideSources } from '../../src/guide/validate.ts';
import { resolveGuide, type Ledger } from './resolve-core.ts';
import { createYouTubeApi } from './youtube.ts';

function fail(message: string): never {
  console.error(`[guide] ERROR: ${message}`);
  process.exit(1);
}

async function readPrevious(from: string | undefined): Promise<unknown> {
  if (!from) return null;
  try {
    if (/^https:\/\//.test(from)) {
      const res = await fetch(from, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        console.warn(`[guide] previous guide: HTTP ${res.status}; starting without it`);
        return null;
      }
      return await res.json();
    }
    return existsSync(from) ? JSON.parse(readFileSync(from, 'utf8')) : null;
  } catch (error) {
    console.warn(`[guide] previous guide unreadable (${String(error)}); starting without it`);
    return null;
  }
}

function readLedger(path: string | undefined): Ledger | null {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Ledger;
  } catch {
    console.warn('[guide] ledger unreadable; starting a fresh one');
    return null;
  }
}

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: 'string' },
      release: { type: 'string' },
      previous: { type: 'string' },
      ledger: { type: 'string' },
      sources: { type: 'string', default: 'src/content/guide-sources.json' },
      lookup: { type: 'string' },
    },
    strict: true,
  });

  const key = process.env.YOUTUBE_API_KEY ?? '';
  if (!key)
    fail(
      'YOUTUBE_API_KEY is not set (it must come from the environment, for example an Actions secret).',
    );
  const api = createYouTubeApi(key);

  if (values.lookup) {
    const id = await api.lookupHandle(values.lookup);
    console.log(id ?? `no channel found for ${values.lookup}`);
    return;
  }

  if (!values.out) fail('--out is required');
  if (!values.release) fail('--release is required');

  let sourcesJson: unknown;
  try {
    sourcesJson = JSON.parse(readFileSync(resolvePath(values.sources!), 'utf8'));
  } catch (error) {
    fail(`cannot read sources: ${String(error)}`);
  }
  const report = validateGuideSources(sourcesJson, {
    today: new Date().toISOString().slice(0, 10),
  });
  if (report.errors.length > 0) fail(`invalid sources:\n  - ${report.errors.join('\n  - ')}`);
  report.warnings.forEach((w) => console.warn(`[guide] warning: ${w}`));

  const result = await resolveGuide({
    sources: asGuideSources(sourcesJson),
    previous: await readPrevious(values.previous),
    ledger: readLedger(values.ledger),
    api,
    now: new Date(),
    release: values.release,
  });

  const text = `${JSON.stringify(result.guide, null, 2)}\n`;
  // Self-checks before anything is written.
  if (text.includes(key)) fail('refusing to write: output contains the API key');
  const reparsed = parseGuide(JSON.parse(text));
  if (!reparsed || reparsed.channels.length !== result.guide.channels.length) {
    fail('refusing to write: output does not pass the browser validator');
  }

  write(resolvePath(values.out), text);
  if (values.ledger)
    write(resolvePath(values.ledger), `${JSON.stringify(result.ledger, null, 2)}\n`);
  result.log.forEach((line) => console.log(`[guide] ${line}`));
  if (result.degraded)
    console.warn(
      '[guide] warning: degraded run (API failure or quota cap); kept last-good entries',
    );
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
