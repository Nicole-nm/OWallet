import { defineStore } from 'pinia'
import { loadStoredOep4s, saveStoredOep4s } from '../../shared/persistence/walletLocalState'
import type { TrackedOep4Token } from '../../shared/types'
import type { TransactionRecord } from '../../shared/types'

const initialTrackedOep4s = loadStoredOep4s()

function normalizeTrackedOep4s(oep4s: unknown) {
  return Array.isArray(oep4s) ? (oep4s as TrackedOep4Token[]) : []
}

export const useOep4sStore = defineStore('Oep4s', {
  state: () => ({
    oep4s: initialTrackedOep4s,
    completedTx: [] as TransactionRecord[],
  }),
  actions: {
    addOep4(newOep4: TrackedOep4Token) {
      const nextOep4s = [...this.oep4s, newOep4]
      saveStoredOep4s(nextOep4s)
      this.oep4s = nextOep4s
    },
    setOep4s(oep4s: TrackedOep4Token[] = []) {
      const nextOep4s = normalizeTrackedOep4s(oep4s)
      saveStoredOep4s(nextOep4s)
      this.oep4s = nextOep4s
    },
    setCompletedTx(completedTx: TransactionRecord[] = []) {
      this.completedTx = Array.isArray(completedTx) ? completedTx : []
    },
    setPortfolio({
      oep4s = [],
      completedTx = [],
    }: { oep4s?: TrackedOep4Token[]; completedTx?: TransactionRecord[] } = {}) {
      this.setOep4s(oep4s)
      this.setCompletedTx(completedTx)
    },
    resetCompletedTx() {
      this.completedTx = []
    },
  },
})
