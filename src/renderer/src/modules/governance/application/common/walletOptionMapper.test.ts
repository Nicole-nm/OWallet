import { describe, expect, it } from 'vitest'
import { mapOperationWalletOptions, mapStakeWalletOptions } from './walletOptionMapper'

describe('walletOptionMapper', () => {
  describe('mapOperationWalletOptions', () => {
    it('defaults to an empty array when no input is provided', () => {
      expect(mapOperationWalletOptions()).toEqual([])
    })

    it('builds label/value/address/publicKey from each wallet', () => {
      expect(
        mapOperationWalletOptions([{ label: 'Alice', address: 'AAlice', publicKey: 'pk-a' }])
      ).toEqual([
        {
          label: 'Alice AAlice',
          value: 'pk-a',
          address: 'AAlice',
          publicKey: 'pk-a',
        },
      ])
    })

    it('falls back to empty strings for missing label/address/publicKey', () => {
      const [option] = mapOperationWalletOptions([{}])
      expect(option).toEqual({
        label: ' ',
        value: '',
        address: '',
        publicKey: '',
      })
    })
  })

  describe('mapStakeWalletOptions', () => {
    it('defaults to an empty array when no input is provided', () => {
      expect(mapStakeWalletOptions()).toEqual([])
    })

    it('omits the Ledger suffix when ledger flag is false', () => {
      expect(
        mapStakeWalletOptions([{ label: 'Alice', address: 'AAlice', publicKey: 'pk-a' }])
      ).toEqual([
        {
          label: 'Alice AAlice',
          value: 'AAlice',
          address: 'AAlice',
          publicKey: 'pk-a',
        },
      ])
    })

    it('appends the Ledger suffix when ledger flag is true', () => {
      const result = mapStakeWalletOptions(
        [{ label: 'Alice', address: 'AAlice', publicKey: 'pk-a' }],
        { ledger: true }
      )
      expect(result[0]?.label).toBe('Alice AAlice (Ledger)')
    })

    it('does not reorder non-ledger lists', () => {
      const result = mapStakeWalletOptions([
        { label: 'A', address: 'A1', timestamp: 1 },
        { label: 'B', address: 'B1', timestamp: 2 },
      ])
      expect(result.map((w) => w.address)).toEqual(['A1', 'B1'])
    })

    it('sorts ledger wallets by descending timestamp', () => {
      const result = mapStakeWalletOptions(
        [
          { label: 'A', address: 'A1', timestamp: 10 },
          { label: 'B', address: 'B1', timestamp: 30 },
          { label: 'C', address: 'C1', timestamp: 20 },
        ],
        { ledger: true }
      )
      expect(result.map((w) => w.address)).toEqual(['B1', 'C1', 'A1'])
    })

    it('breaks ledger timestamp ties by descending acct', () => {
      const result = mapStakeWalletOptions(
        [
          { label: 'A', address: 'A1', timestamp: 5, acct: 2 },
          { label: 'B', address: 'B1', timestamp: 5, acct: 7 },
        ],
        { ledger: true }
      )
      expect(result.map((w) => w.address)).toEqual(['B1', 'A1'])
    })

    it('treats missing ledger timestamps/acct as zero when sorting', () => {
      const result = mapStakeWalletOptions(
        [
          { label: 'A', address: 'A1' },
          { label: 'B', address: 'B1' },
        ],
        { ledger: true }
      )
      expect(result.map((w) => w.address)).toEqual(['A1', 'B1'])
    })

    it('falls back to empty strings for missing fields', () => {
      const [option] = mapStakeWalletOptions([{}])
      expect(option).toEqual({
        label: ' ',
        value: '',
        address: '',
        publicKey: '',
      })
    })
  })
})
