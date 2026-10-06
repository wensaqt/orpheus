import type { TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

// Payload's text validator does not check the type: we do, then delegate to it
export const validateTitle: TextFieldSingleValidation = (value, args) =>
  typeof value === 'string' ? text(value, args) : 'The title must be text'
