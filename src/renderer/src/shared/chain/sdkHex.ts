import { Buffer } from 'buffer'

export function reverseHex(value = '') {
  const normalized = String(value)
  if (!normalized) {
    return ''
  }

  const bytes = normalized.match(/.{1,2}/g) || []
  return bytes.reverse().join('')
}

export function str2hexstr(value = '') {
  return Buffer.from(String(value), 'utf8').toString('hex')
}
