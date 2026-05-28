import { useRouter } from 'vue-router'
import { ROUTE_NAMES } from '../../router/routes'

export function useNodeApplySuccessPage() {
  const router = useRouter()

  function onComplete() {}

  function onLater() {
    router.push({ name: ROUTE_NAMES.MY_NODE })
  }

  return {
    onComplete,
    onLater,
  }
}
