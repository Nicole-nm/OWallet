import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import type { VoteTopic } from '../../shared/types'

export function formatVoteDateTime(value: unknown): string {
  const date = new Date(
    value instanceof Date || typeof value === 'string' || typeof value === 'number' ? value : 0
  )
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getVoteTimestamp(value: unknown): number {
  const timestamp = Number(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function sortVotesByNewest<T extends { startTime?: unknown; endTime?: unknown }>(
  votes: T[]
): T[] {
  return [...votes].sort((left, right) => {
    const startDiff = getVoteTimestamp(right?.startTime) - getVoteTimestamp(left?.startTime)
    if (startDiff !== 0) {
      return startDiff
    }

    return getVoteTimestamp(right?.endTime) - getVoteTimestamp(left?.endTime)
  })
}

export function getVoteCount(
  vote: Record<string, unknown>,
  primaryKey: string,
  fallbackKey: string
): unknown {
  return vote[primaryKey] ?? vote[fallbackKey] ?? 0
}

export function toDisplayNumberInput(value: unknown): string | number | undefined {
  return typeof value === 'number' || typeof value === 'string' ? value : undefined
}

export function formatVoteListRow<T extends Record<string, unknown>>(
  vote: T
): T & {
  approvesDisplay: string
  rejectsDisplay: string
} {
  return {
    ...vote,
    approvesDisplay: formatNumberForDisplay(
      toDisplayNumberInput(getVoteCount(vote, 'approves', 'approve'))
    ),
    rejectsDisplay: formatNumberForDisplay(
      toDisplayNumberInput(getVoteCount(vote, 'rejects', 'reject'))
    ),
  }
}

export function formatVoteRecordRow<T extends Record<string, unknown>>(
  record: T
): T & {
  weightDisplay: string
} {
  return {
    ...record,
    weightDisplay: formatNumberForDisplay(toDisplayNumberInput(record.weight)),
  }
}

export function formatVoteDuration(vote: Pick<VoteTopic, 'startTime' | 'endTime'>): string {
  const start = formatVoteDateTime(vote.startTime)
  const end = formatVoteDateTime(vote.endTime)
  return `${start} ~ ${end}`
}

export function getVoteRowKey(vote: VoteTopic | Record<string, unknown>): string {
  return String(vote?.hash || vote?.topicHash || vote?.title || '')
}
