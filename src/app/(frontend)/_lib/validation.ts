// Ids as the app uses them: positive integers (Postgres serial ids)
export const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

// The id in a route segment, or null when the segment is not one (the page then 404s)
export function parseId(segment: string): number | null {
  const id = Number(segment)
  return isId(id) ? id : null
}
