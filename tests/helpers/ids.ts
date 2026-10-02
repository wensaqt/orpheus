import type { Id } from '@/lib/ids'

// A readable, valid UUID v7 for test data: uuid(3) is 00000000-0000-7000-8000-000000000003, and
// such ids sort by number like real v7 ids sort by creation
export const uuid = (n: number): Id => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`
