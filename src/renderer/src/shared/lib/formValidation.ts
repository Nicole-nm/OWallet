export function validateRequired(
  errors: Record<string, string>,
  field: string,
  label: string,
  value: unknown
) {
  const normalizedValue = typeof value === 'string' ? value.trim() : value
  if (!normalizedValue) {
    errors[field] = `${label} is required`
    return false
  }

  return true
}

export function validateMinLength(
  errors: Record<string, string>,
  field: string,
  label: string,
  value: unknown,
  min: number
) {
  if (String(value || '').length < min) {
    errors[field] = `${label} must be at least ${min} characters`
    return false
  }

  return true
}

export function validateExactLength(
  errors: Record<string, string>,
  field: string,
  label: string,
  value: unknown,
  length: number
) {
  if (String(value || '').length !== length) {
    errors[field] = `${label} must be ${length} characters`
    return false
  }

  return true
}

export function validateMatch(
  errors: Record<string, string>,
  field: string,
  label: string,
  value: unknown,
  expected: unknown
) {
  if (value !== expected) {
    errors[field] = `${label} does not match`
    return false
  }

  return true
}

export function hasValidationErrors(errors: Record<string, string>) {
  return Object.values(errors).some(Boolean)
}

export type ValidationFieldName = string

export function createValidationErrors<TField extends ValidationFieldName>(
  fields: readonly TField[]
): Record<TField, string> {
  return fields.reduce(
    (errors, field) => {
      errors[field] = ''
      return errors
    },
    {} as Record<TField, string>
  )
}

export function resetValidationErrors<TField extends ValidationFieldName>(
  target: Record<TField, string>,
  fields: readonly TField[]
) {
  Object.assign(target, createValidationErrors(fields))
}
