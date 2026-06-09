import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  currentWalletStore: {
    balance: { ont: 100, ong: 50 },
    transfer: {
      gas: 0.01,
      asset: 'ONT',
      scriptHash: '',
      decimal: 0,
      amount: 0,
      to: '',
    },
    setTransfer: vi.fn(),
    resetCurrentTransfer: vi.fn(),
  },
  tokensStore: {
    oep4WithBalances: [
      { contract_hash: '0xtoken', symbol: 'TKN', decimal: 4, balance: '25.5' },
    ] as Array<Record<string, unknown>>,
  },
  feedback: {
    notifyError: vi.fn(),
  },
  validators: {
    verifyPositiveInt: vi.fn((v: unknown) => Number(v) > 0 && Number.isInteger(Number(v))),
    verifyOngValue: vi.fn((v: unknown) => Number(v) > 0),
    verifyOep4Value: vi.fn((v: unknown) => Number(v) > 0),
  },
  validateSharedTransferAddress: vi.fn(),
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (cb: () => void) => cb(),
  }
})

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

vi.mock('../../stores/modules/Tokens', () => ({
  useTokensStore: () => mocks.tokensStore,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
}))

vi.mock('../../shared/lib/validators', () => ({
  verifyPositiveInt: (v: unknown) => mocks.validators.verifyPositiveInt(v),
  verifyOngValue: (v: unknown) => mocks.validators.verifyOngValue(v),
  verifyOep4Value: (v: unknown) => mocks.validators.verifyOep4Value(v),
}))

vi.mock(
  '../../modules/wallet/application/sharedWallet/sharedWalletTransactionApplicationService',
  () => ({
    validateSharedTransferAddress: (...args: unknown[]) =>
      mocks.validateSharedTransferAddress(...args),
  })
)

vi.mock('../../shared/lib/constants', () => ({
  TRANSFER_GAS_MIN: 0.01,
}))

import { useSendAsset } from './useSendAsset'

function createEmit() {
  return vi.fn() as unknown as (event: 'cancelEvent' | 'sendAssetNext') => void
}

