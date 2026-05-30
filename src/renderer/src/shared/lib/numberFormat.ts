export function formatNumberForDisplay(num: string | number | null | undefined) {
  if (num === undefined || num === null) return ''
  const value = String(num).trim()
  if (!value) return ''
  const numericValue = value.replace(/[\s,\u2009\u202f\u00a0]/g, '')
  if (!Number.isFinite(Number(numericValue))) return value
  if (/[eE]/.test(numericValue)) {
    return Number(numericValue).toLocaleString('en-US').replaceAll(',', '\u2009')
  }

  const [integerPart, fractionPart] = numericValue.split('.')
  const groupedIntegerPart = (integerPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')
  return fractionPart === undefined ? groupedIntegerPart : `${groupedIntegerPart}.${fractionPart}`
}
