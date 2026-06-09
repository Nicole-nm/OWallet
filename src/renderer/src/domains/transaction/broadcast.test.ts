import { vi, describe, it, expect } from 'vitest'

const mocks = vi.hoisted(() => ({
  getRestClient: vi.fn(),
  serializeTx: vi.fn(),
}))

vi.mock('../../shared/chain/restClient', () => ({
  getRestClient: () => mocks.getRestClient(),
}))

vi.mock('./serializationService', () => ({
  serializeTx: (...args: unknown[]) => mocks.serializeTx(...args),
}))

import { sendTx, preExecTx } from './broadcast'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'

describe('transaction broadcasting', () => {
  it('serializes normal and pre-execution broadcasts', () => {
    const sendRawTransaction = vi.fn()
    const tx = createFakeTransaction()
    mocks.getRestClient.mockReturnValue({ sendRawTransaction })
    mocks.serializeTx.mockReturnValue('serialized-tx')

    sendTx(tx)
    preExecTx(tx)

    expect(sendRawTransaction).toHaveBeenNthCalledWith(1, 'serialized-tx')
    expect(sendRawTransaction).toHaveBeenNthCalledWith(2, 'serialized-tx', true)
  })
})
