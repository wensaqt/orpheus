import type { Composition } from '@/payload-types'

// Every collection's id: a UUID (v7, see idType in payload.config.ts)
export type Id = Composition['id']

// Lower case only, as Postgres writes them: ids are then compared as plain strings
export const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const UUID = new RegExp(`^${UUID_PATTERN}$`)

export const isId = (value: unknown): value is Id => typeof value === 'string' && UUID.test(value)
