import { ref } from 'vue'
import { notifyError } from '../../shared/ui/feedback'
import { useTokensStore } from '../../stores/modules/Tokens'
import { useSettingStore } from '../../stores/modules/Setting'
import { useAsyncAction } from '../../shared/composables/useAsyncAction'
import { loadSelectableOep4Tokens } from '../../modules/wallet/application/tokenSelectionApplicationService'

interface Oep4SelectionItem {
  contract_hash: string
  decimal?: number
  symbol: string
  selected?: boolean
}

export function useOep4SelectionModal({
  tokensStore,
  settingStore,
  getOep4Balances,
}: {
  tokensStore: ReturnType<typeof useTokensStore>
  settingStore: ReturnType<typeof useSettingStore>
  getOep4Balances: () => Promise<unknown>
}) {
  const { run } = useAsyncAction()
  const showOep4Selection = ref(false)
  const oep4SelectionItems = ref<Oep4SelectionItem[]>([])
  const oep4SelectionPageSize = ref(10)
  const oep4SelectionPageNumber = ref(1)
  const oep4SelectionTotal = ref(0)

  async function fetchSelectableOep4Tokens() {
    return run(
      async () => {
        const result = await loadSelectableOep4Tokens({
          pageSize: oep4SelectionPageSize.value,
          pageNumber: oep4SelectionPageNumber.value,
          selectedTokensByNetwork: tokensStore.oep4Tokens[settingStore.network],
        })

        if (!result.ok) {
          notifyError(result.errorKey || 'common.networkErr')
          oep4SelectionTotal.value = 0
          oep4SelectionItems.value = []
          return result
        }

        oep4SelectionTotal.value = result.total
        oep4SelectionItems.value = result.list.map((item) => ({
          contract_hash: item.contract_hash,
          decimal: item.decimals || 0,
          symbol: item.symbol,
          selected: item.selected,
        }))
        return result
      },
      { useGlobalLoading: true }
    )
  }

  function addOep4() {
    void handleOep4SelectionOpenChange(true)
  }

  async function handleOep4SelectionOpenChange(open: boolean) {
    showOep4Selection.value = open
    oep4SelectionPageNumber.value = 1

    if (open) {
      await fetchSelectableOep4Tokens()
      return
    }

    await run(
      async () => {
        await getOep4Balances()
      },
      { useGlobalLoading: true }
    )
  }

  function handleOep4SelectionPageChange(page: number) {
    oep4SelectionPageNumber.value = page
    void fetchSelectableOep4Tokens()
  }

  function toggleOep4Selection(item: Oep4SelectionItem) {
    const nextItem = {
      ...item,
      selected: !item.selected,
    }

    tokensStore.setOep4Token(settingStore.network, nextItem)
    oep4SelectionItems.value = oep4SelectionItems.value.map((currentItem) =>
      currentItem.contract_hash === item.contract_hash ? nextItem : currentItem
    )
  }

  return {
    showOep4Selection,
    oep4SelectionItems,
    oep4SelectionPageNumber,
    oep4SelectionTotal,
    fetchSelectableOep4Tokens,
    addOep4,
    handleOep4SelectionOpenChange,
    handleOep4SelectionPageChange,
    toggleOep4Selection,
  }
}
