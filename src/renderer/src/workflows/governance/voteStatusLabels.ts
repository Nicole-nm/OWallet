import { VOTE_STATUS_TEXT } from '../../stores/modules/Vote'

export function createVoteStatusMap(translate: (key: string) => string): Record<string, string> {
  return {
    [VOTE_STATUS_TEXT.NOT_START]: translate('vote.notStart'),
    [VOTE_STATUS_TEXT.IN_PROGRESS]: translate('vote.inProgress'),
    [VOTE_STATUS_TEXT.FINISHED]: translate('vote.finished'),
    [VOTE_STATUS_TEXT.CANCELED]: translate('vote.canceled'),
  }
}
