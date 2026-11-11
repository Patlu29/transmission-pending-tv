// Writes the all-off-air fallback guide, so the site always has a valid guide.json.
// Usage: node .github/scripts/guide-fallback.mjs <release> <out>
// Shape: src/guide/schema.ts (ChannelGuide, schemaVersion 1). Never calls the network and needs no key.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [release, out] = process.argv.slice(2);
if (!release || !out) {
  console.error('usage: guide-fallback.mjs <release> <out>');
  process.exit(1);
}
const sources = JSON.parse(readFileSync('src/content/guide-sources.json', 'utf8'));
const guide = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  release,
  channels: sources.channels
    .filter((c) => c.enabled)
    .map((c) => ({
      number: c.number,
      name: c.name,
      channelId: c.channelId,
      languages: c.languages,
      genre: c.genre,
      country: c.country,
      attribution: c.attribution,
      state: 'unresolved',
      live: null,
      stale: false,
    })),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(guide, null, 2)}\n`);
console.log(`fallback guide written: ${guide.channels.length} channels, all unresolved`);
