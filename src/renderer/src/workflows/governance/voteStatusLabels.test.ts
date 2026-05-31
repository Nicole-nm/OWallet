import { describe, expect, it } from 'vitest'

import { createVoteStatusMap } from './voteStatusLabels'

describe('voteStatusLabels', () => {
  it('creates translated labels keyed by vote status constants', () => {
    expect(createVoteStatusMap((key) => `T(${key})`)).toEqual({
      NOT_START: 'T(vote.notStart)',
      IN_PROGRESS: 'T(vote.inProgress)',
      FINISHED: 'T(vote.finished)',
      CANCELED: 'T(vote.canceled)',
    })
  })
})
