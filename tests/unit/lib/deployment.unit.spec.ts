import { expect, it } from 'vitest'

import { deploymentConfig } from '@/lib/deployment'

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
