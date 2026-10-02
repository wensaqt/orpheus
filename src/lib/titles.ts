// A title as typed, made storable: trimmed, not empty, not too long; otherwise null
export function cleanTitle(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const title = value.trim()
  return title && title.length <= maxLength ? title : null
}
