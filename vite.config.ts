/// <reference types="vitest/config" />
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const generatedDir = fileURLToPath(new URL('./src/generated/', import.meta.url));

/**
 * Base path. The default './' makes the bundle work from any sub-path
 * (for example a GitHub Pages project site at /<repo>/) without knowing the
 * repo name. Set BASE_PATH=/some/path/ only if a host needs an absolute base.
 * See docs/decisions/0007-relative-base-path.md.
 */
function resolveBase(): string {
  const base = process.env.BASE_PATH ?? './';
  if (base !== './' && !(base.startsWith('/') && base.endsWith('/'))) {
    throw new Error(`BASE_PATH must be "./" or start and end with "/" (got "${base}")`);
  }
  return base;
}

/**
 * Copies the generated facts and resolved intro into dist/ so tests can check
 * the built artefact rather than a regenerated copy (docs/architecture.md §5).
 */
function emitFactsArtefacts(): Plugin {
  return {
    name: 'transmission-pending:emit-facts',
    apply: 'build',
    generateBundle() {
      for (const name of ['facts.json', 'intro.json']) {
        const path = generatedDir + name;
        if (!existsSync(path)) {
          this.error(`${path} is missing. Run "npm run facts" before "vite build".`);
        }
        this.emitFile({ type: 'asset', fileName: name, source: readFileSync(path, 'utf8') });
      }
    },
  };
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), emitFactsArtefacts()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2023',
    sourcemap: true,
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    passWithNoTests: true,
  },
});
