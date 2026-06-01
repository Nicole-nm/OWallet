import { computed, getCurrentInstance, onBeforeUnmount, unref, watch } from 'vue'
import type { MaybeRef } from 'vue'
import i18n from '../../../lang'
import { APP_CLOSED } from '../../../shared/chain/ledgerTransport'
import { createLogger } from '../../../shared/lib/logger'
import { useLedgerConnectorStore } from '../../../stores/modules/LedgerConnector'
import { readLedgerConnectionSelection } from '../application/ledger/ledgerWalletConnectionService'

const logger = createLogger('useLedgerStatusMonitor')
const DEFAULT_LEDGER_STATUS_POLL_INTERVAL_MS = 1000

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
  let intervalId: ReturnType<typeof setInterval> | null = null
  let monitoringGeneration = 0
  let refreshRequest: { generation: number; promise: Promise<void> } | null = null

  function clearMonitoringInterval() {
    if (intervalId !== null) {
      globalThis.clearInterval(intervalId)
      intervalId = null
    }
  }

  function refreshLedgerStatus(generation = monitoringGeneration): Promise<void> {
    if (refreshRequest) {
      return refreshRequest.generation === generation
        ? refreshRequest.promise
        : refreshRequest.promise.then(() => refreshLedgerStatus(generation))
    }

    const request = {
      generation,
      promise: Promise.resolve(),
    }
    request.promise = (async () => {
      const connectionResult = await readLedgerConnectionSelection()
      if (generation !== monitoringGeneration) {
        return
      }

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
    })().finally(() => {
      if (refreshRequest === request) {
        refreshRequest = null
      }
    })
    refreshRequest = request
    return request.promise
  }

  function startMonitoring() {
    clearMonitoringInterval()
    monitoringGeneration += 1
    const generation = monitoringGeneration

    const pollingInterval =
      interval === undefined ? DEFAULT_LEDGER_STATUS_POLL_INTERVAL_MS : unref(interval)
    void refreshLedgerStatus(generation)

    if (pollingInterval === undefined) {
      return
    }

    intervalId = globalThis.setInterval(() => {
      void refreshLedgerStatus(generation)
    }, pollingInterval)
  }

  async function pauseMonitoring() {
    clearMonitoringInterval()
    await refreshRequest?.promise
  }

  function stopMonitoring() {
    clearMonitoringInterval()
    monitoringGeneration += 1
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

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      stopMonitoring()
    })
  }

  return {
    ledgerConnectorStore,
    ledgerStatus: computed(() => ledgerConnectorStore.ledgerStatus),
    ledgerPk: computed(() => ledgerConnectorStore.publicKey),
    ledgerWallet: computed(() => ledgerConnectorStore.ledgerWallet),
    startMonitoring,
    pauseMonitoring,
    stopMonitoring,
  }
}
