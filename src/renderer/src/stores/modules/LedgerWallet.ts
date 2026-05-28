import { defineStore } from 'pinia'
import type { LedgerWalletSelection } from '../../shared/types'

export const useLedgerWalletStore = defineStore('LedgerWallet', {
  state: () => ({
    publicKey: '',
    address: '',
    isHardwareLogin: true,
  }),
  actions: {
    setLoggedInLedger(ledgerWallet: Partial<LedgerWalletSelection> = {}) {
      this.publicKey = ledgerWallet.publicKey || ''
      this.address = ledgerWallet.address || ''
    },
    resetLoggedInLedger() {
      this.publicKey = ''
      this.address = ''
    },
  },
})
