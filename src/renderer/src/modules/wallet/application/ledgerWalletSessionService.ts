import { deriveAddressFromPublicKey } from '../../../domains/wallet/accountService'

export async function verifyLedgerLogin({ publicKey, currentWallet }: Record<string, unknown>) {
  const wallet = currentWallet as { address?: string } | null | undefined
  if (!wallet?.address || !publicKey) {
    return { ok: false }
  }

  const address = await deriveAddressFromPublicKey(String(publicKey))
  if (wallet.address !== address) {
    return { ok: false, address }
  }

  return {
    ok: true,
    ledgerWallet: {
      publicKey: String(publicKey),
      address,
    },
  }
}
