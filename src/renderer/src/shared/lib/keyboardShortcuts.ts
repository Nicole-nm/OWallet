interface KeyTarget {
  tagName?: string
  isContentEditable?: boolean
}

export function isTextEntryTarget(target: EventTarget | KeyTarget | null): boolean {
  if (!target || typeof target !== 'object') return false
  const info = target as KeyTarget
  if (info.isContentEditable === true) return true
  const tag = info.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

interface KeyEventLike {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

export function isUnmodifiedKey(event: KeyEventLike, key: string): boolean {
  if (event.key !== key) return false
  return !event.ctrlKey && !event.metaKey && !event.altKey
}
