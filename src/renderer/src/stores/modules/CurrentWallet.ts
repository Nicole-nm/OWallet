import { defineStore } from 'pinia'
import { TRANSFER_GAS_MIN } from '../../shared/lib/constants'
import {
  loadCurrentWalletSession,
  saveCurrentWalletSession,
} from '../../shared/persistence/appStateService'
import type {
  CurrentWalletRecord,
  PendingSharedTransfer,
  SharedCopayer,
  SharedWalletSigner,
  TrackedOep4Token,
  TransferState,
  WalletBalance,
} from '../../shared/types'

interface RedeemState {
  claimableOng: number
  balanceOng: number
}

interface WalletBalanceExtended extends WalletBalance {
  ontValue?: number
}

interface CurrentWalletState {
  wallet: CurrentWalletRecord
  balance: WalletBalanceExtended
  transfer: TransferState & { oep4s: TrackedOep4Token[] }
  pendingTx: PendingSharedTransfer
  currentSigner: SharedWalletSigner
  localCopayers: SharedCopayer[]
  redeem: RedeemState
  nep5Ont: number
}

interface WalletPayload {
  wallet?: Partial<CurrentWalletRecord>
}

interface TransferPayload {
  transfer?: Partial<CurrentWalletState['transfer']>
}

interface CopayersPayload {
  localCopayers?: SharedCopayer[]
}

interface PendingTransactionPayload {
  pendingTx?: Partial<PendingSharedTransfer>
}

interface CurrentSignerPayload {
  account?: Partial<SharedWalletSigner>
}

interface BalancePayload {
  balance?: WalletBalanceExtended
}

interface RedeemPayload {
  redeem?: RedeemState
}

interface Nep5OntPayload {
  nep5Ont?: number
}

interface TransferRedeemTypePayload {
  type?: boolean
}

function createDefaultWallet(): CurrentWalletRecord {
  return {
    publicKey: '',
    address: '',
    name: '',
    label: '',
    coPayers: [],
    requiredNumber: '',
    totalNumber: '',
  }
}

function createDefaultBalance(): WalletBalanceExtended {
  return {
    ont: 0,
    ong: 0,
    waitBoundOng: 0,
    unboundOng: 0,
  }
}

function createDefaultTransfer(): CurrentWalletState['transfer'] {
  return {
    balance: { ont: 0, ong: 0 },
    oep4s: [],
    from: '',
    to: '',
    amount: 0,
    asset: 'ONT',
    gas: TRANSFER_GAS_MIN,
    coPayers: [],
    sponsorPayer: '',
    isRedeem: false,
  }
}

function createDefaultPendingTx(): PendingSharedTransfer {
  return {
    amount: 0,
    assetName: '',
    receiveaddress: '',
    sendaddress: '',
    gasprice: 0,
    gaslimit: 0,
    coPayerSignDtos: [],
    transactionbodyhash: '',
    transactionidhash: '',
  }
}

function createDefaultCurrentSigner(): SharedWalletSigner {
  return {
    type: '',
    address: '',
    publicKey: '',
  }
}

export const useCurrentWalletStore = defineStore('CurrentWallet', {
  state: (): CurrentWalletState => ({
    wallet: Object.assign(createDefaultWallet(), loadCurrentWalletSession() || {}),
    balance: createDefaultBalance(),
    transfer: createDefaultTransfer(),
    pendingTx: createDefaultPendingTx(),
    currentSigner: createDefaultCurrentSigner(),
    localCopayers: [],
    redeem: {
      claimableOng: 0,
      balanceOng: 0,
    },
    nep5Ont: 0,
  }),
  actions: {
    setCurrentWallet(payload: WalletPayload = {}) {
      this.wallet = Object.assign(createDefaultWallet(), payload.wallet || {})
      saveCurrentWalletSession(this.wallet)
    },
    mergeCurrentWallet(payload: WalletPayload = {}) {
      this.wallet = Object.assign({}, this.wallet, payload.wallet)
      saveCurrentWalletSession(this.wallet)
    },
    setTransfer(payload: TransferPayload = {}) {
      this.transfer = Object.assign({}, this.transfer, payload.transfer)
    },
    setLocalCopayers(payload: CopayersPayload = {}) {
      this.localCopayers = payload.localCopayers ?? []
    },
    setPendingTx(payload: PendingTransactionPayload = {}) {
      this.pendingTx = Object.assign(createDefaultPendingTx(), payload.pendingTx)
    },
    setCurrentSigner(payload: CurrentSignerPayload = {}) {
      this.currentSigner = Object.assign(createDefaultCurrentSigner(), payload.account)
    },
    setNativeBalance(payload: BalancePayload = {}) {
      this.balance = payload.balance ?? createDefaultBalance()
    },
    resetNativeBalance() {
      this.balance = createDefaultBalance()
    },
    resetCurrentTransfer() {
      this.transfer = createDefaultTransfer()
    },
    setCurrentRedeem(payload: RedeemPayload = {}) {
      this.redeem = payload.redeem ?? { claimableOng: 0, balanceOng: 0 }
    },
    setNep5Ont(payload: Nep5OntPayload = {}) {
      this.nep5Ont = payload.nep5Ont ?? 0
    },
    resetCurrentWallet() {
      this.wallet = createDefaultWallet()
      saveCurrentWalletSession(this.wallet)
    },
    setTransferRedeemType(payload: TransferRedeemTypePayload = {}) {
      this.transfer.isRedeem = Boolean(payload.type)
      this.transfer.asset = payload.type ? 'ONG' : 'ONT'
    },
    resetTransferBalance() {
      this.resetCurrentTransfer()
    },
  },
})
