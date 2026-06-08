import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TRANSFER_GAS_MIN } from '../../../shared/lib/constants'
import type {
  PendingSharedTransfer,
  SharedCopayer,
  SharedWalletSigner,
  TrackedOep4Token,
  TransferState,
} from '../../../shared/types'

type Transfer = TransferState & { oep4s: TrackedOep4Token[] }

interface TransferPayload {
  transfer?: Partial<Transfer>
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

interface TransferRedeemTypePayload {
  type?: boolean
}

interface ResetTransferPayload {
  gas?: number
}

function createDefaultTransfer({ gas = TRANSFER_GAS_MIN }: ResetTransferPayload = {}): Transfer {
  return {
    balance: { ont: 0, ong: 0 },
    oep4s: [],
    from: '',
    to: '',
    amount: 0,
    asset: 'ONT',
    gas,
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
    transactionBodyHash: '',
    transactionIdHash: '',
  }
}

function createDefaultCurrentSigner(): SharedWalletSigner {
  return { type: '', address: '', publicKey: '' }
}

export const useCurrentWalletSessionStore = defineStore('CurrentWalletSession', () => {
  const transfer = ref<Transfer>(createDefaultTransfer())
  const pendingTx = ref<PendingSharedTransfer>(createDefaultPendingTx())
  const currentSigner = ref<SharedWalletSigner>(createDefaultCurrentSigner())
  const localCopayers = ref<SharedCopayer[]>([])

  function setTransfer(payload: TransferPayload = {}) {
    transfer.value = Object.assign({}, transfer.value, payload.transfer)
  }

  function setLocalCopayers(payload: CopayersPayload = {}) {
    localCopayers.value = payload.localCopayers ?? []
  }

  function setPendingTx(payload: PendingTransactionPayload = {}) {
    pendingTx.value = Object.assign(createDefaultPendingTx(), payload.pendingTx)
  }

  function setCurrentSigner(payload: CurrentSignerPayload = {}) {
    currentSigner.value = Object.assign(createDefaultCurrentSigner(), payload.account)
  }

  function resetCurrentTransfer(payload: ResetTransferPayload = {}) {
    transfer.value = createDefaultTransfer(payload)
  }

  function setTransferRedeemType(payload: TransferRedeemTypePayload = {}) {
    transfer.value.isRedeem = Boolean(payload.type)
    transfer.value.asset = payload.type ? 'ONG' : 'ONT'
  }

  function resetTransferBalance() {
    resetCurrentTransfer()
  }

  return {
    transfer,
    pendingTx,
    currentSigner,
    localCopayers,
    setTransfer,
    setLocalCopayers,
    setPendingTx,
    setCurrentSigner,
    resetCurrentTransfer,
    setTransferRedeemType,
    resetTransferBalance,
  }
})
