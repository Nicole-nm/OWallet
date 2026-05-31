import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { CommonWallet, HardwareWallet, SharedWallet } from '../../../shared/lib/types'
import { useWalletSearchFilter, walletSearchableFields } from './useWalletSearchFilter'

const commonWallet: CommonWallet = {
  address: 'AN5fA1BcD2eF',
  label: 'Cold Storage',
  publicKey: 'pubkey',
  key: 'k',
  salt: 's',
  algorithm: 'aes',
  parameters: { curve: 'p256' },
  scrypt: { n: 0, r: 0, p: 0, dkLen: 0 },
}

const hardwareWallet: HardwareWallet = {
  address: 'AH9zX2YyW3vV',
  label: 'Ledger A',
  publicKey: 'pubkey',
  neo: false,
  acct: 0,
  timestamp: 1,
}

const sharedWallet: SharedWallet = {
  address: '',
  label: '',
  publicKey: '',
  sharedWalletAddress: 'AS3kK4LlM5nN',
  sharedWalletName: 'Treasury',
  coPayers: [],
  requiredNumber: '2',
  totalNumber: '3',
}

describe('walletSearchableFields', () => {
  it('returns label and address for a CommonWallet', () => {
    expect(walletSearchableFields(commonWallet)).toEqual([commonWallet.label, commonWallet.address])
  })

  it('returns label and address for a HardwareWallet', () => {
    expect(walletSearchableFields(hardwareWallet)).toEqual([
      hardwareWallet.label,
      hardwareWallet.address,
    ])
  })

  it('returns shared name/address for a SharedWallet even when base fields are empty', () => {
    expect(walletSearchableFields(sharedWallet)).toEqual([
      sharedWallet.sharedWalletName,
      sharedWallet.sharedWalletAddress,
    ])
  })
})

describe('useWalletSearchFilter', () => {
  it('matches against the current value of the query ref', () => {
    const query = ref('')
    const { matches } = useWalletSearchFilter(query)

    expect(matches(commonWallet)).toBe(true)
    expect(matches(sharedWallet)).toBe(true)

    query.value = 'cold'
    expect(matches(commonWallet)).toBe(true)
    expect(matches(hardwareWallet)).toBe(false)
    expect(matches(sharedWallet)).toBe(false)

    query.value = 'treasury'
    expect(matches(sharedWallet)).toBe(true)
    expect(matches(commonWallet)).toBe(false)

    query.value = 'AS3K'
    expect(matches(sharedWallet)).toBe(true)
  })
})
