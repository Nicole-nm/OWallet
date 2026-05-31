export function matchesSearchQuery(
  query: string,
  ...fields: Array<string | undefined | null>
): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => typeof field === 'string' && field.toLowerCase().includes(needle))
}
