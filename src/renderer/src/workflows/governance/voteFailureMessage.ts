export function isSilentVoteFailure(result: unknown): result is { silent: true } {
  return Boolean(result && typeof result === 'object' && 'silent' in result && result.silent)
}

export function getVoteFailureMessage(result: unknown, translate: (key: string) => string): string {
  if (!result || typeof result !== 'object') {
    return translate('common.networkErr')
  }

  const errorKey =
    'errorKey' in result && typeof result.errorKey === 'string'
      ? result.errorKey
      : 'common.networkErr'
  const statusText =
    'statusText' in result && typeof result.statusText === 'string' ? result.statusText : ''

  return translate(errorKey) + statusText
}
