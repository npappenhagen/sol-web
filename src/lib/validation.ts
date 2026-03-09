/**
 * Reusable validation utilities for form inputs.
 * All validators return undefined for valid input, or an error message string.
 */

/** Standard email validation regex (RFC 5322 simplified) */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * Validate an email address.
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmail(
  email: string,
  options?: { required?: boolean }
): string | undefined {
  const { required = true } = options ?? {}
  const trimmed = email.trim()

  if (!trimmed) {
    return required ? 'Email is required' : undefined
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address'
  }

  return undefined
}

/**
 * Validate a text message/body field.
 * @returns Error message if invalid, undefined if valid
 */
export function validateMessage(
  message: string,
  options?: { required?: boolean, minLength?: number }
): string | undefined {
  const { required = true, minLength = 10 } = options ?? {}
  const trimmed = message.trim()

  if (!trimmed) {
    return required ? 'Please include a message' : undefined
  }

  if (trimmed.length < minLength) {
    return `Message is too short (minimum ${minLength} characters)`
  }

  return undefined
}

/**
 * Validate a required text field.
 * @returns Error message if empty, undefined if valid
 */
export function validateRequired(
  value: string,
  fieldName = 'This field'
): string | undefined {
  const trimmed = value.trim()
  return trimmed ? undefined : `${fieldName} is required`
}

/**
 * Validate a string matches a minimum length.
 * @returns Error message if too short, undefined if valid
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName = 'This field'
): string | undefined {
  const trimmed = value.trim()
  if (trimmed.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`
  }
  return undefined
}
