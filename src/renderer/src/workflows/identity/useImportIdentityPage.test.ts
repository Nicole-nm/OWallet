import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  loading: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  feedback: {
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
  },
  application: {
    importIdentityFromKeystore: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: unknown) => key,
  }),
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loading,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: unknown[]) => mocks.feedback.notifySuccess(...args),
  notifyWarning: (...args: unknown[]) => mocks.feedback.notifyWarning(...args),
}))

vi.mock('../../modules/identity/application/importIdentityApplicationService', () => ({
  importIdentityFromKeystore: (...args: unknown[]) =>
    mocks.application.importIdentityFromKeystore(...args),
}))

import { useImportIdentityPage } from './useImportIdentityPage'

describe('useImportIdentityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('imports identity keystore in the workflow and routes back to identities', async () => {
    mocks.application.importIdentityFromKeystore.mockResolvedValue({
      ok: true,
      identity: { ontid: 'did:ont:alice' },
    })

    const page = useImportIdentityPage()
    page.updateImportIdentityField({
      field: 'keystore',
      value: '{"key":"K","address":"A","salt":"S"}',
    })
    page.updateImportIdentityField({ field: 'keystorePassword', value: 'secret123' })

    await page.submitImportIdentity()

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('importIdentity.importSuccess')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Identities' })
  })

  it('surfaces duplicate identity imports as warnings in the workflow', async () => {
    mocks.application.importIdentityFromKeystore.mockResolvedValue({
      ok: false,
      errorKey: 'importIdentity.ontidExist',
      duplicate: true,
    })

    const page = useImportIdentityPage()
    page.updateImportIdentityField({
      field: 'keystore',
      value: '{"key":"K","address":"A","salt":"S"}',
    })
    page.updateImportIdentityField({ field: 'keystorePassword', value: 'secret123' })

    const result = await page.submitImportIdentity()

    expect(result).toEqual({
      ok: false,
      errorKey: 'importIdentity.ontidExist',
      duplicate: true,
    })
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('importIdentity.ontidExist')
    expect(mocks.router.push).not.toHaveBeenCalled()
  })
})
