/// <reference types="vitest/config" />
import { readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { CONTENT_SECURITY_POLICY } from './scripts/csp.ts';

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

/**
 * BUG-6 (devops): public/ folders are kept in git with empty `.gitkeep` files, and Vite copies them into dist/.
 * Remove them after the bundle is written so they never ship.
 */
function dropGitkeep(): Plugin {
  let outDir = 'dist';
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === '.gitkeep') rmSync(path);
    }
  };
  return {
    name: 'transmission-pending:drop-gitkeep',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (existsSync(outDir)) walk(outDir);
    },
  };
}

/**
 * v2 (ADR 0011 §6): the CSP goes into built pages only, as the first element of <head>.
 * The dev server is left without it because Vite's HMR uses inline scripts and <style> tags.
 */
function injectCsp(): Plugin {
  return {
    name: 'transmission-pending:csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), emitFactsArtefacts(), dropGitkeep(), injectCsp()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2023',
    // BUG-6: no source maps in the published bundle (they were 6 MB and exposed the source).
    sourcemap: false,
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    passWithNoTests: true,
  },
});
