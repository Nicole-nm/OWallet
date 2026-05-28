import { BigNumber } from 'bignumber.js'
import {
  findLocalAccount,
  getLocalCopayers,
  hasLocalCopayer,
} from '../../../domains/wallet/applicationService'
import { queryPendingTransfer } from '../../../domains/sharedWallet/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import type { PendingSharedTransfer, SharedCopayer } from '../../../shared/types'

const logger = createLogger('sharedWalletOverviewApplicationService')

interface PendingSharedTransferParams {
  network: string
  sharedWalletAddress: string
}

type PendingSharedTransferResponse = {
  SigningSharedTransfers?: Array<
    Record<string, unknown> & { assetName?: string; amount?: string | number }
  >
}

export async function loadPendingSharedTransfers({
  network,
  sharedWalletAddress,
}: PendingSharedTransferParams) {
  return tryCatch(
    async () => {
      const result = (await queryPendingTransfer(network, {
        sharedAddress: sharedWalletAddress,
        beforeTimeStamp: Date.now(),
      })) as PendingSharedTransferResponse
      return {
        transfers: (result.SigningSharedTransfers || []).map((item) => {
          if (String(item.assetName || '').toLowerCase() === 'ong') {
            return { ...item, amount: new BigNumber(item.amount ?? 0).div(1e9).toFixed(9) }
          }
          return item
        }) as PendingSharedTransfer[],
      }
    },
    {
      context: 'loadPendingSharedTransfers',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ transfers: [] as PendingSharedTransfer[] }),
    }
  )
}

export async function loadLocalSharedCopayers(copayers: SharedCopayer[] = []) {
  return tryCatch(async () => ({ copayers: await getLocalCopayers(copayers) }), {
    context: 'loadLocalSharedCopayers',
    errorKey: 'common.networkErr',
    logger,
    onFailure: () => ({ copayers: [] as SharedCopayer[] }),
  })
}

export async function findLocalSharedSigner(address: string) {
  return tryCatch(
    async () => {
      const account = await findLocalAccount(address)
      return { signer: account ? { ...account.wallet, type: account.type } : null }
    },
    {
      context: 'findLocalSharedSigner',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ signer: null }),
    }
  )
}

export async function checkSharedWalletHasLocalCopayer(copayers: SharedCopayer[] = []) {
  return tryCatch(async () => ({ hasLocalCopayer: await hasLocalCopayer(copayers) }), {
    context: 'checkSharedWalletHasLocalCopayer',
    errorKey: 'common.networkErr',
    logger,
    onFailure: () => ({ hasLocalCopayer: false }),
  })
}
