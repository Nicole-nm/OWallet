type LoggerLevel = 'debug' | 'info' | 'warn' | 'error'
type LoggerMethod = (...args: unknown[]) => void

const consoleMethods: Record<LoggerLevel, LoggerMethod> = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

function resolveConsoleMethod(level: LoggerLevel) {
  return consoleMethods[level]
}

function formatPrefix(context?: string) {
  return context ? `[OWallet][${context}]` : '[OWallet]'
}

function write(level: LoggerLevel, contextOrValue: unknown, ...args: unknown[]) {
  const consoleMethod = resolveConsoleMethod(level)

  if (typeof contextOrValue === 'string' && args.length > 0) {
    consoleMethod(formatPrefix(contextOrValue), ...args)
    return
  }

  if (typeof contextOrValue === 'string') {
    consoleMethod(formatPrefix(), contextOrValue)
    return
  }

  consoleMethod(formatPrefix(), contextOrValue, ...args)
}

function createScopedMethod(level: LoggerLevel, context: string) {
  return (detailOrValue?: unknown, ...args: unknown[]) => {
    if (typeof detailOrValue === 'string' && args.length > 0) {
      write(level, `${context}.${detailOrValue}`, ...args)
      return
    }

    if (detailOrValue === undefined) {
      write(level, context)
      return
    }

    write(level, context, detailOrValue, ...args)
  }
}

export const logger = {
  debug: (...args: [unknown, ...unknown[]]) => write('debug', ...args),
  info: (...args: [unknown, ...unknown[]]) => write('info', ...args),
  warn: (...args: [unknown, ...unknown[]]) => write('warn', ...args),
  error: (...args: [unknown, ...unknown[]]) => write('error', ...args),
}

export function createLogger(context: string) {
  return {
    debug: createScopedMethod('debug', context),
    info: createScopedMethod('info', context),
    warn: createScopedMethod('warn', context),
    error: createScopedMethod('error', context),
  }
}
