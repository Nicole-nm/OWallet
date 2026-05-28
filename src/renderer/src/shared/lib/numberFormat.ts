export function formatNumberForDisplay(num: string | number | null | undefined) {
  if (num === undefined || num === null) return ''
  return Number(num).toLocaleString('en-US')
}
