import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchIdentityCollection: vi.fn(),
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  fetchIdentityCollection: (...args: any[]) => mocks.fetchIdentityCollection(...args),
}))

import { loadIdentityCollection } from './identityCollectionApplicationService'
import type { Identity } from '../../../shared/lib/types'

function createIdentitiesStore() {
  return {
    identities: [] as Identity[],
    hasLoadedIdentities: false,
  }
}

describe('identityCollectionApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns identities without mutating the store', async () => {
    const identitiesStore = createIdentitiesStore()
    mocks.fetchIdentityCollection.mockResolvedValue({
      ok: true,
      data: [{ ontid: 'did:ont:1', label: 'Main' }],
    })

    await expect(
      loadIdentityCollection({
        currentIdentities: identitiesStore.identities,
        hasLoadedIdentities: identitiesStore.hasLoadedIdentities,
      })
    ).resolves.toEqual({
      ok: true,
      identities: [{ ontid: 'did:ont:1', label: 'Main' }],
    })
  })

  it('returns current identities when fetching identities fails', async () => {
    const identitiesStore = createIdentitiesStore()
    identitiesStore.identities = [{ ontid: 'did:ont:1', label: 'Main', controls: [] }]
    mocks.fetchIdentityCollection.mockResolvedValue({
      ok: false,
      errorKey: 'common.networkErr',
    })

    await expect(
      loadIdentityCollection({
        currentIdentities: identitiesStore.identities,
        hasLoadedIdentities: identitiesStore.hasLoadedIdentities,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      identities: [{ ontid: 'did:ont:1', label: 'Main', controls: [] }],
    })
  })

  it('returns cached identities when already loaded', async () => {
    const identitiesStore = createIdentitiesStore()
    identitiesStore.identities = [{ ontid: 'did:ont:1', label: 'Main', controls: [] }]
    identitiesStore.hasLoadedIdentities = true

    await expect(
      loadIdentityCollection({
        currentIdentities: identitiesStore.identities,
        hasLoadedIdentities: identitiesStore.hasLoadedIdentities,
      })
    ).resolves.toEqual({
      ok: true,
      cached: true,
      identities: [{ ontid: 'did:ont:1', label: 'Main', controls: [] }],
    })

    expect(mocks.fetchIdentityCollection).not.toHaveBeenCalled()
  })
})
