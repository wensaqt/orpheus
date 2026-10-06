// A number kept within inclusive bounds
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

// A finite number from an unchecked value, or null
export const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
