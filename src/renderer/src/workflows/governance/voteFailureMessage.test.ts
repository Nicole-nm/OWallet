import { describe, expect, it } from 'vitest'

import { getVoteFailureMessage, isSilentVoteFailure } from './voteFailureMessage'

const translate = (key: string) => `T(${key})`

describe('voteFailureMessage', () => {
  it('combines translated error keys with status text', () => {
    expect(
      getVoteFailureMessage({ errorKey: 'vote.notAllowStop', statusText: 'Finished' }, translate)
    ).toBe('T(vote.notAllowStop)Finished')
  })

  it('falls back to the network error translation for unknown failures', () => {
    expect(getVoteFailureMessage(null, translate)).toBe('T(common.networkErr)')
    expect(getVoteFailureMessage({}, translate)).toBe('T(common.networkErr)')
  })

  it('detects silent failures', () => {
    expect(isSilentVoteFailure({ silent: true })).toBe(true)
    expect(isSilentVoteFailure({ silent: false })).toBe(false)
  })
})
