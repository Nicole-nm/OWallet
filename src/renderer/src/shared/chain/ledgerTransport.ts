import type Transport from '@ledgerhq/hw-transport'
import { Buffer } from 'buffer'
import { LedgerSigningError, type LedgerErrorCode } from '../lib/ledgerError'

/* -------------------------------------------------------------------------- */
/*  APDU constants                                                            */
/* -------------------------------------------------------------------------- */

export const STATUS_OK = 0x9000
export const MSG_TOO_BIG = 0x6d08
export const APP_CLOSED = 0x6e00
export const TX_DENIED = 0x6985
export const TX_PARSE_ERR = 0x6d07
export const INS_NOT_SUPPORTED = 0x6d00

export const LEDGER_CLA = 0x80
export const P1_NON_CONFIRM = 0x00
export const P1_CONFIRM = 0x01
export const P2_MORE = 0x80
export const P2_EXTEND = 0x00
export const MAX_PAYLOAD = 255

export const INS = {
  GET_VERSION: 0x03,
  GET_ADDR: 0x04,
  SIGN: 0x02,
} as const

export const DEFAULT_ACCEPTED_STATUSES = [STATUS_OK]

/* -------------------------------------------------------------------------- */
/*  Error mapping                                                             */
/* -------------------------------------------------------------------------- */

export interface LedgerTransportError {
  statusCode?: number
  message?: string
  name?: string
}

const STATUS_CODE_MAP: Record<number, LedgerErrorCode> = {
  [TX_DENIED]: 'user_rejected',
  [APP_CLOSED]: 'app_closed',
  [MSG_TOO_BIG]: 'tx_too_big',
  [TX_PARSE_ERR]: 'tx_parse_error',
  [INS_NOT_SUPPORTED]: 'ins_not_supported',
}

const NAME_CODE_MAP: Record<string, LedgerErrorCode> = {
  LockedDeviceError: 'device_locked',
  DisconnectedDevice: 'device_disconnected',
  DisconnectedDeviceDuringOperation: 'device_disconnected',
}

/**
 * Convert any raw Ledger transport error into a typed `LedgerSigningError`.
 * Status codes and named errors (from `@ledgerhq/errors`) are mapped to
 * distinct `LedgerErrorCode`s; unknown errors are wrapped as `transport_unknown`
 * preserving the original cause. Translation happens at the UI boundary.
 */
export function evalTransportError(err: unknown): LedgerSigningError {
  if (err instanceof LedgerSigningError) return err

  const raw = (err ?? {}) as LedgerTransportError
  const statusCode = typeof raw.statusCode === 'number' ? raw.statusCode : undefined
  const name = typeof raw.name === 'string' ? raw.name : undefined

  const code =
    (statusCode !== undefined ? STATUS_CODE_MAP[statusCode] : undefined) ??
    (name ? NAME_CODE_MAP[name] : undefined) ??
    'transport_unknown'

  return new LedgerSigningError(code, {
    statusCode,
    cause: err,
    message: raw.message,
  })
}

/* -------------------------------------------------------------------------- */
/*  BIP-44 path helpers                                                       */
/* -------------------------------------------------------------------------- */

export function getDerivationPath(acct = 0, neo = false) {
  const coinType = neo ? 888 : 1024
  return `44'/${coinType}'/0'/0/${acct}`
}

function parseBip44Path(path: string): number[] {
  const normalizedPath = path.trim().replace(/^m\//, '')
  const pathRegex = /^(\d+'?(\/\d+'?)*)$/
  if (!pathRegex.test(normalizedPath)) {
    throw new Error(`Path ${path} is invalid.`)
  }

  return normalizedPath.split('/').map((element) => {
    const hardened = element.endsWith("'")
    const number = parseInt(hardened ? element.slice(0, -1) : element, 10)
    if (Number.isNaN(number)) {
      throw new Error(`Path ${path} is invalid.`)
    }
    return hardened ? (number | 0x80000000) >>> 0 : number >>> 0
  })
}

export function encodeLegacyBip44Path(path: string): Buffer {
  const segments = parseBip44Path(path)
  const buffer = Buffer.alloc(segments.length * 4)

  segments.forEach((segment, index) => {
    buffer.writeUInt32BE(segment, index * 4)
  })

  return buffer
}

export function encodeModernBip44Path(path: string): Buffer {
  const segments = parseBip44Path(path)
  const buffer = Buffer.alloc(1 + segments.length * 4)
  buffer[0] = segments.length

  segments.forEach((segment, index) => {
    buffer.writeUInt32BE(segment, 1 + index * 4)
  })

  return buffer
}

/* -------------------------------------------------------------------------- */
/*  Signature reply decoders                                                  */
/* -------------------------------------------------------------------------- */

export function parseModernSignatureReply(reply: Buffer): string {
  const dataLength = reply.readUInt8(0)
  const dataBuffer = reply.subarray(1, dataLength + 1)
  const rLength = dataBuffer.readUInt8(3)
  let r = dataBuffer.subarray(4, 4 + rLength)
  if (rLength === 33 && r[0] === 0) {
    r = r.subarray(1)
  }

  const sLength = dataBuffer.readUInt8(rLength + 5)
  let s = dataBuffer.subarray(rLength + 6)
  if (sLength === 33 && s[0] === 0) {
    s = s.subarray(1)
  }

  return Buffer.concat([r, s]).toString('hex')
}

export function parseLegacySignatureReply(reply: Buffer): string {
  const dataLength = reply.readUInt8(1)
  const dataBuffer = reply.subarray(2, dataLength + 2)
  const rLength = dataBuffer.readUInt8(1)
  let r = dataBuffer.subarray(2, 2 + rLength)
  if (rLength === 33 && r[0] === 0) {
    r = r.subarray(1)
  }

  let s = dataBuffer.subarray(rLength + 4)
  if (s.length === 33 && s[0] === 0) {
    s = s.subarray(1)
  }

  return Buffer.concat([r, s]).toString('hex')
}

