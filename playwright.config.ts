/**
 * Owner: qa-engineer.
 *
 * The E2E suite runs against TEST BUILDS of the app, because the store hooks
 * (`window.__APP_TEST__`, `window.__SCENE_TEST__`) exist only in dev and `--mode test` builds:
 *   - 4390: `vite build --mode test` into test-results/build (hooks present). Used by all specs.
 *   - 4391: the normal production build in dist/ (no hooks). Used only by tests/e2e/production.spec.ts.
 * Port 4173 is deliberately not used (another project on this machine uses it).
 *
 * WebGL: headless browsers have no GPU. Chromium is started with SwiftShader (software WebGL).
 * That is slow (about 2 to 20 FPS for 3D) so 3D specs avoid frame-rate or long-playback checks;
 * the long story playback is driven with Playwright's fake clock in 2D mode (see helpers).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { ROOT, recompute } from './tests/helpers/recompute.ts';

// One snapshot of the independently recomputed facts per run, taken before the builds start, so that every worker
// compares the pages with the same repository state even if another agent commits during a long run. The unit test
// (tests/unit/facts.test.ts) does not use it: it always recomputes live, which is how it catches a stale dist/.
if (!process.env.QA_RECOMPUTED_JSON) {
  const file = `${ROOT}/test-results/recomputed.json`;
  mkdirSync(`${ROOT}/test-results`, { recursive: true });
  writeFileSync(file, JSON.stringify(recompute(true)));
  process.env.QA_RECOMPUTED_JSON = file;
}

const TEST_PORT = 4390;
const PROD_PORT = 4391;

const swiftshader = {
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
};

/** Specs that need Chromium-only APIs (screencast, CDP) or SwiftShader baselines. */
const notChromium = ['**/mobile.spec.ts', '**/production.spec.ts', '**/visual.spec.ts'];

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/helpers/global-setup.ts',
  outputDir: 'test-results/artifacts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'test-results/report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: 'off', // tracing makes 600-step fake-clock loops very slow
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-AU',
  },
  webServer: [
    {
      command: `npm run build:test && npx vite preview --outDir test-results/build --port ${TEST_PORT} --strictPort`,
      url: `http://localhost:${TEST_PORT}/`,
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      command: `npm run build && npx vite preview --port ${PROD_PORT} --strictPort`,
      url: `http://localhost:${PROD_PORT}/`,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/mobile.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        launchOptions: swiftshader,
      },
    },
    {
      name: 'firefox',
      testIgnore: notChromium,
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'webkit',
      testIgnore: notChromium,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'mobile-portrait',
      testMatch: ['**/mobile.spec.ts'],
      use: { ...devices['Pixel 7'], launchOptions: swiftshader },
    },
    {
      name: 'mobile-landscape',
      testMatch: ['**/mobile.spec.ts'],
      use: { ...devices['Pixel 7 landscape'], launchOptions: swiftshader },
    },
    {
      name: 'ios-portrait',
      testMatch: ['**/mobile.spec.ts'],
      use: { ...devices['iPhone 14'] },
    },
  ],
});
