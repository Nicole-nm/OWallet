import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import type Transport from '@ledgerhq/hw-transport'
import * as elliptic from 'elliptic'
import i18n from '../../lang'
import { logger } from '../lib/logger'
import { loadOntologySdk } from './loadOntologySdk'
import {
  LedgerProtocolClient,
  LedgerTransportError,
  evalTransportError,
  getDerivationPath,
} from './ledgerTransport'

/**
 * Compress a 65-byte uncompressed SECP256R1 public key into the 33-byte
 * compressed hex form expected by the Ontology chain.
 */
async function compressPublicKey(uncompressedPublicKey: string): Promise<string> {
  const { Crypto } = await loadOntologySdk()
  const ec = new elliptic.ec(Crypto.CurveLabel.SECP256R1.preset)
  const keyPair = ec.keyFromPublic(uncompressedPublicKey, 'hex')
  return keyPair.getPublic(true, 'hex')
}

interface HIDDeviceLike {
  productName?: string
  vendorId?: number
  productId?: number
}

interface TransportWithDevice extends Transport {
  device?: HIDDeviceLike
}

export interface LedgerDeviceInfo {
  product?: string
  vendorId?: number
  productId?: number
}

export interface LedgerConnectionSnapshot {
  deviceInfo: LedgerDeviceInfo
  publicKey: string
}

/**
 * High-level Ontology Ledger client. Owns the transport lifetime and exposes
 * the operations higher-level domain code needs (public key lookup, signing,
 * device info). The APDU/protocol plumbing lives in `LedgerProtocolClient`.
 */
export default class OntLedger {
  device: Transport
  protocolClient: LedgerProtocolClient

  constructor(device: Transport) {
    this.device = device
    this.protocolClient = new LedgerProtocolClient(device)
  }

  static async init(): Promise<OntLedger> {
    const supported = await TransportWebHID.isSupported()
    if (!supported) {
      throw 'NOT_SUPPORT'
    }
    let transport: Transport | null = null
    try {
      transport = await TransportWebHID.create()
      return new OntLedger(transport)
    } catch (err) {
      if (transport) {
        try {
          await transport.close()
        } catch {
          // best-effort cleanup
        }
      }
      const message = (err as { message?: string } | null)?.message
      if (message && message.includes('No device selected')) {
        throw 'NOT_FOUND'
      }
      throw 'NOT_FOUND'
    }
  }

  close(): Promise<void> {
    if (this.device) return this.device.close()
    return Promise.resolve()
  }

  async getPublicKey(acct = 0, neo = false): Promise<string> {
    const uncompressed = await this.protocolClient.getRawPublicKey(getDerivationPath(acct, neo))
    return compressPublicKey(uncompressed)
  }

  getDeviceInfo(): LedgerDeviceInfo {
    try {
      const hidDevice = (this.device as TransportWithDevice).device
      return {
        product: hidDevice?.productName,
        vendorId: hidDevice?.vendorId,
        productId: hidDevice?.productId,
      }
    } catch (err) {
      throw evalTransportError(err as LedgerTransportError)
    }
  }

  async getSignature(data: string, acct = 0, neo = false): Promise<string> {
    return this.protocolClient.signMessage(getDerivationPath(acct, neo), data)
  }
}

/* -------------------------------------------------------------------------- */
/*  Higher-level helpers — open/close a transport around a single operation   */
/* -------------------------------------------------------------------------- */

async function withLedger<T>(run: (ledger: OntLedger) => Promise<T>): Promise<T> {
  const ledger = await OntLedger.init()
  try {
    return await run(ledger)
  } finally {
    await ledger.close()
  }
}

export const getPublicKey = async (acct = 0, neo = false): Promise<string> => {
  return withLedger((ledger) => ledger.getPublicKey(acct, neo))
}

export const getDeviceInfo = async (): Promise<LedgerDeviceInfo> => {
  return withLedger((ledger) => Promise.resolve(ledger.getDeviceInfo()))
}

export const getConnectionSnapshot = async (
  acct = 0,
  neo = false
): Promise<LedgerConnectionSnapshot> => {
  return withLedger(async (ledger) => ({
    deviceInfo: ledger.getDeviceInfo(),
    publicKey: await ledger.getPublicKey(acct, neo),
  }))
}

export const legacySignWithLedger = async (
  unsignedTx: string | Uint8Array | Buffer,
  neo: boolean | number = false,
  acct = 0
): Promise<string> => {
  return withLedger((ledger) => ledger.getSignature(unsignedTx as string, acct, neo as boolean))
}

export const checkPublicKeyIsInTheConnectedLedger = async (
  acct = 0,
  neo: boolean | number = false,
  publicKey = ''
): Promise<boolean> => {
  try {
    const pk = await getPublicKey(acct, neo as boolean)
    const isCorrect = pk === publicKey
    if (!isCorrect) {
      throw i18n.global.t('common.invalidLedger')
    }
    return true
  } catch (err) {
    logger.error('ledgerSigner.checkPublicKeyIsInTheConnectedLedger', err)
    throw err
  }
}
