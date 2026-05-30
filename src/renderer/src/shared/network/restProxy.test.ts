import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchJson = vi.hoisted(() => vi.fn())

vi.mock('../platform/bridge', () => ({
  fetchJson,
}))

import { RestProxy } from './restProxy'

beforeEach(() => {
  fetchJson.mockReset()
  fetchJson.mockResolvedValue({ Error: 0, Result: 'ok' })
})

describe('RestProxy', () => {
  it('strips a trailing slash from the base url', async () => {
    const proxy = new RestProxy('https://node.test/')
    await proxy.getBlockHeight()

    expect(fetchJson).toHaveBeenCalledWith('https://node.test/api/v1/block/height')
  })

  it('posts raw transactions and toggles preExec via query string', async () => {
    const proxy = new RestProxy('https://node.test')
    await proxy.sendRawTransaction('deadbeef', true)

    expect(fetchJson).toHaveBeenCalledWith('https://node.test/api/v1/transaction?preExec=1', {
      method: 'POST',
      body: { Action: 'sendrawtransaction', Version: '1.0.0', Data: 'deadbeef' },
    })
  })

  it('omits the preExec query when disabled', async () => {
    const proxy = new RestProxy('https://node.test')
    await proxy.sendRawTransaction('deadbeef')

    expect(fetchJson).toHaveBeenCalledWith(
      'https://node.test/api/v1/transaction',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('accepts an address object exposing toBase58 for balance queries', async () => {
    const proxy = new RestProxy('https://node.test')
    await proxy.getBalance({ toBase58: () => 'AddrBase58' })

    expect(fetchJson).toHaveBeenCalledWith('https://node.test/api/v1/balance/AddrBase58')
  })

  it('builds allowance urls from string addresses', async () => {
    const proxy = new RestProxy('https://node.test')
    await proxy.getAllowance('ong', 'fromAddr', 'toAddr')

    expect(fetchJson).toHaveBeenCalledWith('https://node.test/api/v1/allowance/ong/fromAddr/toAddr')
  })

  it('builds contract, storage and block-detail urls', async () => {
    const proxy = new RestProxy('https://node.test')
    await proxy.getContract('hash')
    await proxy.getStorage('hash', 'key')
    await proxy.getBlockJson(42)

    expect(fetchJson).toHaveBeenNthCalledWith(1, 'https://node.test/api/v1/contract/hash')
    expect(fetchJson).toHaveBeenNthCalledWith(2, 'https://node.test/api/v1/storage/hash/key')
    expect(fetchJson).toHaveBeenNthCalledWith(3, 'https://node.test/api/v1/block/details/height/42')
  })

  it('resolves unbound and grant ong urls from an address object', async () => {
    const proxy = new RestProxy('https://node.test')
    const account = { toBase58: () => 'AddrBase58' }
    await proxy.getUnboundong(account)
    await proxy.getGrantOng(account)

    expect(fetchJson).toHaveBeenNthCalledWith(1, 'https://node.test/api/v1/unboundong/AddrBase58')
    expect(fetchJson).toHaveBeenNthCalledWith(2, 'https://node.test/api/v1/grantong/AddrBase58')
  })
})
