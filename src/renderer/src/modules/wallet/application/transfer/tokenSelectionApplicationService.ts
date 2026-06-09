import {
  fetchOep4TokenBalances,
  fetchOep4TokenList,
  queryOep4Balance,
} from '../../../../domains/wallet/oep4Service'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCatch } from '../../../../shared/lib/result'
import type { TrackedOep4Token } from '../../../../shared/types'

const logger = createLogger('tokenSelectionApplicationService')

interface TokenListRecord extends Record<string, unknown> {
  contract_hash: string
  decimals?: number
  name?: string
  symbol: string
}

interface TokenBalanceEntry extends Record<string, unknown> {
  asset_name?: string
  balance?: string | number
}

type SelectedTokenMap = Record<string, TrackedOep4Token>

function toSelectedTokenMap(tokens: SelectedTokenMap = {}) {
  return tokens || {}
}

export async function loadSelectableOep4Tokens({
  pageSize,
  pageNumber,
  selectedTokensByNetwork = {},
}: {
  pageSize: number
  pageNumber: number
  selectedTokensByNetwork?: SelectedTokenMap
}) {
  return tryCatch(
    async () => {
      const { records, total } = await fetchOep4TokenList(pageSize, pageNumber)
      const selectedTokens = toSelectedTokenMap(selectedTokensByNetwork)
      const list = (records as TokenListRecord[]).map((item) => {
        const selectedToken = Object.values(selectedTokens).find(
          (candidate) => candidate.contract_hash === item.contract_hash
        )
        return { ...item, selected: Boolean(selectedToken?.selected) }
      })
      return { list, total }
    },
    {
      context: 'loadSelectableOep4Tokens',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ list: [] as TokenListRecord[], total: 0 }),
    }
  )
}

export async function loadSelectedOep4TokenBalances({
  address,
  selectedTokensByNetwork = {},
}: {
  address: string
  selectedTokensByNetwork?: SelectedTokenMap
}) {
  return tryCatch(
    async () => {
      let balancesResponse: TokenBalanceEntry[] = []
      try {
        balancesResponse = (await fetchOep4TokenBalances(address)) as TokenBalanceEntry[]
      } catch (err) {
        logger.warn('Failed to fetch bulk OEP4 balances', err)
      }

      const selectedTokens = Object.values(toSelectedTokenMap(selectedTokensByNetwork))
      const balances = await Promise.all(
        selectedTokens.map(async (oep4) => {
          const balanceEntry = balancesResponse.find((item) => item.asset_name === oep4.symbol)
          if (balanceEntry && balanceEntry.balance !== undefined) {
            return { ...oep4, balance: balanceEntry.balance }
          }
          const scriptHash = String(
            oep4.scriptHash || oep4.contractHash || oep4.contract_hash || ''
          )
          const balance = await queryOep4Balance(scriptHash, address, oep4.decimal || 0)
          return { ...oep4, balance }
        })
      )
      return { balances }
    },
    {
      context: 'loadSelectedOep4TokenBalances',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ balances: [] as TrackedOep4Token[] }),
    }
  )
}
