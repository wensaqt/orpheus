// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { registerPendingChanges, savePendingChanges } from '@front/_lib/pendingChanges'

it('awaits every mounted saver and blocks exits until all succeed', async () => {
  const failed = vi.fn(async () => false)
  const saved = vi.fn(async () => true)
  const unregisterFailed = registerPendingChanges(failed)
  const unregisterSaved = registerPendingChanges(saved)
  try {
    expect(await savePendingChanges()).toBe(false)
    expect(saved).toHaveBeenCalledOnce()
    unregisterFailed()
    expect(await savePendingChanges()).toBe(true)
  } finally {
    unregisterFailed()
    unregisterSaved()
  }
  expect(await savePendingChanges()).toBe(true)
})
