import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useStoredState } from '@front/_hooks/useStoredState'

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', { key: null }))
})

describe('useStoredState', () => {
  it('falls back when stored JSON does not match the expected type', () => {
    localStorage.setItem('invalid-preference', '[]')
    const { result } = renderHook(() => useStoredState('invalid-preference', false, isBoolean))
    expect(result.current[0]).toBe(false)
  })

  it('shares failed writes between subscribers and keeps them across remounts', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })
    const first = renderHook(() => useStoredState('memory-preference', false, isBoolean))
    const second = renderHook(() => useStoredState('memory-preference', false, isBoolean))
    act(() => first.result.current[1](true))
    expect(first.result.current[0]).toBe(true)
    expect(second.result.current[0]).toBe(true)
    first.unmount()
    second.unmount()
    const reopened = renderHook(() => useStoredState('memory-preference', false, isBoolean))
    expect(reopened.result.current[0]).toBe(true)
  })

  it('keeps working when storage reads and writes are unavailable', () => {
    const unavailable = () => {
      throw new DOMException('Storage unavailable', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(unavailable)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(unavailable)
    const { result } = renderHook(() => useStoredState('private-preference', false, isBoolean))
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
  })

  it('accepts a new persisted value from another tab after a failed write', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })
    const { result } = renderHook(() => useStoredState('external-preference', false, isBoolean))
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
    write.mockRestore()
    act(() => {
      localStorage.setItem('external-preference', 'false')
      window.dispatchEvent(new StorageEvent('storage', { key: 'external-preference' }))
    })
    expect(result.current[0]).toBe(false)
  })
})
