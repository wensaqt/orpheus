import { isRecord } from './guards'
import { type Id, isId } from './ids'

type Relation = Id | { id: Id }

/*
 * Id of a relationship value as Payload gives it: an id, a populated document, or nothing.
 * Typed for Payload's own values; still checked at runtime, as hooks and access functions
 * also see data submitted by users.
 */
export function relationId(value: Relation): Id
export function relationId(value: unknown): Id | null
export function relationId(value: unknown): Id | null {
  if (isId(value)) return value
  if (isRecord(value) && isId(value.id)) return value.id
  return null
}
