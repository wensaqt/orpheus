'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BinderMove } from '@/lib/binder/tree'
import type { Id } from '@/lib/ids'

import { useBinderDropMonitor } from '../dnd/useBinderDropMonitor'
import { MoveDialog } from '../MoveDialog'
import { dropDestination, reorderDestination, visibleRows } from '../rows'
import type { BinderRow as Row, DropOperation } from '../types'
import { useBinder } from '../state/BinderProvider'
import { BinderRow, type RowHandle } from './BinderRow'
import styles from './BinderTree.module.css'
import { type TreeCommand, treeKeyCommand } from './treeKeyboard'

const isTreeItem = (target: EventTarget) =>
  target instanceof Element && target.getAttribute('role') === 'treeitem'

// The focused row if it is still shown, else the open document, else the first row
const tabbableRowId = (rows: Row[], focusedId: Id | null, activeDocumentId: Id | null) =>
  rows.find((row) => row.entry.id === focusedId)?.entry.id ??
  rows.find((row) => row.entry.id === activeDocumentId)?.entry.id ??
  rows[0]?.entry.id

// Where the focus goes when a row is removed: the row above, else the next one not inside it
function neighbourOf(rows: Row[], row: Row) {
  const index = rows.indexOf(row)
  return rows[index - 1] ?? rows.slice(index + 1).find((next) => next.level <= row.level)
}

/*
 * The binder as an ARIA tree: a flat list of rows carrying their level, one focusable at a
 * time (roving tabindex). Keys go through treeKeyCommand; rows can also be dragged before,
 * after or into one another.
 */
export function BinderTree({ label }: { label: string }) {
  const { entries, collapsed, activeDocumentId, setFolderOpen, setRenamingId, commands } =
    useBinder()
  const rows = useMemo(() => visibleRows(entries, collapsed), [entries, collapsed])

  const [focusedId, setFocusedId] = useState<Id | null>(null)
  // A row to focus once it is rendered (after a move into a closed folder, a deletion…)
  const [focusRequest, setFocusRequest] = useState<Id | null>(null)
  const [moving, setMoving] = useState<Row | null>(null)
  const handles = useRef(new Map<Id, RowHandle>())
  const tree = useRef<HTMLUListElement>(null)

  const tabbableId = tabbableRowId(rows, focusedId, activeDocumentId)

  const register = useCallback((id: Id, handle: RowHandle | null) => {
    if (handle) handles.current.set(id, handle)
    else handles.current.delete(id)
  }, [])

  useEffect(() => {
    if (focusRequest === null) return
    const handle = handles.current.get(focusRequest)
    if (!handle) return
    handle.element.focus()
    setFocusRequest(null)
  }, [focusRequest, rows])

  const focusRow = (id: Id) => {
    setFocusedId(id)
    setFocusRequest(id)
  }

  async function move(id: Id, destination: BinderMove) {
    // Into a closed folder, the item would vanish from sight: open it
    if (destination.parent !== null) setFolderOpen(destination.parent, true)
    await commands.move(id, destination)
    focusRow(id)
  }

  async function remove(row: Row) {
    const neighbour = neighbourOf(rows, row)
    await commands.remove(row.entry)
    if (neighbour) setFocusRequest(neighbour.entry.id)
  }

  function handleDrop(draggedId: Id, targetId: Id, operation: DropOperation) {
    const destination = dropDestination(entries, draggedId, targetId, operation)
    if (destination) void move(draggedId, destination)
  }

  useBinderDropMonitor(tree, handleDrop)

  const execute = (command: TreeCommand) => {
    const row = rows.find((candidate) => candidate.entry.id === command.id)
    if (!row) return
    switch (command.type) {
      case 'focus':
        return focusRow(command.id)
      case 'setOpen':
        return setFolderOpen(command.id, command.open)
      case 'activate':
        return row.entry.kind === 'folder'
          ? setFolderOpen(row.entry.id, !row.expanded)
          : void commands.open(row.entry.id)
      case 'rename':
        return setRenamingId(command.id)
      case 'delete':
        return void remove(row)
      case 'menu':
        return handles.current.get(command.id)?.openMenu()
      case 'reorder': {
        const destination = reorderDestination(row, command.step)
        return destination ? void move(row.entry.id, destination) : undefined
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    // Keys typed in a row's menu or rename field are theirs, not the tree's
    if (!isTreeItem(event.target)) return
    const current = focusedId ?? tabbableId
    if (current === undefined) return
    const command = treeKeyCommand(rows, current, event)
    if (!command) return
    event.preventDefault()
    execute(command)
  }

  const closeMoveDialog = () => setMoving(null)

  function handleMoveChosen(destination: BinderMove) {
    const item = moving
    closeMoveDialog()
    if (item) void move(item.entry.id, destination)
  }

  return (
    <>
      <ul
        ref={tree}
        role="tree"
        aria-label={label}
        className={styles.tree}
        onKeyDown={handleKeyDown}
      >
        {rows.map((row) => (
          <BinderRow
            key={row.entry.id}
            row={row}
            tabbable={row.entry.id === tabbableId}
            register={register}
            onFocus={setFocusedId}
            onMoveTo={setMoving}
          />
        ))}
      </ul>
      <MoveDialog
        item={moving?.entry ?? null}
        onClose={closeMoveDialog}
        onMove={handleMoveChosen}
      />
    </>
  )
}
