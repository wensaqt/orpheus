/*
 * Checks for values that arrive unchecked (a client's input, stored JSON): type guards, so
 * the code after them reads the value's fields without an assertion.
 */

// An object whose fields can be read, each still unknown
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// One of a list's values (`includes` would want the value typed as the list's already)
export const isOneOf = <T>(values: readonly T[], value: unknown): value is T =>
  values.some((item) => item === value)
