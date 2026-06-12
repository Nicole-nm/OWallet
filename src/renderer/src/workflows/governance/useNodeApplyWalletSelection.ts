import { computed, ref } from 'vue'
import {
  loadNodeApplyStakeWalletBalance,
  validateNodeApplyOperationWallet,
} from '../../modules/governance/application/nodeStake/nodeApplyApplicationService'
import {
  mapOperationWalletOptions,
  mapStakeWalletOptions,
} from '../../modules/governance/application/common/walletOptionMapper'
import { notifyWarning } from '../../shared/ui/feedback'
import type { HardwareWalletSigner, WalletSigner } from '../../shared/lib/types'

export type NodeApplyWallet = WalletSigner & {
  value?: string | number | null
}

export type RawWalletSelectOption = {
  address?: string
  publicKey?: string
  key?: string | number
  value?: string | number | null
  label?: string
  acct?: number
  neo?: boolean | number
  timestamp?: number
}

export type WalletSelection = {
  wallet: RawWalletSelectOption
  walletType: 'commonWallet' | 'ledgerWallet'
}

interface NodeApplyWalletsStoreLike {
  normalWallets: RawWalletSelectOption[]
  hardwareWallets: RawWalletSelectOption[]
}

export function toNodeApplyWallet(selection: WalletSelection): NodeApplyWallet | null {
  const wallet = selection.wallet
  if (!wallet.address) {
    return null
  }

  return selection.walletType === 'commonWallet'
    ? (wallet as NodeApplyWallet)
    : ({
        address: wallet.address,
        label: wallet.label || '',
        publicKey: wallet.publicKey || '',
        acct: wallet.acct,
        neo: wallet.neo,
        timestamp: wallet.timestamp,
      } as HardwareWalletSigner & NodeApplyWallet)
}

export function useNodeApplyWalletSelection(walletsStore: NodeApplyWalletsStoreLike) {
  const walletType = ref('')
  const stakeWalletValue = ref<string | undefined>(undefined)
  const stakeWallet = ref<NodeApplyWallet | null>(null)
  const operationWallet = ref<string | undefined>(undefined)
  const operationPk = ref('')
  const ontBalance = ref('0')
  const ongBalance = ref('0')

  const ledgerList = computed(() => walletsStore.hardwareWallets)
  const stakeWalletOptions = computed(() => {
    const normalList = mapStakeWalletOptions(walletsStore.normalWallets.slice())
    const ledgerWallets = mapStakeWalletOptions(walletsStore.hardwareWallets.slice(), {
      ledger: true,
    })
    return [...normalList, ...ledgerWallets]
  })
  const normalWalletAndLedgerWallet = computed(() => {
    const normalList = mapOperationWalletOptions(walletsStore.normalWallets.slice())
    const ledgerWallets = mapOperationWalletOptions(walletsStore.hardwareWallets.slice())
      .map((wallet) => ({
        ...wallet,
        label: wallet.label + ' (Ledger)',
      }))
      .sort((left, right) => {
        const leftTime = left.timestamp || 0
        const rightTime = right.timestamp || 0

        if (rightTime !== leftTime) {
          return rightTime - leftTime
        }

        return (right.acct || 0) - (left.acct || 0)
      })

    return [...normalList, ...ledgerWallets].filter(
      (wallet) => wallet.address !== stakeWallet.value?.address
    )
  })

  function getNodePublicKey() {
    return operationWallet.value || operationPk.value
  }

  async function onSelectOperationWallet() {
    const stakeWalletAddress = stakeWallet.value?.address
    const operationWalletPublicKey = getNodePublicKey()
    if (!stakeWalletAddress || !operationWalletPublicKey) {
      return
    }

    const result = await validateNodeApplyOperationWallet({
      stakeWalletAddress,
      operationWalletPublicKey,
    })

    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.networkErr')
      operationPk.value = ''
      operationWallet.value = undefined
    }
  }

  async function onWalletSelected(selection: WalletSelection) {
    const wallet = toNodeApplyWallet(selection)
    if (!wallet) {
      return
    }

    walletType.value = selection.walletType
    stakeWalletValue.value = wallet.address
    stakeWallet.value = wallet
    void onSelectOperationWallet()

    try {
      const balanceResult = await loadNodeApplyStakeWalletBalance(wallet.address)
      if (balanceResult.ok) {
        ontBalance.value = String(balanceResult.data.ont ?? '0')
        ongBalance.value = String(balanceResult.data.ong ?? '0')
      } else {
        ontBalance.value = '0'
        ongBalance.value = '0'
      }
    } catch {
      ontBalance.value = '0'
      ongBalance.value = '0'
    }
  }

  return {
    walletType,
    stakeWalletValue,
    stakeWallet,
    operationWallet,
    operationPk,
    ledgerList,
    stakeWalletOptions,
    normalWalletAndLedgerWallet,
    getNodePublicKey,
    onWalletSelected,
    onSelectOperationWallet,
    ontBalance,
    ongBalance,
  }
}
