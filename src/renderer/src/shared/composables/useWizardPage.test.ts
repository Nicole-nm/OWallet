import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  t: vi.fn((key) => `translated:${key}`),
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: mocks.t,
  }),
}))

import { useWizardPage } from './useWizardPage'

describe('useWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds translated steps and navigates back using the provided route name', () => {
    const page = useWizardPage({
      currentStep: ref(1),
      backRouteName: 'Wallets',
      stepTitleKeys: ['createJsonWallet.basicInfo', 'createJsonWallet.confirmInfo'],
    })

    expect(page.currentStep.value).toBe(1)
    expect(page.steps.value).toEqual([
      { key: 'step-0', title: 'translated:createJsonWallet.basicInfo' },
      { key: 'step-1', title: 'translated:createJsonWallet.confirmInfo' },
    ])

    page.back()

    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('creates placeholder steps when only a step count is provided', () => {
    const page = useWizardPage({
      currentStep: ref(0),
      backRouteName: 'Wallets',
      stepCount: 2,
    })

    expect(page.steps.value).toEqual([
      { key: 'step-0', title: '' },
      { key: 'step-1', title: '' },
    ])
  })
})
