import { type Id, isId } from '@/lib/ids'

// The id in a route segment, or null when the segment is not one (the page then 404s)
export const parseId = (segment: string): Id | null => (isId(segment) ? segment : null)
