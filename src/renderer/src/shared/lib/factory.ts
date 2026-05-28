export function createEmptyFromTemplate<T extends object>(template: T): T {
  return { ...template }
}
