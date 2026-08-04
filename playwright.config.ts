import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.COMPAT_BASE_URL;
if (!baseURL) throw new Error('COMPAT_BASE_URL is required for compatibility browser tests');

export default defineConfig({
  testDir: './tests/compatibility',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results/compatibility',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', {
    outputFolder: process.env.PLAYWRIGHT_HTML_REPORT ?? 'playwright-report',
    open: 'never',
  }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    // Compatibility artifacts are uploaded by CI; raw traces may retain
    // authorization headers, so keep diagnostics to reports and screenshots.
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
