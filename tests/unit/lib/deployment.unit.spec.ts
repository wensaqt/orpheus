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

it('uses the stable production domain when APP_URL is absent on Vercel', () => {
  const vercel = {
    ...production,
    APP_URL: '',
    VERCEL_ENV: 'production',
    VERCEL_PROJECT_PRODUCTION_URL: 'orpheus-azure.vercel.app',
    VERCEL_URL: 'orpheus-unique-deployment.vercel.app',
  }
  expect(deploymentConfig(vercel).origin).toBe('https://orpheus-azure.vercel.app')
  expect(deploymentConfig({ ...vercel, APP_URL: 'https://custom.example/' }).origin).toBe(
    'https://custom.example',
  )
})

it('keeps preview deployments on their own domain when APP_URL is absent', () => {
  expect(
    deploymentConfig({
      ...production,
      APP_URL: '',
      VERCEL_ENV: 'preview',
      VERCEL_PROJECT_PRODUCTION_URL: 'orpheus-azure.vercel.app',
      VERCEL_URL: 'orpheus-preview.vercel.app',
    }).origin,
  ).toBe('https://orpheus-preview.vercel.app')
})
