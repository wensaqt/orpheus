import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Safari requires HTTPS for production's Secure session cookie, even on localhost.
// The private key exists only in a temporary directory; no test weakens application cookies.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const origin = `https://localhost:${port}`
if (process.env.APP_URL !== origin) throw new Error(`Production E2E APP_URL must be ${origin}`)
const temporary = mkdtempSync(join(tmpdir(), 'orpheus-e2e-tls-'))
const key = join(temporary, 'key.pem')
const cert = join(temporary, 'cert.pem')
const config = join(temporary, 'openssl.cnf')
writeFileSync(
  config,
  '[req]\ndistinguished_name=subject\n[subject]\nCN=localhost\n[extensions]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\n',
)
try {
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-keyout',
      key,
      '-out',
      cert,
      '-subj',
      '/CN=localhost',
      '-config',
      config,
      '-extensions',
      'extensions',
    ],
    { stdio: 'ignore' },
  )
} catch (error) {
  rmSync(temporary, { recursive: true, force: true })
  throw error
}

const next = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port + 1),
  ],
  {
    stdio: 'inherit',
    // Playwright imports TS fixtures; Next owns its config loader and must not inherit tsx.
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  },
)
const server = https.createServer(
  { key: readFileSync(key), cert: readFileSync(cert) },
  (request, response) => {
    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: port + 1,
        path: request.url,
        method: request.method,
        headers: {
          ...request.headers,
          'x-forwarded-proto': 'https',
          'x-forwarded-host': request.headers.host,
        },
      },
      (result) => {
        response.writeHead(result.statusCode ?? 502, result.headers)
        result.pipe(response)
      },
    )
    upstream.on('error', () => {
      response.writeHead(503)
      response.end('The production test server is starting.')
    })
    request.pipe(upstream)
  },
)
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  server.close()
  next.kill('SIGTERM')
  rmSync(temporary, { recursive: true, force: true })
  process.exitCode = code
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
next.on('error', (error) => {
  console.error(error)
  stop(1)
})
next.on('exit', (code) => stop(code ?? 1))
server.on('error', (error) => {
  console.error(error)
  stop(1)
})
server.listen(port, '127.0.0.1')
