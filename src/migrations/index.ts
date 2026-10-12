import * as migration_20261001_120000_initial from './20261001_120000_initial'
import * as migration_20261007_120000_portrait_pages from './20261007_120000_portrait_pages'
import * as migration_20261008_120000_score_documents from './20261008_120000_score_documents'
import * as migration_20261012_132719_beta_invitations from './20261012_132719_beta_invitations'

export const migrations = [
  {
    up: migration_20261001_120000_initial.up,
    down: migration_20261001_120000_initial.down,
    name: '20261001_120000_initial',
  },
  {
    up: migration_20261007_120000_portrait_pages.up,
    down: migration_20261007_120000_portrait_pages.down,
    name: '20261007_120000_portrait_pages',
  },
  {
    up: migration_20261008_120000_score_documents.up,
    down: migration_20261008_120000_score_documents.down,
    name: '20261008_120000_score_documents',
  },
  {
    up: migration_20261012_132719_beta_invitations.up,
    down: migration_20261012_132719_beta_invitations.down,
    name: '20261012_132719_beta_invitations',
  },
]
