import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const load = vi.fn()
const draw = vi.fn()
vi.doMock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: class {
    load = load
    render = draw
  },
}))
const { verifyScoreRender } = await import('@front/_components/scores/scoreRenderValidation')

beforeEach(() => {
  load.mockReset().mockResolvedValue(undefined)
  draw.mockReset()
})
afterEach(() => document.body.replaceChildren())

it('keeps validation offscreen and removes the temporary render area after success', async () => {
  load.mockImplementation(async () => {
    expect(document.body.firstElementChild?.getAttribute('style')).toContain('width: 640px')
    expect(document.body.firstElementChild?.getAttribute('style')).toContain('visibility: hidden')
  })
  await verifyScoreRender('xml', 640)
  expect(draw).toHaveBeenCalledOnce()
  expect(document.body.children).toHaveLength(0)
})

it.each(['load', 'draw'])('removes the temporary render area when %s fails', async (stage) => {
  const error = new Error('Invalid notation')
  if (stage === 'load') load.mockRejectedValueOnce(error)
  else
    draw.mockImplementationOnce(() => {
      throw error
    })
  await expect(verifyScoreRender('xml', 640)).rejects.toBe(error)
  expect(document.body.children).toHaveLength(0)
})

it('rejects an unavailable sheet before invoking the renderer', async () => {
  await expect(verifyScoreRender('xml', 0)).rejects.toMatchObject({ code: 'noRenderArea' })
  expect(load).not.toHaveBeenCalled()
  expect(document.body.children).toHaveLength(0)
})
