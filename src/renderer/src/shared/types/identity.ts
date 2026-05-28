export interface IdentityRecord {
  ontid: string
  label: string
  address?: string
  publicKey?: string
  type?: string
  extra?: Record<string, unknown>
  [key: string]: unknown
}