describe('useSendAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentWalletStore.balance = { ont: 100, ong: 50 }
    mocks.currentWalletStore.transfer = {
      gas: 0.01,
      asset: 'ONT',
      scriptHash: '',
      decimal: 0,
      amount: 0,
      to: '',
    }
    mocks.validators.verifyPositiveInt.mockImplementation(
      (v: unknown) => Number(v) > 0 && Number.isInteger(Number(v))
    )
    mocks.validators.verifyOngValue.mockImplementation((v: unknown) => Number(v) > 0)
    mocks.validators.verifyOep4Value.mockImplementation((v: unknown) => Number(v) > 0)
  })

  describe('initialization', () => {
    it('hydrates from the current wallet transfer on mount', () => {
      mocks.currentWalletStore.transfer = {
        gas: 0.05,
        asset: 'ONG',
        scriptHash: 'ONG',
        decimal: 9,
        amount: 12,
        to: 'AQrecipient',
      }

      const sendAsset = useSendAsset(createEmit())

      expect(sendAsset.gas.value).toBe(0.05)
      expect(sendAsset.asset.value).toBe('ONG')
      expect(sendAsset.amount.value).toBe(12)
      expect(sendAsset.to.value).toBe('AQrecipient')
    })

    it('formats the ONT available balance from the store', () => {
      const sendAsset = useSendAsset(createEmit())
      expect(sendAsset.availableBalance.value).toBe('100 ONT')
    })

    it('restores selected OEP-4 assets from persisted transfer state', () => {
      mocks.currentWalletStore.transfer = {
        gas: 0.01,
        asset: 'TKN',
        scriptHash: '0xtoken',
        decimal: 4,
        amount: 2,
        to: 'AQrecipient',
      }

      const sendAsset = useSendAsset(createEmit())

      expect(sendAsset.availableBalance.value).toBe('25.5 TKN')
    })
  })

  describe('changeAsset', () => {
    it('switches between native ONT and ONG and resets the amount', () => {
      const sendAsset = useSendAsset(createEmit())
      sendAsset.amount.value = 5

      sendAsset.changeAsset('ONG')

      expect(sendAsset.asset.value).toBe('ONG')
      expect(sendAsset.scriptHash.value).toBe('ONG')
      expect(sendAsset.amount.value).toBe('0')
      expect(sendAsset.availableBalance.value).toBe('50 ONG')
    })

    it('selects an OEP-4 token by contract hash and reflects its symbol and balance', () => {
      const sendAsset = useSendAsset(createEmit())

      sendAsset.changeAsset('0xtoken')

      expect(sendAsset.scriptHash.value).toBe('0xtoken')
      expect(sendAsset.asset.value).toBe('TKN')
      expect(sendAsset.availableBalance.value).toBe('25.5 TKN')
    })

    it('is a no-op when given an unknown OEP-4 contract hash', () => {
      const sendAsset = useSendAsset(createEmit())

      sendAsset.changeAsset('0xunknown')

      expect(sendAsset.asset.value).toBe('ONT')
    })
  })

  describe('validateAmount', () => {
    it('marks ONT amount valid when format and balance pass', () => {
      const sendAsset = useSendAsset(createEmit())
      sendAsset.amount.value = 50

      sendAsset.validateAmount()

      expect(sendAsset.validAmount.value).toBe(true)
      expect(mocks.feedback.notifyError).not.toHaveBeenCalled()
    })

    it('flags ONT amount as invalid when it exceeds the wallet balance', () => {
      const sendAsset = useSendAsset(createEmit())
      sendAsset.amount.value = 9999

      sendAsset.validateAmount()

      expect(sendAsset.validAmount.value).toBe(false)
      expect(mocks.feedback.notifyError).toHaveBeenCalledWith('transfer.exceedBalance')
    })

    it('flags ONG amount as invalid when amount + gas exceeds balance', () => {
      const sendAsset = useSendAsset(createEmit())
      sendAsset.changeAsset('ONG')
      sendAsset.amount.value = 50

      sendAsset.validateAmount()

      expect(sendAsset.validAmount.value).toBe(false)
      expect(mocks.feedback.notifyError).toHaveBeenCalledWith('transfer.exceedBalance')
    })

    it('marks malformed and overdrawn OEP-4 amounts invalid', () => {
      const sendAsset = useSendAsset(createEmit())
      sendAsset.changeAsset('0xtoken')
      mocks.validators.verifyOep4Value.mockReturnValueOnce(false)
      sendAsset.amount.value = 'invalid'
      sendAsset.validateAmount()
      expect(sendAsset.validAmount.value).toBe(false)

      sendAsset.amount.value = 30
      sendAsset.validateAmount()
      expect(sendAsset.validAmount.value).toBe(false)
      expect(mocks.feedback.notifyError).toHaveBeenCalledWith('transfer.exceedBalance')
    })
  })

  describe('maxAmount', () => {
    it('selects the maximum ONT, ONG, and OEP-4 amount', () => {
      const sendAsset = useSendAsset(createEmit())

      sendAsset.maxAmount()
      expect(sendAsset.amount.value).toBe(100)

      sendAsset.changeAsset('ONG')
      sendAsset.maxAmount()
      expect(sendAsset.amount.value).toBe('49.99')

      sendAsset.changeAsset('0xtoken')
      sendAsset.maxAmount()
      expect(sendAsset.amount.value).toBe('25.5')
    })
  })

  describe('next', () => {
    it('blocks and notifies when the amount is zero or invalid', () => {
      const emit = createEmit()
      const sendAsset = useSendAsset(emit)
      sendAsset.amount.value = 0

      sendAsset.next()

      expect(mocks.feedback.notifyError).toHaveBeenCalledWith('transfer.inputValidAmount')
      expect(emit).not.toHaveBeenCalled()
      expect(mocks.currentWalletStore.setTransfer).not.toHaveBeenCalled()
    })

    it('blocks and notifies when the recipient address is invalid', () => {
      const emit = createEmit()
      const sendAsset = useSendAsset(emit)
      sendAsset.amount.value = 10
      sendAsset.validAmount.value = true
      sendAsset.to.value = ''
      sendAsset.validToAddress.value = false

      sendAsset.next()

      expect(mocks.feedback.notifyError).toHaveBeenCalledWith('transfer.inputValidAddress')
      expect(emit).not.toHaveBeenCalled()
    })

    it('commits the transfer to the store and emits sendAssetNext on success', () => {
      const emit = createEmit()
      const sendAsset = useSendAsset(emit)
      sendAsset.amount.value = 10
      sendAsset.validAmount.value = true
      sendAsset.to.value = 'AQrecipient'
      sendAsset.validToAddress.value = true

      sendAsset.next()

      expect(mocks.currentWalletStore.setTransfer).toHaveBeenCalledWith({
        transfer: expect.objectContaining({
          amount: 10,
          to: 'AQrecipient',
          asset: 'ONT',
          scriptHash: 'ONT',
        }),
      })
      expect(emit).toHaveBeenCalledWith('sendAssetNext')
    })

    it('blocks ONG transfers whose amount plus gas exceeds the balance', () => {
      const emit = createEmit()
      const sendAsset = useSendAsset(emit)
      sendAsset.changeAsset('ONG')
      sendAsset.amount.value = 50
      sendAsset.validAmount.value = true
      sendAsset.to.value = 'AQrecipient'

      sendAsset.next()

      expect(mocks.feedback.notifyError).toHaveBeenCalledWith('transfer.ongBalanceNotEnough')
      expect(emit).not.toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('resets the current transfer and emits cancelEvent', () => {
      const emit = createEmit()
      const sendAsset = useSendAsset(emit)

      sendAsset.cancel()

      expect(mocks.currentWalletStore.resetCurrentTransfer).toHaveBeenCalled()
      expect(emit).toHaveBeenCalledWith('cancelEvent')
    })
  })

  describe('validateToAddress', () => {
    it('marks the address valid when the shared validator accepts it', async () => {
      mocks.validateSharedTransferAddress.mockResolvedValue(true)
      const sendAsset = useSendAsset(createEmit())
      sendAsset.to.value = 'AQrecipient'

      await sendAsset.validateToAddress()

      expect(sendAsset.validToAddress.value).toBe(true)
    })

    it('marks the address invalid when the validator rejects it', async () => {
      mocks.validateSharedTransferAddress.mockResolvedValue(false)
      const sendAsset = useSendAsset(createEmit())
      sendAsset.to.value = 'bogus'

      await sendAsset.validateToAddress()

      expect(sendAsset.validToAddress.value).toBe(false)
    })

    it('rejects empty addresses without calling the shared validator', async () => {
      const sendAsset = useSendAsset(createEmit())

      await sendAsset.validateToAddress()

      expect(sendAsset.validToAddress.value).toBe(false)
      expect(mocks.validateSharedTransferAddress).not.toHaveBeenCalled()
    })
  })
})
