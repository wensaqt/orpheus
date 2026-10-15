import path from 'node:path'

import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const serverOnlyStub = path.resolve(__dirname, 'tests/stubs/server-only.ts')

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { 'server-only': serverOnlyStub },
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          // Pure functions and hooks: fast, no database or network
          name: 'unit',
          include: ['tests/unit/**/*.unit.spec.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          // Payload + Postgres in an explicitly configured disposable local database.
          name: 'int',
          setupFiles: ['./tests/setupDatabase.ts'],
          include: ['tests/int/**/*.int.spec.ts'],
          environment: 'node',
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Escaped parentheses: in a glob, "(…)" is a pattern, not a folder name
      exclude: ['src/payload-types.ts', 'src/app/\\(payload\\)/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'html'],
    },
  },
})