/* -------------------------------------------------------------------------- */
/*  APDU protocol client                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Thin wrapper over the Ledger transport that speaks both the legacy and
 * modern APDU protocols used by the Ontology Ledger app. Keeps the
 * transport-level concerns (chunking, status mapping, version negotiation)
 * out of the higher-level signer.
 */
export class LedgerProtocolClient {
  transport: Transport
  private supportsModernProtocolPromise: Promise<boolean> | null = null

  constructor(transport: Transport, scrambleKey = 'ONT') {
    this.transport = transport
    transport.decorateAppAPIMethods(this, ['getRawPublicKey', 'signMessage'], scrambleKey)
  }

  async getVersion(): Promise<Buffer> {
    try {
      return await this.transport.send(
        LEDGER_CLA,
        INS.GET_VERSION,
        P1_NON_CONFIRM,
        P2_EXTEND,
        Buffer.alloc(0),
        [STATUS_OK]
      )
    } catch (error) {
      const transportError = error as LedgerTransportError
      if (transportError.statusCode === INS_NOT_SUPPORTED) {
        return Buffer.from('0000009000', 'hex')
      }
      throw evalTransportError(transportError)
    }
  }

  async supportsModernProtocol(): Promise<boolean> {
    if (!this.supportsModernProtocolPromise) {
      this.supportsModernProtocolPromise = this.getVersion().then((versionReply) => {
        const versionString = versionReply.toString('hex')
        return parseInt(versionString.slice(0, 2), 16) >= 2
      })
    }

    return this.supportsModernProtocolPromise
  }

  async getRawPublicKey(path: string, showAddress = false): Promise<string> {
    try {
      const supportsNewProtocol = await this.supportsModernProtocol()

      if (!supportsNewProtocol) {
        const pathBuffer = encodeLegacyBip44Path(path)
        const result = await this.transport.send(
          LEDGER_CLA,
          INS.GET_ADDR,
          showAddress ? P1_CONFIRM : P1_NON_CONFIRM,
          P2_EXTEND,
          pathBuffer,
          DEFAULT_ACCEPTED_STATUSES
        )
        return result.toString('hex').substring(0, 130)
      }

      const pathBuffer = encodeModernBip44Path(path)
      const result = await this.transport.send(
        LEDGER_CLA,
        INS.GET_ADDR,
        showAddress ? P1_CONFIRM : P1_NON_CONFIRM,
        P2_EXTEND,
        pathBuffer,
        DEFAULT_ACCEPTED_STATUSES
      )
      const keyLength = result.readUInt8(0)
      return result.subarray(1, keyLength + 1).toString('hex')
    } catch (error) {
      throw evalTransportError(error)
    }
  }

  async signMessage(path: string, msg: string): Promise<string> {
    try {
      const supportsNewProtocol = await this.supportsModernProtocol()

      if (!supportsNewProtocol) {
        const pathBuffer = encodeLegacyBip44Path(path)
        const data = msg + pathBuffer.toString('hex')
        const chunks = data.match(/.{1,500}/g) || []
        if (chunks.length === 0) {
          throw new Error(`Invalid data provided: ${data}`)
        }

        let result: Buffer | null = null
        for (let index = 0; index < chunks.length; index++) {
          const p1 = index === chunks.length - 1 ? P2_MORE : P1_NON_CONFIRM
          const chunk = Buffer.from(chunks[index] as string, 'hex')
          result = await this.transport.send(
            LEDGER_CLA,
            INS.SIGN,
            p1,
            P2_EXTEND,
            chunk,
            DEFAULT_ACCEPTED_STATUSES
          )
        }

        if (!result) {
          throw new LedgerSigningError('no_signature_returned')
        }
        return parseLegacySignatureReply(result)
      }

      const reply = await this.sendChunkedMessage(path, INS.SIGN, Buffer.from(msg, 'hex'))
      if (reply.length <= 2) {
        throw new LedgerSigningError('no_signature_returned')
      }

      return parseModernSignatureReply(reply)
    } catch (error) {
      throw evalTransportError(error)
    }
  }

  private async sendChunkedMessage(
    path: string,
    instruction: number,
    messageBuffer: Buffer
  ): Promise<Buffer> {
    const supportsNewProtocol = await this.supportsModernProtocol()
    if (!supportsNewProtocol) {
      throw new LedgerSigningError('unsupported_app_version')
    }

    try {
      const pathBuffer = encodeModernBip44Path(path)
      let sequence = 0

      await this.transport.send(
        LEDGER_CLA,
        instruction,
        sequence,
        P2_MORE,
        pathBuffer,
        DEFAULT_ACCEPTED_STATUSES
      )

      sequence++
      while (messageBuffer.length - (sequence - 1) * MAX_PAYLOAD > MAX_PAYLOAD) {
        const chunk = messageBuffer.subarray((sequence - 1) * MAX_PAYLOAD, sequence * MAX_PAYLOAD)
        await this.transport.send(
          LEDGER_CLA,
          instruction,
          sequence,
          P2_MORE,
          chunk,
          DEFAULT_ACCEPTED_STATUSES
        )
        sequence++
      }

      const lastChunk = messageBuffer.subarray((sequence - 1) * MAX_PAYLOAD)
      return await this.transport.send(
        LEDGER_CLA,
        instruction,
        sequence,
        P2_EXTEND,
        lastChunk,
        DEFAULT_ACCEPTED_STATUSES
      )
    } catch (error) {
      throw evalTransportError(error)
    }
  }
}
