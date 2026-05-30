import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: './results/artifacts',
  timeout: 30_000,
  retries: 1,
  // Electron launches a single app instance backed by one on-disk userData
  // directory, so the suite must run serially. Parallel workers would race on
  // the same window/storage and produce flaky results — keep this at 1.
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './results/html-report', open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
})
