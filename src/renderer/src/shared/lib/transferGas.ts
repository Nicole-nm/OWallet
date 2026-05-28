import { BigNumber } from 'bignumber.js'
import { GAS_LIMIT } from './constants'

const ONG_BASE_UNITS = new BigNumber(1e9)

export function convertTransferFeeToGasPrice(fee: number | string, gasLimit = GAS_LIMIT) {
  return new BigNumber(fee).multipliedBy(ONG_BASE_UNITS).div(parseInt(gasLimit, 10)).toString()
}

export function convertTransferGasPriceToFee(gasPrice: number | string, gasLimit = GAS_LIMIT) {
  return new BigNumber(gasPrice).multipliedBy(parseInt(gasLimit, 10)).div(ONG_BASE_UNITS).toString()
}
