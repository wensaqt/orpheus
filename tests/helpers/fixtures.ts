import { readFileSync } from 'node:fs'
import path from 'node:path'

// French section of a real Wiktionary page (see tests/fixtures/wiktionary)
export const wiktionaryFixture = (word: string) =>
  readFileSync(path.join(__dirname, '../fixtures/wiktionary', `${word}.wikitext`), 'utf-8')
