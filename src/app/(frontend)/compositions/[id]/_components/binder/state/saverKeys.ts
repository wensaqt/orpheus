import type { Id } from '@/lib/ids'

// The key each saver registers under, naming what it saves
export const SAVERS = {
  compositionTitle: 'composition-title',
  layout: 'layout',
  documentText: (id: Id) => `document:${id}`,
  documentTitle: (id: Id) => `document-title:${id}`,
}
