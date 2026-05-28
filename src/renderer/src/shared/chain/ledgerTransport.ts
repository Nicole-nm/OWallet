import type Transport from '@ledgerhq/hw-transport'
import { Buffer } from 'buffer'
import i18n from '../../lang'

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
}

/**
 * Map a raw Ledger transport error into a user-facing message. Mutates the
 * error object in place (and returns it) to preserve whatever stack/prototype
 * info the transport attached.
 */
export function evalTransportError(err: LedgerTransportError): LedgerTransportError {
  switch (err.statusCode) {
    case APP_CLOSED:
      err.message = 'Your ONT app is closed! Please login.'
      break
    case MSG_TOO_BIG:
      err.message = 'Your transaction is too big for the ledger to sign!'
      break
    case TX_DENIED:
      err.message = 'You have denied the transaction on your ledger.'
      break
    case TX_PARSE_ERR:
      err.message = 'Error parsing transaction. Make sure your ONT app version is up to date.'
      break
  }
  return err
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
      throw this.convertTransportError(transportError)
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
      throw this.convertTransportError(error as LedgerTransportError)
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
          throw new Error('Ledger returned no signature data.')
        }
        return parseLegacySignatureReply(result)
      }

      const reply = await this.sendChunkedMessage(path, INS.SIGN, Buffer.from(msg, 'hex'))
      if (reply.length <= 2) {
        throw new Error('No more data but Ledger did not return signature!')
      }

      return parseModernSignatureReply(reply)
    } catch (error) {
      throw this.convertTransportError(error as LedgerTransportError)
    }
  }

  private async sendChunkedMessage(
    path: string,
    instruction: number,
    messageBuffer: Buffer
  ): Promise<Buffer> {
    const supportsNewProtocol = await this.supportsModernProtocol()
    if (!supportsNewProtocol) {
      throw new Error('Unsupported app version')
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
      throw this.convertTransportError(error as LedgerTransportError)
    }
  }

  private convertTransportError(error: LedgerTransportError): LedgerTransportError {
    if (error.statusCode === TX_DENIED) {
      error.message = i18n.global.t('common.rejectedByUser')
      return error
    }
    return evalTransportError(error)
  }
}
