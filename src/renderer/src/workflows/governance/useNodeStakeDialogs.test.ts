import { describe, expect, it } from 'vitest'
import { useNodeStakeDialogs } from './useNodeStakeDialogs'

describe('useNodeStakeDialogs.tx', () => {
  it('stores SDK-like class instances without wrapping them in a reactive proxy', () => {
    const dialogs = useNodeStakeDialogs()
    class FakeTx {
      readonly tag = 'fake-tx'
      serialize() {
        if (this !== fakeTx) {
          throw new Error('tx was wrapped in a proxy — identity-sensitive SDK calls will fail')
        }
        return 'serialized'
      }
    }
    const fakeTx = new FakeTx()

    dialogs.tx.value = fakeTx

    expect(Object.is(dialogs.tx.value, fakeTx)).toBe(true)
    const serialize = (dialogs.tx.value as FakeTx).serialize.bind(dialogs.tx.value)
    expect(serialize()).toBe('serialized')
  })

  it('still resets tx.value to an empty string on resetSigningState', () => {
    const dialogs = useNodeStakeDialogs()
    dialogs.tx.value = { foo: 'bar' }
    dialogs.walletPassModal.value = true
    dialogs.isDelegateSendTx.value = false
    dialogs.isQuit.value = true
    dialogs.walletPassword.value = 'secret'

    dialogs.resetSigningState()

    expect(dialogs.tx.value).toBe('')
    expect(dialogs.walletPassModal.value).toBe(false)
    expect(dialogs.isDelegateSendTx.value).toBe(true)
    expect(dialogs.isQuit.value).toBe(false)
    expect(dialogs.walletPassword.value).toBe('')
  })
})
