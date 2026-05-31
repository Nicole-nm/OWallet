import { computed, onMounted, ref } from 'vue'
import { BigNumber } from 'bignumber.js'
import { varifyPositiveInt, varifyOngValue, varifyOpe4Value } from '../../shared/lib/validators'
import { validateSharedTransferAddress } from '../../modules/wallet/application/sharedWallet/sharedWalletTransactionApplicationService'
import { notifyError } from '../../shared/ui/feedback'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useTokensStore } from '../../stores/modules/Tokens'
import { TRANSFER_GAS_MIN } from '../../shared/lib/constants'
import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import type { TrackedOep4Token } from '../../shared/types'

type SendAssetEmit = (event: 'cancelEvent' | 'sendAssetNext') => void

const NATIVE_ASSET_ONT = 'ONT'
const NATIVE_ASSET_ONG = 'ONG'

function isOep4Asset(symbol: string): boolean {
  return symbol !== NATIVE_ASSET_ONT && symbol !== NATIVE_ASSET_ONG
}

export function useSendAsset(emit: SendAssetEmit) {
  const currentWalletStore = useCurrentWalletStore()
  const tokensStore = useTokensStore()

  const gas = ref<number>(TRANSFER_GAS_MIN)
  const asset = ref<string>(NATIVE_ASSET_ONT)
  const scriptHash = ref<string>(NATIVE_ASSET_ONT)
  const decimal = ref<number>(0)
  const amount = ref<number | string>(0)
  const to = ref<string>('')
  const validToAddress = ref(true)
  const validAmount = ref(true)
  const selectedOep4 = ref<TrackedOep4Token | null>(null)

  const balance = computed(() => currentWalletStore.balance)
  const oep4s = computed(() => tokensStore.oep4WithBalances)

  const availableBalance = computed(() => {
    if (asset.value === NATIVE_ASSET_ONT) {
      return `${formatNumberForDisplay(balance.value.ont)} ${NATIVE_ASSET_ONT}`
    }
    if (asset.value === NATIVE_ASSET_ONG) {
      return `${formatNumberForDisplay(balance.value.ong)} ${NATIVE_ASSET_ONG}`
    }
    return `${formatNumberForDisplay(selectedOep4.value?.balance ?? 0)} ${asset.value}`
  })

  const oep4ByContractHash = computed(
    () => new Map(oep4s.value.map((item) => [item.contract_hash, item]))
  )
  const oep4BySymbol = computed(() => new Map(oep4s.value.map((item) => [item.symbol, item])))

  function isAmountFormatValid(): boolean {
    if (asset.value === NATIVE_ASSET_ONT) return varifyPositiveInt(amount.value)
    if (asset.value === NATIVE_ASSET_ONG) return varifyOngValue(amount.value)
    return varifyOpe4Value(amount.value, decimal.value)
  }

  function exceedsBalance(): boolean {
    if (asset.value === NATIVE_ASSET_ONT) {
      return Number(amount.value) > Number(balance.value.ont)
    }
    if (asset.value === NATIVE_ASSET_ONG) {
      return Number(amount.value) > Number(balance.value.ong)
    }
    return new BigNumber(amount.value).isGreaterThan(
      new BigNumber(selectedOep4.value?.balance ?? 0)
    )
  }

  function ongWithGasExceedsBalance(): boolean {
    return (
      asset.value === NATIVE_ASSET_ONG &&
      new BigNumber(amount.value).plus(gas.value).isGreaterThan(balance.value.ong)
    )
  }

  function validateAmount() {
    if (!isAmountFormatValid()) {
      validAmount.value = false
      return
    }

    if (exceedsBalance()) {
      validAmount.value = false
      notifyError('transfer.exceedBalance')
      return
    }

    if (ongWithGasExceedsBalance()) {
      validAmount.value = false
      notifyError('transfer.exceedBalance')
      return
    }

    validAmount.value = true
  }

  async function validateToAddress() {
    if (!to.value || !(await validateSharedTransferAddress(to.value))) {
      validToAddress.value = false
      return
    }
    validToAddress.value = true
  }

  function changeAsset(value: string) {
    amount.value = '0'
    scriptHash.value = value

    if (isOep4Asset(value)) {
      const matchedOep4 = oep4ByContractHash.value.get(value)
      if (!matchedOep4) return

      decimal.value = matchedOep4.decimal ?? matchedOep4.decimals ?? 0
      selectedOep4.value = matchedOep4
      asset.value = matchedOep4.symbol
      return
    }

    asset.value = value
    decimal.value = 0
    selectedOep4.value = null
  }

  function maxAmount() {
    if (asset.value === NATIVE_ASSET_ONT) {
      amount.value = balance.value.ont
    } else if (asset.value === NATIVE_ASSET_ONG) {
      amount.value = new BigNumber(balance.value.ong).minus(gas.value).toString()
    } else {
      const matchedOep4 = oep4BySymbol.value.get(asset.value)
      if (matchedOep4 && matchedOep4.balance !== undefined) {
        amount.value = matchedOep4.balance
      }
    }
    validateAmount()
  }

  function cancel() {
    currentWalletStore.resetCurrentTransfer()
    emit('cancelEvent')
  }

  function next() {
    if (!amount.value || Number(amount.value) === 0 || !validAmount.value) {
      notifyError('transfer.inputValidAmount')
      return
    }
    if (!to.value || !validToAddress.value) {
      notifyError('transfer.inputValidAddress')
      return
    }
    if (ongWithGasExceedsBalance()) {
      notifyError('transfer.ongBalanceNotEnough')
      return
    }

    currentWalletStore.setTransfer({
      transfer: {
        amount: Number(amount.value),
        to: to.value,
        gas: gas.value,
        asset: asset.value,
        scriptHash: scriptHash.value,
        decimal: decimal.value,
      },
    })
    emit('sendAssetNext')
  }

  onMounted(() => {
    const transfer = currentWalletStore.transfer
    gas.value = transfer.gas
    asset.value = transfer.asset
    scriptHash.value = transfer.scriptHash || transfer.asset || NATIVE_ASSET_ONT
    decimal.value = transfer.decimal || 0
    amount.value = transfer.amount
    to.value = transfer.to

    if (transfer.scriptHash && isOep4Asset(transfer.asset)) {
      selectedOep4.value = oep4ByContractHash.value.get(transfer.scriptHash) ?? null
    }
  })

  return {
    gas,
    asset,
    scriptHash,
    amount,
    to,
    validToAddress,
    validAmount,
    oep4s,
    availableBalance,
    changeAsset,
    validateAmount,
    validateToAddress,
    maxAmount,
    cancel,
    next,
  }
}
