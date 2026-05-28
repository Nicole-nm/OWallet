import { computed, ref } from 'vue'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import { isHardwareWallet, type CommonWallet, type HardwareWallet } from '../../shared/lib/types'

type StakeWalletSelectOption = (CommonWallet | HardwareWallet) & {
  value: string
  label: string
}

export function useStakeWalletSelection() {
  const walletsStore = useWalletsStore()

  const selectedWalletValue = ref<string | undefined>(undefined)
  const selectedWallet = ref<StakeWalletSelectOption | null>(null)
  const { ledgerStatus, ledgerPk, ledgerWallet } = useLedgerStatusMonitor({
    shouldPoll: computed(() =>
      Boolean(selectedWallet.value && isHardwareWallet(selectedWallet.value))
    ),
  })

  const walletOptions = computed(() => {
    const normalWallets = walletsStore.normalWallets.slice().map((wallet) => ({
      ...wallet,
      label: wallet.label + ' ' + wallet.address,
      value: wallet.address,
    }))

    const ledgerWallets = walletsStore.hardwareWallets
      .slice()
      .map((wallet) => ({
        ...wallet,
        label: wallet.label + ' ' + wallet.address + ' (Ledger)',
        value: wallet.address,
      }))
      .sort((a, b) => {
        const bTimestamp = b.timestamp || 0
        const aTimestamp = a.timestamp || 0
        if (bTimestamp !== aTimestamp) {
          return bTimestamp - aTimestamp
        }

        return (b.acct || 0) - (a.acct || 0)
      })

    return [...normalWallets, ...ledgerWallets]
  })

  async function ensureWalletsLoaded() {
    await loadWalletCollectionsIntoStore(walletsStore)
    return walletOptions.value
  }

  function setSelectedWalletByAddress(address: string) {
    const wallet = walletOptions.value.find((candidate) => candidate.address === address) || null

    selectedWallet.value = wallet
    selectedWalletValue.value = wallet?.address

    return wallet
  }

  function restoreSelectedWallet(
    wallet: Pick<CommonWallet | HardwareWallet, 'address'> | string | null | undefined
  ) {
    const address = typeof wallet === 'string' ? wallet : wallet?.address
    if (!address) {
      return null
    }

    return setSelectedWalletByAddress(address)
  }

  function resolveSelectedWallet() {
    return selectedWallet.value || null
  }

  function cleanupSelection() {
    selectedWallet.value = null
    selectedWalletValue.value = undefined
  }

  return {
    selectedWalletValue,
    selectedWallet,
    walletOptions,
    ensureWalletsLoaded,
    setSelectedWalletByAddress,
    restoreSelectedWallet,
    resolveSelectedWallet,
    cleanupSelection,
    ledgerStatus,
    ledgerPk,
    ledgerWallet,
  }
}
