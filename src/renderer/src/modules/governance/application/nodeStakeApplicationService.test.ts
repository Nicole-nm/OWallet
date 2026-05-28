import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  nodeStakeService: {
    createStakeInfo: vi.fn(),
    fetchNodeInfo: vi.fn(),
    fetchStakeDetail: vi.fn(),
    serializeNodeStakeInfo: vi.fn(() => 'hex-node-info'),
    updateLedgerNodeInfo: vi.fn(),
    updateNodeInfo: vi.fn(),
  },
}))

vi.mock('../../../lang', () => ({
  default: {
    global: {
      t: (key: unknown) => key,
    },
  },
}))

vi.mock('../../../domains/nodeStake/applicationService', () => ({
  createStakeInfo: mocks.nodeStakeService.createStakeInfo,
  fetchNodeInfo: mocks.nodeStakeService.fetchNodeInfo,
  fetchStakeDetail: mocks.nodeStakeService.fetchStakeDetail,
  serializeNodeStakeInfo: mocks.nodeStakeService.serializeNodeStakeInfo,
  updateLedgerNodeInfo: mocks.nodeStakeService.updateLedgerNodeInfo,
  updateNodeInfo: mocks.nodeStakeService.updateNodeInfo,
}))

import {
  createEmptyStakeStatus,
  createNodeStakeProfileDraft,
  createPendingNodeStakeInfo,
  describeStakeStatus,
  loadNodeStakeProfile,
  loadStakeDetail,
  saveLedgerNodeStakeProfile,
  saveNodeStakeProfile,
} from './nodeStakeApplicationService'

describe('nodeStakeApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps stake detail into normalized detail and translated status text', async () => {
    mocks.nodeStakeService.fetchStakeDetail.mockResolvedValue({
      status: '2',
      public_key: 'pk-1',
      address: 'AQ123',
    })

    await expect(
      loadStakeDetail({
        network: 'TEST_NET',
        payload: { ontid: 'did:ont:1' },
      })
    ).resolves.toEqual({
      ok: true,
      detail: expect.objectContaining({
        status: 2,
        publicKey: 'pk-1',
        nodeAddress: 'AQ123',
      }),
      stakeStatus: {
        status1: 'nodeStakeStatus.transfered',
        status2: 'nodeStakeStatus.auditing',
        status3: 'nodeStakeStatus.stake',
        current: 1,
        statusTip: 'nodeStakeStatus.auditNeedTime',
      },
    })
  })

  it('returns a normalized network error when stake detail loading fails', async () => {
    mocks.nodeStakeService.fetchStakeDetail.mockRejectedValue(new Error('network down'))

    await expect(
      loadStakeDetail({
        network: 'TEST_NET',
        payload: { address: 'did:ont:1' },
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      error: expect.any(Error),
      detail: expect.objectContaining({
        publicKey: '',
      }),
      stakeStatus: createEmptyStakeStatus(),
    })
  })

  it('loads node profile data without involving the store', async () => {
    mocks.nodeStakeService.fetchNodeInfo.mockResolvedValue({
      name: 'Node 1',
      logo_url: 'https://example.com/logo.png',
      contact_mail: 'contact@example.com',
      open_mail: 'public@example.com',
      open_flag: true,
    })

    await expect(
      loadNodeStakeProfile({
        network: 'MAIN_NET',
        publicKey: 'pk-1',
      })
    ).resolves.toEqual({
      ok: true,
      info: expect.objectContaining({
        name: 'Node 1',
        logoUrl: 'https://example.com/logo.png',
        contactEmail: 'contact@example.com',
        publicEmail: 'public@example.com',
        isPublic: true,
      }),
    })
  })

  it('creates a serialized node profile draft and returns mutation failure when the API rejects it', async () => {
    expect(
      createNodeStakeProfileDraft({
        info: {
          name: 'Node 1',
          logoUrl: 'https://example.com/logo.png',
          contactEmail: 'contact@example.com',
          publicEmail: 'public@example.com',
          isPublic: true,
        },
        nodePublicKey: 'pk-1',
        address: 'AQ123',
      })
    ).toEqual(
      expect.objectContaining({
        ok: true,
        tx: expect.any(String),
        nodeInfo: expect.any(String),
        payload: expect.objectContaining({
          name: 'Node 1',
          logo_url: 'https://example.com/logo.png',
          contact_mail: 'contact@example.com',
          open_mail: 'public@example.com',
          open_flag: true,
          public_key: 'pk-1',
          address: 'AQ123',
        }),
      })
    )

    mocks.nodeStakeService.updateNodeInfo.mockResolvedValue({ code: -1, message: 'bad request' })

    await expect(
      saveNodeStakeProfile({
        network: 'MAIN_NET',
        nodeInfo: { data: 'hex-node-info' },
        walletPublicKey: 'pk-1',
        address: 'AQ123',
        signature: 'sig',
      })
    ).resolves.toEqual({
      ok: false,
      response: { code: -1, message: 'bad request' },
      errorKey: 'nodeInfo.updateFailed',
    })

    expect(mocks.nodeStakeService.updateNodeInfo).toHaveBeenCalledWith('MAIN_NET', {
      node_info: { data: 'hex-node-info' },
      public_key: 'pk-1',
      address: 'AQ123',
      signature: 'sig',
    })
  })

  it('supports ledger node profile updates and pending node creation', async () => {
    mocks.nodeStakeService.updateLedgerNodeInfo.mockResolvedValue({ code: 0 })
    mocks.nodeStakeService.createStakeInfo.mockResolvedValue({ code: 0 })

    await expect(
      saveLedgerNodeStakeProfile({
        network: 'MAIN_NET',
        nodeInfo: { data: 'hex-node-info' },
        walletPublicKey: 'pk-1',
      })
    ).resolves.toEqual({
      ok: true,
      response: { code: 0 },
    })

    expect(mocks.nodeStakeService.updateLedgerNodeInfo).toHaveBeenCalledWith('MAIN_NET', {
      node_info: { data: 'hex-node-info' },
      public_key: 'pk-1',
    })

    await expect(
      createPendingNodeStakeInfo({
        network: 'MAIN_NET',
        info: { name: 'Node_abcdef', address: 'AQ123', publicKey: 'pk-1' },
      })
    ).resolves.toEqual({
      ok: true,
      response: { code: 0 },
    })

    expect(mocks.nodeStakeService.createStakeInfo).toHaveBeenCalledWith('MAIN_NET', {
      name: 'Node_abcdef',
      address: 'AQ123',
      public_key: 'pk-1',
    })
  })

  it('describes refunded and exited node status consistently', () => {
    expect(describeStakeStatus(6)).toEqual({
      status1: 'nodeStakeStatus.nodeExited',
      status2: 'nodeStakeStatus.refunded',
      status3: 'nodeStakeStatus.stakeExited',
      current: 2,
      statusTip: '',
    })
  })
})
