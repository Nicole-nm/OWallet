import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_CLOSED } from './ledgerTransport'

const mocks = vi.hoisted(() => ({
  isSupported: vi.fn(),
  create: vi.fn(),
  close: vi.fn(),
  getRawPublicKey: vi.fn(),
  signMessage: vi.fn(),
  keyFromPublic: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@ledgerhq/hw-transport-webhid', () => ({
  default: {
    isSupported: (...args: unknown[]) => mocks.isSupported(...args),
    create: (...args: unknown[]) => mocks.create(...args),
  },
}))

vi.mock('elliptic', () => ({
  ec: class {
    keyFromPublic(...args: unknown[]) {
      return mocks.keyFromPublic(...args)
    }
  },
}))

vi.mock('../../lang', () => ({
  default: {
    global: {
      t: (key: string) => key,
    },
  },
}))

vi.mock('../lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mocks.loggerError(...args),
  },
}))

vi.mock('./loadOntologySdk', () => ({
  loadOntologySdk: async () => ({
    Crypto: {
      CurveLabel: {
        SECP256R1: {
          preset: 'p256',
        },
      },
    },
  }),
}))

vi.mock('./ledgerTransport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ledgerTransport')>()
  return {
    ...actual,
    LedgerProtocolClient: class {
      getRawPublicKey(...args: unknown[]) {
        return mocks.getRawPublicKey(...args)
      }

      signMessage(...args: unknown[]) {
        return mocks.signMessage(...args)
      }
    },
  }
})

import OntLedger, {
  checkPublicKeyIsInTheConnectedLedger,
  getConnectionSnapshot,
  getDeviceInfo,
  getPublicKey,
  legacySignWithLedger,
} from './ledgerSigner'

function createDevice() {
  return {
    close: mocks.close,
    device: {
      productName: 'Nano',
      vendorId: 11415,
      productId: 1,
    },
  }
}

describe('ledgerSigner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isSupported.mockResolvedValue(true)
    mocks.create.mockResolvedValue(createDevice())
    mocks.close.mockResolvedValue(undefined)
    mocks.getRawPublicKey.mockResolvedValue('04' + '11'.repeat(64))
    mocks.signMessage.mockResolvedValue('signed')
    mocks.keyFromPublic.mockReturnValue({
      getPublic: vi.fn(() => 'compressed-public-key'),
    })
  })

  it('rejects unsupported browsers and missing devices with stable status values', async () => {
    mocks.isSupported.mockResolvedValueOnce(false)
    await expect(OntLedger.init()).rejects.toBe('NOT_SUPPORT')

    mocks.create.mockRejectedValueOnce(new Error('No device selected'))
    await expect(OntLedger.init()).rejects.toBe('NOT_FOUND')

    mocks.create.mockRejectedValueOnce(new Error('permission denied'))
    await expect(OntLedger.init()).rejects.toBe('NOT_FOUND')
  })

  it('reads device metadata, compresses the public key, signs, and closes the transport', async () => {
    await expect(getDeviceInfo()).resolves.toEqual({
      product: 'Nano',
      vendorId: 11415,
      productId: 1,
    })
    await expect(getPublicKey(2, true)).resolves.toBe('compressed-public-key')
    await expect(legacySignWithLedger('aabb', true, 3)).resolves.toBe('signed')

    expect(mocks.getRawPublicKey).toHaveBeenCalledWith("44'/888'/0'/0/2")
    expect(mocks.signMessage).toHaveBeenCalledWith("44'/888'/0'/0/3", 'aabb')
    expect(mocks.close).toHaveBeenCalledTimes(3)
  })

  it('returns a connection snapshot while closing its transport', async () => {
    await expect(getConnectionSnapshot()).resolves.toEqual({
      deviceInfo: {
        product: 'Nano',
        vendorId: 11415,
        productId: 1,
      },
      publicKey: 'compressed-public-key',
    })
    expect(mocks.close).toHaveBeenCalledOnce()
  })

  it('maps device metadata transport failures', () => {
    const device = {
      close: mocks.close,
      get device() {
        throw { statusCode: APP_CLOSED }
      },
    }

    expect(() => new OntLedger(device as never).getDeviceInfo()).toThrowError(
      expect.objectContaining({
        message: 'ledgerWallet.appClosed',
      })
    )
  })

  it('validates the connected public key and logs mismatches', async () => {
    await expect(
      checkPublicKeyIsInTheConnectedLedger(0, false, 'compressed-public-key')
    ).resolves.toBe(true)
    await expect(checkPublicKeyIsInTheConnectedLedger(0, false, 'other-key')).rejects.toBe(
      'common.invalidLedger'
    )

    expect(mocks.loggerError).toHaveBeenCalledWith(
      'ledgerSigner.checkPublicKeyIsInTheConnectedLedger',
      'common.invalidLedger'
    )
  })
})
