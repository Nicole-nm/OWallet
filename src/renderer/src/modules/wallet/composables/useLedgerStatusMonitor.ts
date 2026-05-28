import { computed, onBeforeUnmount, unref, watch } from 'vue'
import type { MaybeRef } from 'vue'
import i18n from '../../../lang'
import { APP_CLOSED } from '../../../shared/chain/ledgerTransport'
import { createLogger } from '../../../shared/lib/logger'
import { useLedgerConnectorStore } from '../../../stores/modules/LedgerConnector'
import { readLedgerConnectionSelection } from '../application/ledgerWalletConnectionService'

const logger = createLogger('useLedgerStatusMonitor')

function translateLedgerStatus(status: string) {
  return i18n.global.t(`ledgerStatus.${status}`)
}

function getLedgerStatusFromError(error: unknown) {
  if (error === 'NOT_FOUND') {
    return translateLedgerStatus('NOT_FOUND')
  }

  if (error === 'NOT_SUPPORT') {
    return translateLedgerStatus('NOT_SUPPORT')
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === APP_CLOSED
  ) {
    return translateLedgerStatus('NOT_OPEN')
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  logger.error('refreshLedgerStatus.unknown', error)
  return translateLedgerStatus('NO_DEVICE')
}

export function useLedgerStatusMonitor({
  shouldPoll,
  interval,
}: {
  shouldPoll?: MaybeRef<boolean>
  interval?: MaybeRef<number | undefined>
} = {}) {
  const ledgerConnectorStore = useLedgerConnectorStore()
  let intervalId: number | null = null

  async function refreshLedgerStatus() {
    const connectionResult = await readLedgerConnectionSelection()
    if (!connectionResult.ok) {
      ledgerConnectorStore.resetLedgerState()
      ledgerConnectorStore.setLedgerStatus(getLedgerStatusFromError(connectionResult.error))
      return
    }

    const selection = connectionResult.selection
    ledgerConnectorStore.setLedgerDeviceInfo(String(connectionResult.deviceInfo || ''))
    ledgerConnectorStore.setLedgerPublicKey(selection?.publicKey || '')
    ledgerConnectorStore.setLedgerWallet({
      publicKey: selection?.publicKey || '',
      address: selection?.address || '',
    })
    ledgerConnectorStore.setLedgerStatus(translateLedgerStatus('READY'))
  }

  function startMonitoring() {
    stopMonitoring()

    const pollingInterval = interval === undefined ? undefined : unref(interval)
    void refreshLedgerStatus()

    if (pollingInterval === undefined) {
      return
    }

    intervalId = window.setInterval(() => {
      void refreshLedgerStatus()
    }, pollingInterval)
  }

  function stopMonitoring() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    ledgerConnectorStore.resetLedgerState()
  }

  if (shouldPoll !== undefined) {
    watch(
      () => unref(shouldPoll),
      (enabled) => {
        if (enabled) {
          startMonitoring()
          return
        }

        stopMonitoring()
      },
      { immediate: true }
    )
  }

  onBeforeUnmount(() => {
    stopMonitoring()
  })

  return {
    ledgerConnectorStore,
    ledgerStatus: computed(() => ledgerConnectorStore.ledgerStatus),
    ledgerPk: computed(() => ledgerConnectorStore.publicKey),
    ledgerWallet: computed(() => ledgerConnectorStore.ledgerWallet),
    startMonitoring,
    stopMonitoring,
  }
}
