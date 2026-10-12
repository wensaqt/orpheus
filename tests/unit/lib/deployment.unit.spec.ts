import { expect, it } from 'vitest'

import { canRegisterEmail, deploymentConfig, verifyBetaInvite } from '@/lib/deployment'

const production = {
  NODE_ENV: 'production',
  PAYLOAD_SECRET: 'test-secret-with-at-least-32-characters',
  DATABASE_URL: 'postgres://user:password@localhost:5432/test',
  APP_URL: 'https://orpheus.example',
}

it('fails closed on missing production configuration and weak secrets', () => {
  expect(() => deploymentConfig({ ...production, PAYLOAD_SECRET: '' })).toThrow('PAYLOAD_SECRET')
  expect(() => deploymentConfig({ ...production, PAYLOAD_SECRET: 'short' })).toThrow('32')
  expect(() => deploymentConfig({ ...production, DATABASE_URL: '' })).toThrow('DATABASE_URL')
  expect(() => deploymentConfig({ ...production, APP_URL: '' })).toThrow('APP_URL')
  expect(() => deploymentConfig({ ...production, APP_URL: 'http://public.example' })).toThrow(
    'HTTPS',
  )
})

it('uses an explicit origin or the Vercel deployment hostname', () => {
  expect(deploymentConfig(production).origin).toBe('https://orpheus.example')
  expect(
    deploymentConfig({ ...production, APP_URL: '', VERCEL_URL: 'beta.vercel.app' }).origin,
  ).toBe('https://beta.vercel.app')
})

it('allows only invited emails in production, regardless of casing', () => {
  expect(canRegisterEmail('one@example.test', production)).toBe(false)
  const env = { ...production, BETA_ALLOWED_EMAILS: ' one@example.test, Two@example.test ' }
  expect(canRegisterEmail(' TWO@EXAMPLE.TEST ', env)).toBe(true)
  expect(canRegisterEmail('other@example.test', env)).toBe(false)
  expect(canRegisterEmail(undefined, env)).toBe(false)
  expect(canRegisterEmail('any@example.test', { NODE_ENV: 'development' })).toBe(true)
})

it('requires the private invitation code in production, and refuses missing configuration', () => {
  const code = 'local-test-invitation-with-more-than-32-characters'
  const env = { ...production, BETA_INVITE_CODE: code }
  expect(verifyBetaInvite(code, env)).toBe(true)
  expect(verifyBetaInvite(`${code}!`, env)).toBe(false)
  expect(verifyBetaInvite(undefined, env)).toBe(false)
  expect(verifyBetaInvite(code, production)).toBe(false)
  expect(verifyBetaInvite('', { NODE_ENV: 'development' })).toBe(true)
})
