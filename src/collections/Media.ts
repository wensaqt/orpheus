import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/isAdmin'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // File persistence is not configured on Vercel. MusicXML imports do not use this collection.
    read: adminOnly,
    create: ({ req }) => process.env.NODE_ENV !== 'production' && adminOnly({ req }),
    update: ({ req }) => process.env.NODE_ENV !== 'production' && adminOnly({ req }),
    delete: adminOnly,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
