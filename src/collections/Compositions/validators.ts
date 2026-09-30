import type { TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

// Le validateur text de Payload ne vérifie pas le type : on s'en charge, puis on lui délègue
export const validateTitle: TextFieldSingleValidation = (value, args) =>
  typeof value === 'string' ? text(value, args) : 'The title must be text'
