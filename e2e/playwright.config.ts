import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: './results/artifacts',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './results/html-report', open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
})
