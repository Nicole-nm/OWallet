import dbService, { dbFind } from '../../shared/persistence/dbService'
import {
  WalletType,
  type DbWalletRecord as WalletRecord,
  type SharedWalletRecord,
  type HardwareWalletRecord,
  type WalletCollections,
  type CommonWallet,
  type SharedWallet,
  type HardwareWallet,
  type Identity,
} from './types'

interface DbRecord<T> {
  _id?: string
  type: WalletType | 'Identity'
  address: string
  wallet: T
}

type AnyWalletRecord = DbRecord<WalletRecord | SharedWalletRecord | HardwareWalletRecord>
type LocalAccountRecord = DbRecord<WalletRecord | HardwareWalletRecord>

export async function findWalletCollections(): Promise<WalletCollections> {
  const walletDocs = await dbFind<AnyWalletRecord>(dbService, {
    type: { $in: [WalletType.CommonWallet, WalletType.SharedWallet, WalletType.HardwareWallet] },
  })

  const collections: WalletCollections = {
    normalWallets: [],
    sharedWallets: [],
    hardwareWallets: [],
  }

  for (const item of walletDocs) {
    if (item.type === WalletType.CommonWallet) {
      collections.normalWallets.push(item.wallet as unknown as CommonWallet)
    } else if (item.type === WalletType.SharedWallet) {
      collections.sharedWallets.push(item.wallet as unknown as SharedWallet)
    } else if (item.type === WalletType.HardwareWallet) {
      collections.hardwareWallets.push(item.wallet as unknown as HardwareWallet)
    }
  }

  return collections
}

export async function findIdentityCollection(): Promise<Identity[]> {
  const docs = await dbFind<DbRecord<Identity>>(dbService, { type: 'Identity' })
  return docs.map((item) => item.wallet)
}

export function findCommonWalletDocs(): Promise<DbRecord<WalletRecord>[]> {
  return dbFind<DbRecord<WalletRecord>>(dbService, { type: WalletType.CommonWallet })
}

export function findLocalAccounts(): Promise<LocalAccountRecord[]> {
  return dbFind<LocalAccountRecord>(dbService, {
    type: { $in: [WalletType.CommonWallet, WalletType.HardwareWallet] },
  })
}

function queryLocalAccountsByAddresses(addresses: string[]): Promise<LocalAccountRecord[]> {
  return dbFind<LocalAccountRecord>(dbService, {
    type: { $in: [WalletType.CommonWallet, WalletType.HardwareWallet] },
    address: { $in: addresses },
  })
}

export async function findLocalCopayers(copayers: { address: string; [key: string]: unknown }[]) {
  const addresses = copayers.map((c) => c.address)
  const accounts = await queryLocalAccountsByAddresses(addresses)
  const accountsByAddress = new Map(accounts.map((account) => [account.address, account]))

  const result: Array<
    {
      value: string
      label: string
      type: WalletType | 'Identity'
      wallet: WalletRecord | HardwareWalletRecord
    } & Record<string, unknown>
  > = []

  for (const copayer of copayers) {
    const account = accountsByAddress.get(copayer.address)
    if (account) {
      result.push({
        ...copayer,
        value: account.address,
        label: account.wallet.label,
        type: account.type,
        wallet: account.wallet,
      })
    }
  }

  return result
}

export async function containsLocalCopayer(copayers: { address: string }[]) {
  const addresses = copayers.map((c) => c.address)
  const accounts = await queryLocalAccountsByAddresses(addresses)
  const localAddresses = new Set(accounts.map((account) => account.address))

  return copayers.some((copayer) => localAddresses.has(copayer.address))
}

export async function findLocalAccountByAddress(
  address: string
): Promise<LocalAccountRecord | undefined> {
  const accounts = await dbFind<LocalAccountRecord>(dbService, {
    type: { $in: [WalletType.CommonWallet, WalletType.HardwareWallet] },
    address,
  })
  return accounts[0]
}

export async function findRecordByAddress(address: string): Promise<DbRecord<unknown> | undefined> {
  const docs = await dbFind<DbRecord<unknown>>(dbService, { address })
  return docs[0]
}

export function findRecordsByPublicKeys(publicKeys: string[]): Promise<DbRecord<unknown>[]> {
  return dbFind<DbRecord<unknown>>(dbService, { 'wallet.publicKey': { $in: publicKeys } })
}

export function insertWalletRecord(doc: Omit<DbRecord<unknown>, '_id'>) {
  return dbService.insert(doc as unknown as Record<string, unknown>)
}

export function updateWalletRecord(address: string, fields: Record<string, unknown>) {
  return dbService.update({ address }, { $set: fields }, {})
}

export function removeWalletRecord(type: WalletType | 'Identity', address: string) {
  return dbService.remove({ type, address }, {})
}

export function insertIdentityRecord(doc: Omit<DbRecord<unknown>, '_id'>) {
  return insertWalletRecord(doc)
}

export function removeIdentityRecord(ontid: string) {
  return dbService.remove({ type: 'Identity', address: ontid }, {})
}
