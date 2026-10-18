import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  binder: {
    entries: [] as Array<{
      id: string
      kind: 'document' | 'folder'
      parent: string | null
      position: number
      title: string
      documentType?: 'text' | 'score'
    }>,
    activeDocumentId: null as string | null,
    commands: { open: vi.fn() },
  },
  history: { busy: false },
}))

vi.mock('@front/compositions/[id]/_components/binder/state/BinderProvider', () => ({
  useBinder: () => mocks.binder,
}))
vi.mock('@front/compositions/[id]/_components/history/HistoryProvider', () => ({
  useHistoryState: () => mocks.history,
}))
vi.mock('@front/_components/i18n/I18nProvider', () => ({
  useT: () => (key: string, params?: { title: string }) =>
    params ? `${key}:${params.title}` : key,
}))

const { MobileDocumentNavigator } =
  await import('@front/compositions/[id]/_components/document/MobileDocumentNavigator')

const doc = (
  id: string,
  title: string,
  parent: string | null,
  position: number,
  documentType: 'text' | 'score' = 'text',
) => ({ id, title, kind: 'document' as const, parent, position, documentType })
const folder = (id: string, title: string, parent: string | null, position: number) => ({
  id,
  title,
  kind: 'folder' as const,
  parent,
  position,
})

beforeEach(() => {
  mocks.binder.entries = []
  mocks.binder.activeDocumentId = null
  mocks.binder.commands.open.mockReset().mockResolvedValue(true)
  mocks.history.busy = false
})

afterEach(cleanup)

it('navigates text and score documents in visual depth-first order and opens the binder from the title', async () => {
  mocks.binder.entries = [
    doc('first', 'First', null, 0),
    folder('folder', 'Folder', null, 1),
    doc('score', 'Inside score', 'folder', 0, 'score'),
    doc('nested', 'Nested text', 'folder', 1),
    doc('last', 'Last', null, 2),
  ]
  mocks.binder.activeDocumentId = 'score'
  const onOpenBinder = vi.fn()
  render(<MobileDocumentNavigator onOpenBinder={onOpenBinder} />)

  expect(
    screen.getByRole('button', { name: 'binder.openCurrentDocument:Inside score' }),
  ).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'binder.previousDocument' }))
  await waitFor(() => expect(mocks.binder.commands.open).toHaveBeenNthCalledWith(1, 'first'))
  fireEvent.click(screen.getByRole('button', { name: 'binder.nextDocument' }))
  await waitFor(() => expect(mocks.binder.commands.open).toHaveBeenNthCalledWith(2, 'nested'))

  fireEvent.click(screen.getByRole('button', { name: 'binder.openCurrentDocument:Inside score' }))
  expect(onOpenBinder).toHaveBeenCalledOnce()
})

it('disables navigation at both ends and keeps the binder available when no document is open', () => {
  mocks.binder.entries = [doc('first', 'First', null, 0), doc('last', 'Last', null, 1)]
  mocks.binder.activeDocumentId = 'first'
  const view = render(<MobileDocumentNavigator onOpenBinder={vi.fn()} />)
  expect(
    (screen.getByRole('button', { name: 'binder.previousDocument' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(
    (screen.getByRole('button', { name: 'binder.nextDocument' }) as HTMLButtonElement).disabled,
  ).toBe(false)

  mocks.binder.activeDocumentId = 'last'
  view.rerender(<MobileDocumentNavigator onOpenBinder={vi.fn()} />)
  expect(
    (screen.getByRole('button', { name: 'binder.previousDocument' }) as HTMLButtonElement).disabled,
  ).toBe(false)
  expect(
    (screen.getByRole('button', { name: 'binder.nextDocument' }) as HTMLButtonElement).disabled,
  ).toBe(true)

  mocks.binder.entries = [folder('folder', 'Folder', null, 0)]
  mocks.binder.activeDocumentId = null
  const onOpenBinder = vi.fn()
  view.rerender(<MobileDocumentNavigator onOpenBinder={onOpenBinder} />)
  expect(screen.getByText('binder.label')).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: 'binder.previousDocument' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(
    (screen.getByRole('button', { name: 'binder.nextDocument' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'binder.show' }))
  expect(onOpenBinder).toHaveBeenCalledOnce()
})

it('disables both arrows while history is busy', () => {
  mocks.binder.entries = [doc('first', 'First', null, 0), doc('last', 'Last', null, 1)]
  mocks.binder.activeDocumentId = 'first'
  mocks.history.busy = true
  render(<MobileDocumentNavigator onOpenBinder={vi.fn()} />)

  expect(
    (screen.getByRole('button', { name: 'binder.previousDocument' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(
    (screen.getByRole('button', { name: 'binder.nextDocument' }) as HTMLButtonElement).disabled,
  ).toBe(true)
})

it('blocks repeated clicks during an open and unlocks after a failed navigation', async () => {
  mocks.binder.entries = [doc('first', 'First', null, 0), doc('next', 'Next', null, 1)]
  mocks.binder.activeDocumentId = 'first'
  let finishOpen!: (opened: boolean) => void
  const deferred = new Promise<boolean>((resolve) => {
    finishOpen = resolve
  })
  mocks.binder.commands.open.mockReturnValueOnce(deferred).mockResolvedValue(false)
  render(<MobileDocumentNavigator onOpenBinder={vi.fn()} />)

  const next = screen.getByRole('button', { name: 'binder.nextDocument' }) as HTMLButtonElement
  fireEvent.click(next)
  expect(next.disabled).toBe(true)
  fireEvent.click(next)
  expect(mocks.binder.commands.open).toHaveBeenCalledTimes(1)

  await act(async () => {
    finishOpen(false)
    await deferred
  })
  await waitFor(() => expect(next.disabled).toBe(false))

  fireEvent.click(next)
  await waitFor(() => expect(mocks.binder.commands.open).toHaveBeenCalledTimes(2))
})
