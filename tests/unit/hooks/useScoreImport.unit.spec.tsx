import { act, cleanup, renderHook } from '@testing-library/react'
import type { ChangeEvent } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { SAMPLE_SCORE } from '@/lib/scores/sample'

const verify = vi.fn()
vi.doMock('@front/_components/scores/scoreRenderValidation', () => ({ verifyScoreRender: verify }))
const { useScoreImport } = await import('@front/compositions/[id]/_components/score/useScoreImport')
beforeEach(() => {
  verify.mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function event(text: () => Promise<string>) {
  const input = document.createElement('input')
  Object.defineProperty(input, 'files', {
    value: [{ name: 'score.musicxml', size: SAMPLE_SCORE.length, text }],
  })
  return { currentTarget: input } as ChangeEvent<HTMLInputElement>
}
function setup() {
  const onImport = vi.fn()
  const onError = vi.fn()
  return {
    onImport,
    onError,
    ...renderHook(() => useScoreImport({ getWidth: () => 800, onImport, onError })),
  }
}

it('skips expensive verification for an import superseded during file reading', async () => {
  const reading = deferred<string>()
  const { result, onImport } = setup()
  let first!: Promise<void>
  act(() => {
    first = result.current.importFile(event(() => reading.promise))
  })
  await act(async () => result.current.importFile(event(async () => SAMPLE_SCORE)))
  await act(async () => {
    reading.resolve(SAMPLE_SCORE)
    await first
  })
  expect(verify).toHaveBeenCalledOnce()
  expect(onImport).toHaveBeenCalledOnce()
})

it('ignores an earlier import when its renderer completes after the newer one', async () => {
  const rendering = deferred<void>()
  verify.mockReturnValueOnce(rendering.promise)
  const { result, onImport } = setup()
  let first!: Promise<void>
  await act(async () => {
    first = result.current.importFile(event(async () => SAMPLE_SCORE))
  })
  const secondXml = SAMPLE_SCORE.replace(
    '<part-name>Piano</part-name>',
    '<part-name>Violin</part-name>',
  )
  await act(async () => result.current.importFile(event(async () => secondXml)))
  await act(async () => {
    rendering.resolve()
    await first
  })
  expect(onImport).toHaveBeenCalledOnce()
  expect(onImport).toHaveBeenCalledWith(secondXml)
})

it('does not verify or accept a file read completed after unmount', async () => {
  const reading = deferred<string>()
  const { result, onImport, onError, unmount } = setup()
  let importing!: Promise<void>
  act(() => {
    importing = result.current.importFile(event(() => reading.promise))
  })
  unmount()
  await act(async () => {
    reading.resolve(SAMPLE_SCORE)
    await importing
  })
  expect(verify).not.toHaveBeenCalled()
  expect(onImport).not.toHaveBeenCalled()
  expect(onError).not.toHaveBeenCalled()
})

it('keeps the document unchanged and reports a failed render', async () => {
  verify.mockRejectedValue(new Error('Invalid notation'))
  const { result, onImport, onError } = setup()
  await act(async () => result.current.importFile(event(async () => SAMPLE_SCORE)))
  expect(onImport).not.toHaveBeenCalled()
  expect(onError).toHaveBeenCalledWith('Invalid notation')
})
