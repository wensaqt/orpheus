import { Forbidden, NotFound } from 'payload'

// An unreadable record is a miss; infrastructure errors must still reach the caller.
export function nullIfUnreadable(error: unknown): null {
  if (error instanceof NotFound || error instanceof Forbidden) return null
  throw error
}
