export function verifyPositiveInt(value: unknown) {
  return /^[1-9]\d*$/.test(String(value))
}

export function verifyOngValue(value: unknown) {
  return /^[0-9]+(\.[0-9]{1,9})?$/.test(String(value))
}

export function verifyOep4Value(value: unknown, decimal: number) {
  if (decimal > 0) {
    return new RegExp(`^[0-9]+(\\.[0-9]{1,${decimal}})?$`).test(String(value))
  }
  return verifyPositiveInt(value)
}

export function isHexString(str: unknown) {
  const value = String(str)
  return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0
}

export {
  verifyPositiveInt as varifyPositiveInt,
  verifyOngValue as varifyOngValue,
  verifyOep4Value as varifyOpe4Value,
}
