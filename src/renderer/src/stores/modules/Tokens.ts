import { defineStore } from 'pinia'
import { NETWORKS } from '../../shared/lib/constants'
import {
  loadStoredOep4Tokens,
  saveStoredOep4Tokens,
} from '../../shared/persistence/walletLocalState'
import type { Oep4TokensByNetwork, TrackedOep4Token } from '../../shared/types'

interface TokenSelectionItem {
  contract_hash: string
  decimal?: number
  symbol: string
  selected?: boolean
  [key: string]: unknown
}

const oep4_default: Oep4TokensByNetwork = {
  [NETWORKS.TEST_NET]: {},
  [NETWORKS.MAIN_NET]: {},
}
const oep4TokensInit = loadStoredOep4Tokens(oep4_default)

export const useTokensStore = defineStore('Tokens', {
  state: () => ({
    oep4Tokens: oep4TokensInit,
    oep4WithBalances: [] as TrackedOep4Token[],
  }),
  actions: {
    setOep4Tokens(net: string, oep4s: Record<string, TrackedOep4Token>) {
      this.oep4Tokens[net] = oep4s
      saveStoredOep4Tokens(this.oep4Tokens)
    },
    setOep4Token(net: string, oep4: TokenSelectionItem) {
      const oep4s = Object.assign({}, this.oep4Tokens[net] ?? {})
      if (oep4s[oep4.contract_hash]) {
        for (const k of Object.keys(oep4s)) {
          const currentToken = oep4s[k]
          if (currentToken?.contract_hash === oep4.contract_hash) {
            if (oep4.selected) {
              oep4s[k] = {
                ...currentToken,
                ...oep4,
                selected: oep4.selected,
              }
            } else {
              delete oep4s[k]
            }
            break
          }
        }
      } else {
        oep4s[oep4.contract_hash] = oep4 as unknown as TrackedOep4Token
      }
      this.oep4Tokens[net] = oep4s
      saveStoredOep4Tokens(this.oep4Tokens)
    },
    setOep4Balances(balances: TrackedOep4Token[] = []) {
      this.oep4WithBalances = balances
    },
    resetOep4Balances() {
      this.oep4WithBalances = []
    },
  },
})
