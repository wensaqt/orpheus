import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'

import {
  useScoreXml,
  MAX_SCORE_HISTORY_STEPS,
} from '@front/compositions/[id]/_components/score/useScoreXml'

it('captures each preceding XML even when mutations happen before React renders', () => {
  const { result } = renderHook(() => useScoreXml('original'))
  act(() => {
    result.current.commitXml('first')
    expect(result.current.xmlRef.current).toBe('first')
    result.current.commitXml('second')
    expect(result.current.xmlRef.current).toBe('second')
  })
  act(() => {
    result.current.restorePreviousXml()
  })
  expect(result.current.xml).toBe('first')
  act(() => {
    result.current.restorePreviousXml()
  })
  expect(result.current.xml).toBe('original')
  expect(result.current.canUndo).toBe(false)
})

it('keeps undo identity stable across renders that do not change the history', () => {
  const { result, rerender } = renderHook(() => useScoreXml('original'))
  const undo = result.current.restorePreviousXml
  rerender()
  expect(result.current.restorePreviousXml).toBe(undo)
})

it('consumes consecutive undo commands before React renders', () => {
  const { result } = renderHook(() => useScoreXml('original'))
  act(() => {
    result.current.commitXml('first')
    result.current.commitXml('second')
    expect(result.current.restorePreviousXml()).toBe(true)
    expect(result.current.restorePreviousXml()).toBe(true)
    expect(result.current.restorePreviousXml()).toBe(false)
  })
  expect(result.current.xml).toBe('original')
})

it('redoes consecutive changes and clears redo after a new edit', () => {
  const { result } = renderHook(() => useScoreXml('original'))
  act(() => {
    result.current.commitXml('first')
    result.current.commitXml('second')
    result.current.restorePreviousXml()
    result.current.restorePreviousXml()
  })
  expect(result.current.canRedo).toBe(true)
  act(() => {
    expect(result.current.restoreNextXml()).toBe(true)
    expect(result.current.restoreNextXml()).toBe(true)
    expect(result.current.xmlRef.current).toBe('second')
    expect(result.current.restoreNextXml()).toBe(false)
    result.current.restorePreviousXml()
    result.current.commitXml('different')
  })
  expect(result.current.canRedo).toBe(false)
  expect(result.current.xml).toBe('different')
})

it('advances generation even when undo returns to the same XML', () => {
  const { result } = renderHook(() => useScoreXml('original'))
  act(() => {
    result.current.commitXml('changed')
    result.current.restorePreviousXml()
  })
  expect(result.current.generation.current).toBe(2)
  expect(result.current.xml).toBe('original')
})

it('does not add unchanged XML to the history', () => {
  const { result } = renderHook(() => useScoreXml('original'))
  act(() => result.current.commitXml('original'))
  expect(result.current.canUndo).toBe(false)
})

it('retains only the most recent history steps', () => {
  const { result } = renderHook(() => useScoreXml('0'))
  act(() => {
    for (let index = 1; index <= MAX_SCORE_HISTORY_STEPS + 5; index++)
      result.current.commitXml(String(index))
    for (let index = 0; index < MAX_SCORE_HISTORY_STEPS; index++)
      expect(result.current.restorePreviousXml()).toBe(true)
    expect(result.current.restorePreviousXml()).toBe(false)
  })
  expect(result.current.xml).toBe('5')
})
