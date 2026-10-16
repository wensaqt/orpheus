import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useCompositionLeaveGuard } from '@front/compositions/[id]/_components/binder/state/useCompositionLeaveGuard'
import { savePendingChanges } from '@front/_lib/pendingChanges'
import { ROUTES } from '@front/_lib/routes'
import { uuid } from '../../helpers/ids'

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn() },
  toast: { error: vi.fn() },
  t: (key: string) => key,
}))
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))
vi.mock('@front/_components/i18n/I18nProvider', () => ({ useT: () => mocks.t }))
vi.mock('@front/_components/ui/Feedback/ToastProvider', () => ({ useToast: () => mocks.toast }))

const composition = uuid(1)

function clickLink(
  href: string,
  attributes: Record<string, string> = {},
  click: MouseEventInit = {},
) {
  const link = document.createElement('a')
  link.href = href
  Object.entries(attributes).forEach(([key, value]) => link.setAttribute(key, value))
  link.innerHTML = '<span>Destination</span>'
  // Prevent jsdom's unsupported page navigation after the capture guard has observed the event.
  link.addEventListener('click', (event) => event.preventDefault())
  document.body.append(link)
  link.firstElementChild!.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, ...click }),
  )
  link.remove()
}

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', ROUTES.document(composition, uuid(2)))
})
afterEach(cleanup)

it('waits for the editor save before leaving, retaining the query and fragment', async () => {
  let finish!: (saved: boolean) => void
  const flush = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve
      }),
  )
  renderHook(() => useCompositionLeaveGuard(composition, flush))
  clickLink('/compositions?sort=title#list')
  expect(flush).toHaveBeenCalledOnce()
  expect(mocks.router.push).not.toHaveBeenCalled()
  await act(async () => finish(true))
  expect(mocks.router.push).toHaveBeenCalledWith('/compositions?sort=title#list')
})

it('blocks both link navigation and global account actions when saving fails', async () => {
  const flush = vi.fn(async () => false)
  renderHook(() => useCompositionLeaveGuard(composition, flush))
  await act(async () => clickLink('/'))
  expect(mocks.router.push).not.toHaveBeenCalled()
  expect(mocks.toast.error).toHaveBeenCalledWith('binder.saveFirst')
  expect(await savePendingChanges()).toBe(false)
})

type NavigationCase = {
  name: string
  href: string
  attributes?: Record<string, string>
  click?: MouseEventInit
}

it.each<NavigationCase>([
  { name: 'external sites', href: 'https://example.org' },
  { name: 'the current composition', href: ROUTES.document(composition, uuid(3)) },
  { name: 'downloads', href: '/export', attributes: { download: 'document.txt' } },
  { name: 'reconnection', href: '/login', attributes: { 'data-reconnect': '' } },
  { name: 'new tabs', href: '/', attributes: { target: '_blank' } },
  { name: 'modified clicks', href: '/', click: { ctrlKey: true } },
])('leaves $name to their existing navigation behavior', async ({ href, attributes, click }) => {
  const flush = vi.fn(async () => true)
  renderHook(() => useCompositionLeaveGuard(composition, flush))
  await act(async () => clickLink(href, attributes, click))
  expect(flush).not.toHaveBeenCalled()
  expect(mocks.router.push).not.toHaveBeenCalled()
})

it('removes the link listener and global saver when the editor unmounts', async () => {
  const flush = vi.fn(async () => false)
  const { unmount } = renderHook(() => useCompositionLeaveGuard(composition, flush))
  unmount()
  clickLink('/')
  expect(await savePendingChanges()).toBe(true)
  expect(flush).not.toHaveBeenCalled()
})
