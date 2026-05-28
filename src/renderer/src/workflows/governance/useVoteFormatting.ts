import { Buffer } from 'buffer'

function formatDateTime(value: string | number | Date) {
  const date = new Date(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatVoteTime(dateTime: string | number | Date) {
  return formatDateTime(dateTime)
}

export function formatVoteStatus(
  voteItem: Record<string, unknown>,
  statusMap: Record<string, string>
) {
  return statusMap[String(voteItem.statusText || '')]
}

export function reverseVoteHash(hash: string) {
  return Buffer.from(hash, 'hex').reverse().toString('hex')
}
