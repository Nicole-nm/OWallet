import { getNodeUrl } from '../lib/urlBuilder'
import { RestProxy } from '../network/restProxy'

export function getRestClient() {
  return new RestProxy(getNodeUrl())
}
