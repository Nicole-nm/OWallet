import { verifyPositiveInt } from '../../../../shared/lib/validators'
import type { ServiceResult } from '../../../../shared/types'

interface ReduceValidationPeer {
  totalPos?: unknown
  initPos?: unknown
}

interface ReduceValidationDetail {
  commitmentQuantity?: unknown
}

export function validateReduceInitPosAmount({
  amount,
  currentPeer,
  detail,
  posLimit,
}: {
  amount: string | number
  currentPeer?: ReduceValidationPeer
  detail?: ReduceValidationDetail
  posLimit?: string | number
}): ServiceResult {
  if (!amount || !verifyPositiveInt(amount)) {
    return { ok: false, errorKey: 'nodeMgmt.invalidInput' }
  }

  const currentTotalPos = Number(currentPeer?.totalPos || 0)
  const currentInitPos = Number(currentPeer?.initPos || 0)
  const currentCommitment = Number(detail?.commitmentQuantity || 0)
  const currentPosLimit = Number(posLimit || 0)
  const requestedReduce = Number(amount || 0)

  if (currentTotalPos === 0 && currentInitPos - requestedReduce < currentCommitment) {
    return { ok: false, errorKey: 'nodeMgmt.notThanCommitment' }
  }

  if (currentTotalPos && (currentInitPos - requestedReduce) * currentPosLimit < currentTotalPos) {
    return { ok: false, errorKey: 'nodeMgmt.notLessTotalPos' }
  }

  return { ok: true }
}

export function validateStakeAuthorizationUnit({
  unit,
  currentPeer,
  posLimit,
}: {
  unit: string | number
  currentPeer?: ReduceValidationPeer
  posLimit?: string | number
}) {
  const normalizedUnit = String(unit).trim()

  if (!normalizedUnit || (normalizedUnit !== '0' && !verifyPositiveInt(normalizedUnit))) {
    return { ok: false, errorKey: 'nodeMgmt.invalidInput' }
  }

  const unitNum = parseInt(normalizedUnit, 10)
  const currentTotalPos = Number(currentPeer?.totalPos || 0)

  if (unitNum > Number(currentPeer?.initPos || 0) * Number(posLimit || 0)) {
    return { ok: false, errorKey: 'nodeMgmt.notThanMax' }
  }

  if (currentTotalPos > 0 && unitNum < currentTotalPos / 10) {
    return { ok: false, errorKey: 'nodeMgmt.notLessTotalPosTenth' }
  }

  return { ok: true }
}
