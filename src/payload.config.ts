import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { deploymentConfig } from './lib/deployment'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { BinderItems } from './collections/BinderItems'
import { Compositions } from './collections/Compositions'
import { ThesaurusEntries } from './collections/ThesaurusEntries'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const deployment = deploymentConfig(process.env)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Compositions, BinderItems, ThesaurusEntries],
  editor: lexicalEditor(),
  secret: deployment.secret,
  serverURL: deployment.origin,
  cors: deployment.origin ? [deployment.origin] : [],
  csrf: deployment.origin ? [deployment.origin] : [],
  graphQL: { disable: true },
  upload: { limits: { fileSize: 2_000_000 }, abortOnLimit: true },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    // Ids are UUIDs (v7: time-ordered, so they sort by creation and index well), not guessable
    // sequential numbers in URLs
    idType: 'uuidv7',
    push: !deployment.production && process.env.PAYLOAD_SCHEMA_PUSH !== 'false',
    pool: {
      connectionString: deployment.databaseUrl,
      max: deployment.production ? 3 : 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    },
  }),
  sharp,
  plugins: [],
})
