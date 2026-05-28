import { test as base, type Page, type ElectronApplication } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

/**
 * Custom Playwright fixture that launches the OWallet Electron app
 * and provides both the ElectronApplication handle and the first Page.
 *
 * Each test gets an isolated temp directory for NeDB data so tests never
 * pollute each other.
 */
export interface ElectronFixtures {
  electronApp: ElectronApplication
  appPage: Page
  /** Temp directory used as the keystore save path for this test. */
  testDataDir: string
}

export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  testDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'owallet-e2e-'))
    await use(dir)
    fs.rmSync(dir, { recursive: true, force: true })
  },

  electronApp: async ({ testDataDir }, use) => {
    const appPath = path.resolve(__dirname, '..', '..', 'out', 'main', 'index.js')
    const app = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        IS_TEST: '1',
        OWALLET_TEST_DATA_DIR: testDataDir,
      },
    })
    await use(app)
    await app.close()
  },

  appPage: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(250)

    page.on('console', (message) => {
      console.log(`[OWallet][renderer-console][${message.type()}] ${message.text()}`)
    })

    page.on('pageerror', (error) => {
      console.error('[OWallet][renderer-pageerror]', error)
    })

    await use(page)
  },
})

export { expect } from '@playwright/test'
