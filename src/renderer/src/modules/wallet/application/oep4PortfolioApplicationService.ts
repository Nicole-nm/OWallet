import {
  queryOep4Balance,
  queryAllOep4Balances,
  queryOep4Decimal,
  queryOep4StringProperty,
  hasOep4Contract,
} from '../../../domains/wallet/oep4Service'
import {
  queryOep4TransactionHistory,
  registerOep4Contract,
} from '../../../domains/wallet/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import type { TrackedOep4Token, TransactionRecord } from '../../../shared/types'

const logger = createLogger('oep4PortfolioApplicationService')

interface Oep4PortfolioParams {
  scriptHash: string
  address: string
  network: string
}

interface Oep4BalanceParams {
  oep4s?: TrackedOep4Token[]
  address: string
  network: string
}

interface Oep4TransferRecord {
  AssetName?: string
  FromAddress?: string
  Amount?: string | number
}

interface Oep4TransactionGroup {
  TxnHash?: string
  TransferList?: Oep4TransferRecord[]
}

export async function createTrackedOep4Token({
  scriptHash,
  address,
  network,
}: Oep4PortfolioParams) {
  const built = await tryCatch(
    async () => {
      const hasContract = await hasOep4Contract(scriptHash)
      if (!hasContract) return { token: null }

      const name = await queryOep4StringProperty(scriptHash, 'name')
      const symbol = await queryOep4StringProperty(scriptHash, 'symbol')
      const decimal = await queryOep4Decimal(scriptHash)
      const balance = await queryOep4Balance(scriptHash, address, decimal)
      void registerOep4Contract(network, scriptHash)

      return {
        token: {
          contractHash: scriptHash,
          contract_hash: scriptHash,
          name,
          symbol,
          scriptHash,
          decimal,
          decimals: decimal,
          balance,
          net: network,
        },
      }
    },
    { context: 'createTrackedOep4Token', errorKey: 'common.networkErr', logger }
  )

  if (!built.ok) return built
  if (!built.token) return { ok: false as const, errorKey: 'commonWalletHome.noOep4Contract' }
  return built
}

export async function loadTrackedOep4Balances({ oep4s = [], address, network }: Oep4BalanceParams) {
  return tryCatch(
    async () => {
      const balances = await queryAllOep4Balances(
        oep4s as Array<TrackedOep4Token & { scriptHash: string }>,
        address,
        network
      )
      return {
        balances: oep4s.map((item, index) => ({
          ...item,
          balance: balances[index],
        })),
      }
    },
    {
      context: 'loadTrackedOep4Balances',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ balances: [] as unknown[] }),
    }
  )
}

export async function loadTrackedOep4Transactions({
  address,
  oep4s = [],
  network,
}: Oep4BalanceParams) {
  return tryCatch(
    async () => {
      const resultResponse = await queryOep4TransactionHistory(network, address, 10, 1)
      const result = (resultResponse.ok ? resultResponse.data : null) as {
        TxnList?: Oep4TransactionGroup[]
      } | null
      const completed: Array<Record<string, unknown>> = []

      for (const transactionGroup of result?.TxnList || []) {
        for (const transfer of transactionGroup.TransferList || []) {
          if (transfer.AssetName === 'ong') continue

          for (const oep4 of oep4s) {
            if (oep4.symbol !== transfer.AssetName && transfer.AssetName !== 'LCY') continue
            const amount =
              transfer.FromAddress === address ? `-${transfer.Amount}` : `+${transfer.Amount}`
            completed.push({
              txHash: String(transactionGroup.TxnHash || ''),
              asset: transfer.AssetName,
              amount,
            })
            break
          }
        }
      }

      return { transactions: completed as TransactionRecord[] }
    },
    {
      context: 'loadTrackedOep4Transactions',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ transactions: [] as unknown[] }),
    }
  )
}
