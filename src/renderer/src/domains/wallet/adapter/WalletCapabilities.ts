export interface WalletCapabilities {
  requiresPassword: boolean
  requiresHardwareDevice: boolean
  singleSignature: boolean
  multiSignature: boolean
  canSignMessage: boolean
}
