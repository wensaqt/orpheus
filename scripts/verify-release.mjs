import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const tag = process.env.GITHUB_REF_NAME
if (!/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(tag ?? '') || tag !== `v${version}`)
  throw new Error('The release tag must match the package.json version exactly.')
console.log(`Release version verified: ${version}`)
