import { defineStore } from 'pinia'
import type { Identity } from '../../shared/lib/types'

export const useIdentitiesStore = defineStore('Identities', {
  state: () => ({
    identities: [] as Identity[],
    hasLoadedIdentities: false,
  }),
  actions: {
    setIdentities(identities: Identity[] = []) {
      this.identities = identities
    },
    setIdentitiesLoaded(loaded: boolean) {
      this.hasLoadedIdentities = loaded
    },
    deleteIdentity(ontid: string) {
      const identities = this.identities.slice()
      const index = identities.findIndex((w) => w.ontid === ontid)
      if (index < 0) return
      identities.splice(index, 1)
      this.identities = identities
    },
    resetIdentities() {
      this.setIdentities([])
      this.setIdentitiesLoaded(false)
    },
  },
})
