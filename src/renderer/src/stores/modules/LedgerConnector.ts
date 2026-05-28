import { defineStore } from 'pinia'
import type { LedgerWalletSelection } from '../../shared/types'

function createDefaultLedgerWallet(): LedgerWalletSelection {
  return {
    address: '',
    publicKey: '',
  }
}

export const useLedgerConnectorStore = defineStore('LedgerConnector', {
  state: () => ({
    ledgerStatus: '',
    deviceInfo: '',
    publicKey: '',
    ledgerWallet: createDefaultLedgerWallet(),
  }),
  actions: {
    setLedgerDeviceInfo(deviceInfo = '') {
      this.deviceInfo = deviceInfo
    },
    setLedgerPublicKey(publicKey = '') {
      this.publicKey = publicKey
    },
    setLedgerStatus(ledgerStatus = '') {
      this.ledgerStatus = ledgerStatus
    },
    setLedgerWallet(ledgerWallet: LedgerWalletSelection = createDefaultLedgerWallet()) {
      this.ledgerWallet = ledgerWallet
    },
    resetLedgerState() {
      this.deviceInfo = ''
      this.publicKey = ''
      this.ledgerStatus = ''
      this.ledgerWallet = createDefaultLedgerWallet()
    },
  },
})
