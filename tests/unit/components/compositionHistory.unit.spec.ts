import { describe, expect, it, vi } from 'vitest'
import { createHistoryStore } from '@front/compositions/[id]/_components/history/historyStore'

describe('composition history', () => {
  it('orders domains, groups a gesture, and restores the latest redo', async () => {
    const history = createHistoryStore()
    const effects: string[] = []
    const change = (label: string) => ({
      scope: { kind: 'layout' as const },
      undo: () => {
        effects.push(`undo ${label}`)
        return true
      },
      redo: () => {
        effects.push(`redo ${label}`)
        return true
      },
    })
    history.record(change('text'))
    const gesture = {}
    history.record(change('margin'), gesture)
    history.record(change('margin end'), gesture)
    await history.undo()
    await history.undo()
    await history.redo()
    await history.redo()
    expect(effects).toEqual(['undo margin', 'undo text', 'redo text', 'redo margin end'])
  })

  it('flushes first, queues shortcuts, and keeps a failed undo available', async () => {
    const history = createHistoryStore()
    let release: (accepted: boolean) => void = () => {}
    const prepare = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve
        }),
    )
    const undo = vi.fn(() => false)
    const reportError = vi.fn()
    history.configure({ prepare, reportError, openDocument: async () => true })
    history.record({ scope: { kind: 'layout' }, undo, redo: () => true })
    const pending = history.undo()
    expect(history.getSnapshot().busy).toBe(true)
    const queued = history.undo()
    expect(undo).not.toHaveBeenCalled()
    release(true)
    expect(await pending).toBe(false)
    expect(await queued).toBe(false)
    expect(prepare).toHaveBeenCalledOnce()
    expect(history.getSnapshot()).toMatchObject({ canUndo: true, canRedo: false, busy: false })
    expect(reportError).toHaveBeenCalledOnce()
  })

  it('processes rapid undo/redo in order with one save boundary', async () => {
    const history = createHistoryStore()
    const prepare = vi.fn(async () => true)
    history.configure({ prepare, reportError: () => {}, openDocument: async () => true })
    let value = 2
    history.record({
      scope: { kind: 'layout' },
      undo: () => {
        value = 0
        return true
      },
      redo: () => {
        value = 1
        return true
      },
    })
    history.record({
      scope: { kind: 'layout' },
      undo: () => {
        value = 1
        return true
      },
      redo: () => {
        value = 2
        return true
      },
    })
    expect(await Promise.all([history.undo(), history.undo(), history.redo()])).toEqual([
      true,
      true,
      true,
    ])
    expect(value).toBe(1)
    expect(prepare).toHaveBeenCalledOnce()
  })

  it('waits for a pending structural mutation instead of dropping the next one', async () => {
    const history = createHistoryStore()
    let release: () => void = () => {}
    const firstReady = new Promise<void>((resolve) => {
      release = resolve
    })
    const effects: string[] = []
    const first = history.perform(async () => {
      effects.push('first started')
      await firstReady
      effects.push('first saved')
      return true
    })
    const second = history.perform(async () => {
      effects.push('second saved')
      return true
    })
    await Promise.resolve()
    expect(effects).toEqual(['first started'])
    release()
    expect(await Promise.all([first, second])).toEqual([true, true])
    expect(effects).toEqual(['first started', 'first saved', 'second saved'])
  })

  it('does not replay after a failed save and invalidates redo on a new edit', async () => {
    const history = createHistoryStore()
    const undo = vi.fn(() => true)
    history.record({ scope: { kind: 'layout' }, undo, redo: () => true })
    history.configure({
      prepare: async () => false,
      reportError: () => {},
      openDocument: async () => true,
    })
    expect(await history.undo()).toBe(false)
    expect(undo).not.toHaveBeenCalled()
    history.configure({
      prepare: async () => true,
      reportError: () => {},
      openDocument: async () => true,
    })
    await history.undo()
    history.record({ scope: { kind: 'layout' }, undo, redo: () => true })
    expect(history.getSnapshot().canRedo).toBe(false)
  })

  it('drops a gesture returned to its initial value and advances the typing boundary', () => {
    const history = createHistoryStore()
    const token = {}
    history.record({ scope: { kind: 'layout' }, undo: () => true, redo: () => true }, token)
    history.record(
      { scope: { kind: 'layout' }, undo: () => true, redo: () => true, isEmpty: () => true },
      token,
    )
    expect(history.getSnapshot().canUndo).toBe(false)
    expect(history.mergeBarrier).toBeGreaterThan(0)
  })
})
