import { describe, expect, it } from 'vitest'

import {
  formatVoteDateTime,
  formatVoteDuration,
  formatVoteListRow,
  formatVoteRecordRow,
  getVoteRowKey,
  sortVotesByNewest,
} from './voteTableFormatters'

describe('voteTableFormatters', () => {
  it('formats local date/time values for table display', () => {
    expect(formatVoteDateTime(new Date(2024, 0, 2, 3, 4))).toBe('2024-01-02 03:04')
  })

  it('sorts votes by newest start time and then end time', () => {
    const votes = [
      { hash: 'old', startTime: 100, endTime: 300 },
      { hash: 'newer-end', startTime: 200, endTime: 500 },
      { hash: 'newer', startTime: 300, endTime: 100 },
      { hash: 'same-start', startTime: 200, endTime: 700 },
    ]

    expect(sortVotesByNewest(votes).map((vote) => vote.hash)).toEqual([
      'newer',
      'same-start',
      'newer-end',
      'old',
    ])
  })

  it('adds display totals to list rows while preserving the source fields', () => {
    expect(formatVoteListRow({ hash: 'a', approve: 1000, rejects: '2000' })).toMatchObject({
      hash: 'a',
      approvesDisplay: '1\u2009000',
      rejectsDisplay: '2\u2009000',
    })
  })

  it('adds display weight to vote record rows', () => {
    expect(formatVoteRecordRow({ address: 'A', weight: 1234567 })).toMatchObject({
      address: 'A',
      weightDisplay: '1\u2009234\u2009567',
    })
  })

  it('formats vote duration and stable row keys', () => {
    expect(
      formatVoteDuration({
        startTime: new Date(2024, 0, 2, 3, 4).getTime(),
        endTime: new Date(2024, 0, 3, 5, 6).getTime(),
      })
    ).toBe('2024-01-02 03:04 ~ 2024-01-03 05:06')
    expect(getVoteRowKey({ topicHash: 'topic-hash' })).toBe('topic-hash')
    expect(getVoteRowKey({ title: 'topic-title' })).toBe('topic-title')
  })
})
