import { getExplorerAddressPageUrl, getExplorerTxPageUrl } from '../../../shared/lib/urlBuilder'
import { GOVERNANCE_ONG_ADDRESS } from '../../../shared/lib/constants'
import { fetchExchangeRate } from '../../../domains/market/applicationService'
import {
  fetchNativeBalance,
  fetchWalletTransactionGroups,
} from '../../../domains/wallet/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'

const logger = createLogger('walletDashboardApplicationService')

interface WalletDashboardTransaction {
  txHash: string
  asset: string
  amount: string | number
}

interface WalletTransactionTransfer {
  asset_name: string
  to_address: string
  from_address: string
  amount: string
}

interface WalletTransactionGroup {
  tx_hash: string
  transfers?: WalletTransactionTransfer[]
}

export function getWalletTransactionExplorerUrl({
  txHash,
  network,
}: {
  txHash: string
  network: string
}) {
  return getExplorerTxPageUrl(txHash, network)
}

export function getWalletAddressExplorerUrl({
  address,
  network,
}: {
  address: string
  network: string
}) {
  return getExplorerAddressPageUrl(address, network)
}

export async function loadWalletNativeBalance(address: string) {
  const balanceResult = await fetchNativeBalance(address)
  if (!balanceResult.ok) {
    return { ok: false, balance: null, errorKey: balanceResult.errorKey }
  }

  return { ok: true, balance: balanceResult.data }
}

export async function loadWalletExchangeValue({
  asset = 'ont',
  currency = 'USD',
  amount,
}: {
  asset?: string
  currency?: string
  amount: number | string
}) {
  const value = await fetchExchangeRate(asset, currency, amount)
  return {
    ok: value !== null,
    value,
    errorKey: value === null ? 'common.networkErr' : undefined,
  }
}

export async function loadWalletTransactions({
  address,
  network,
  filterGovernanceOng = false,
  txSliceCount = 10,
}: {
  address: string
  network: string
  filterGovernanceOng?: boolean
  txSliceCount?: number
}) {
  return tryCatch(
    async () => {
      const groupsResult = await fetchWalletTransactionGroups({
        address,
        network,
        pageSize: txSliceCount,
      })
      const groups = (groupsResult.ok ? groupsResult.data : []) as WalletTransactionGroup[]
      const completed: WalletDashboardTransaction[] = []

      for (const group of groups) {
        for (const transfer of group.transfers || []) {
          const asset = transfer.asset_name.toUpperCase()
          if (
            filterGovernanceOng &&
            transfer.to_address === GOVERNANCE_ONG_ADDRESS &&
            asset === 'ONG'
          ) {
            continue
          }

          const amountValue = asset === 'ONT' ? parseInt(transfer.amount, 10) : transfer.amount
          const signedAmount =
            transfer.from_address === address ? `-${amountValue}` : `+${amountValue}`
          completed.push({ txHash: group.tx_hash, asset, amount: signedAmount })
        }
      }

      return { transactions: completed.slice(0, txSliceCount) }
    },
    {
      context: 'loadWalletTransactions',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ transactions: [] as WalletDashboardTransaction[] }),
    }
  )
}
