import { notifyError, notifyWarning } from '../../shared/ui/feedback'

export interface GovernanceSigningFailureFeedback {
  level?: string
  errorKey?: string
}

export function notifyGovernanceSigningFailure(
  result: GovernanceSigningFailureFeedback | null | undefined,
  fallbackErrorKey = 'common.networkErr'
) {
  const errorKey = result?.errorKey || fallbackErrorKey

  if (result?.level === 'warning') {
    notifyWarning(errorKey)
    return { level: 'warning' as const, errorKey }
  }

  notifyError(errorKey)
  return { level: 'error' as const, errorKey }
}
