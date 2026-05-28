import { describe, expect, it } from 'vitest'

import {
  hasValidationErrors,
  validateExactLength,
  validateMatch,
  validateMinLength,
  validateRequired,
} from './formValidation'

describe('formValidation', () => {
  it('populates required and min-length errors', () => {
    const errors = {
      password: '',
    }

    expect(validateRequired(errors, 'password', 'Password', '')).toBe(false)
    expect(errors.password).toBe('Password is required')

    errors.password = ''

    expect(validateMinLength(errors, 'password', 'Password', '123', 6)).toBe(false)
    expect(errors.password).toBe('Password must be at least 6 characters')
  })

  it('validates exact length, matches, and aggregated error state', () => {
    const errors = {
      privateKey: '',
      confirmation: '',
    }

    expect(validateExactLength(errors, 'privateKey', 'Private key', 'abc', 64)).toBe(false)
    expect(errors.privateKey).toBe('Private key must be 64 characters')

    expect(validateMatch(errors, 'confirmation', 'Confirmation', 'a', 'b')).toBe(false)
    expect(errors.confirmation).toBe('Confirmation does not match')
    expect(hasValidationErrors(errors)).toBe(true)

    errors.privateKey = ''
    errors.confirmation = ''

    expect(hasValidationErrors(errors)).toBe(false)
  })
})
