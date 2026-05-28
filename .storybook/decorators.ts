import { createMemoryHistory, createRouter } from 'vue-router'
import { createI18n } from 'vue-i18n'
import en from '../src/renderer/src/lang/en'
import zh from '../src/renderer/src/lang/zh'
import type { OWalletPlatformApi } from '../src/shared-types/ipc'

const storybookRoutes = [
  { path: '/', name: 'Home', component: { template: '<div />' } },
  { path: '/Wallets', name: 'Wallets', component: { template: '<div />' } },
  { path: '/setting', name: 'Setting', component: { template: '<div />' } },
  { path: '/dapps', name: 'Dapps', component: { template: '<div />' } },
  { path: '/governance', name: 'NodeManagement', component: { template: '<div />' } },
  {
    path: '/Wallets/createJsonWallet',
    name: 'CreateJsonWallet',
    component: { template: '<div />' },
  },
  {
    path: '/Wallets/importJsonWallet',
    name: 'ImportJsonWallet',
    component: { template: '<div />' },
  },
  {
    path: '/Wallets/importLedgerWallet',
    name: 'ImportLedgerWallet',
    component: { template: '<div />' },
  },
  {
    path: '/Wallets/createSharedWallet',
    name: 'CreateSharedWallet',
    component: { template: '<div />' },
  },
  {
    path: '/Wallets/importSharedWallet',
    name: 'ImportSharedWallet',
    component: { template: '<div />' },
  },
  { path: '/:pathMatch(.*)*', name: 'Fallback', component: { template: '<div />' } },
]

export function createStorybookRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: storybookRoutes,
  })
}

export function createStorybookI18n() {
  return createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    legacy: false,
    globalInjection: true,
    messages: { en, zh },
  })
}

/**
 * Mocks window.owalletPlatform so Storybook components that
 * import bridge.ts do not crash.
 */
export function setupPlatformMock() {
  if (typeof window !== 'undefined') {
    const platformWindow = window as Window & { owalletPlatform?: OWalletPlatformApi }
    if (platformWindow.owalletPlatform) {
      return
    }

    const mockedPlatform: OWalletPlatformApi = {
      dialog: {
        openDirectory: async () => ({ canceled: true, filePaths: [] }),
      },
      preferences: {
        getSavePath: async () => '/tmp/owallet-storybook',
        hasConfiguredSavePath: async () => true,
        setSavePath: async () => {},
      },
      keystoreDb: {
        find: async () => [],
        insert: async () => ({}),
        update: async () => 0,
        remove: async () => 0,
      },
      http: {
        fetchJson: async () => ({}),
      },
      shell: {
        openExternal: async () => {},
      },
      system: {
        validateKeystorePath: async () => true,
        isTest: async () => false,
      },
    }

    platformWindow.owalletPlatform = Object.freeze(mockedPlatform)
  }
}
