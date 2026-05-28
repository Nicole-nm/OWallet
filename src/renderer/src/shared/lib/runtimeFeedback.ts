type LoadingHandler = () => void
type RuntimeFeedbackHandlers = {
  showLoading?: LoadingHandler
  hideLoading?: LoadingHandler
}

const noop: LoadingHandler = () => {}

let showLoadingHandler: LoadingHandler = noop
let hideLoadingHandler: LoadingHandler = noop

export function configureRuntimeFeedback(handlers: RuntimeFeedbackHandlers = {}) {
  showLoadingHandler = typeof handlers.showLoading === 'function' ? handlers.showLoading : noop
  hideLoadingHandler = typeof handlers.hideLoading === 'function' ? handlers.hideLoading : noop
}

export function showRuntimeLoading() {
  showLoadingHandler()
}

export function hideRuntimeLoading() {
  hideLoadingHandler()
}
