import * as initial from './20261001_120000_initial'
import * as portraitPages from './20261007_120000_portrait_pages'
import * as scoreDocuments from './20261008_120000_score_documents'

export const migrations = [
  { name: '20261001_120000_initial', up: initial.up, down: initial.down },
  { name: '20261007_120000_portrait_pages', up: portraitPages.up, down: portraitPages.down },
  { name: '20261008_120000_score_documents', up: scoreDocuments.up, down: scoreDocuments.down },
]
