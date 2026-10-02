'use client'

import React, { useCallback, useRef } from 'react'

import { descendantIds } from '@/lib/binder/tree'

import type { MenuHandle } from '@front/_components/ui/Menu/Menu'

import { useRowDragAndDrop } from '../dnd/useRowDragAndDrop'
import { ChevronIcon, DocumentIcon, FolderIcon } from '../icons'
import type { BinderRow as Row } from '../rows'
import { useBinder } from '../state/BinderProvider'
import styles from './BinderRow.module.css'
import { RenameField } from './RenameField'
import { RowMenu } from './RowMenu'

// What the tree keeps of each row: where to move the focus, how to open its menu
export type RowHandle = { element: HTMLLIElement; openMenu: () => void }

type BinderRowProps = {
  row: Row
  // Roving focus: only one row is in the tab order
  tabbable: boolean
  register: (id: number, handle: RowHandle | null) => void
  onFocus: (id: number) => void
  onMoveTo: (row: Row) => void
}

// One line of the binder tree: fold arrow, icon, title (or its rename field), then the ⋯ menu
export function BinderRow({ row, tabbable, register, onFocus, onMoveTo }: BinderRowProps) {
  const { entries, activeDocumentId, renamingId, setRenamingId, setFolderOpen, commands } =
    useBinder()
  const { entry, level, expanded } = row
  const isFolder = entry.kind === 'folder'
  const renaming = renamingId === entry.id

  const element = useRef<HTMLLIElement | null>(null)
  const menu = useRef<MenuHandle | null>(null)
  const { dragging, drop } = useRowDragAndDrop(element, {
    row,
    disabled: renaming,
    excludedWhenDragged: () => [entry.id, ...descendantIds(entries, entry.id)],
  })

  const setElement = useCallback(
    (node: HTMLLIElement | null) => {
      element.current = node
      register(entry.id, node ? { element: node, openMenu: () => menu.current?.open() } : null)
    },
    [register, entry.id],
  )
  const focusRow = () => element.current?.focus()
  /*
   * When the menu closes, the focus goes back to its button (out of the tab order) or nowhere:
   * the row takes it. An action that focused something else (the rename field) keeps it.
   */
  const focusRowIfLost = () => {
    const focused = document.activeElement
    if (focused === document.body || focused?.closest('[aria-haspopup="menu"]')) focusRow()
  }
  // Clicks in the rename field or on the menu are theirs
  const isOwnControl = (target: EventTarget) =>
    target instanceof Element && target.closest('input, button') !== null
  const activate = () =>
    isFolder ? setFolderOpen(entry.id, !expanded) : void commands.open(entry.id)

  return (
    <li
      ref={setElement}
      role="treeitem"
      aria-level={level}
      aria-setsize={row.setSize}
      aria-posinset={row.posInSet}
      aria-expanded={isFolder ? expanded : undefined}
      // The document on the sheet; selection itself is not a feature of this tree
      aria-current={entry.id === activeDocumentId ? 'page' : undefined}
      aria-label={entry.title}
      tabIndex={tabbable ? 0 : -1}
      className={styles.row}
      data-dragging={dragging}
      data-drop={drop ?? undefined}
      style={{ '--level': level - 1 } as React.CSSProperties}
      onFocus={(e) => {
        if (e.target === e.currentTarget) onFocus(entry.id)
      }}
      onClick={(e) => {
        if (isOwnControl(e.target)) return
        onFocus(entry.id)
        activate()
      }}
      onDoubleClick={(e) => {
        if (!isOwnControl(e.target)) setRenamingId(entry.id)
      }}
    >
      {isFolder ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className={styles.chevron}
          data-open={expanded}
          onClick={() => setFolderOpen(entry.id, !expanded)}
        >
          <ChevronIcon />
        </button>
      ) : (
        <span className={styles.chevron} aria-hidden="true" />
      )}
      <span className={styles.icon}>
        {isFolder ? <FolderIcon open={expanded} /> : <DocumentIcon />}
      </span>
      {renaming ? (
        <RenameField
          title={entry.title}
          onDone={(title) => {
            setRenamingId(null)
            focusRow()
            if (title) void commands.rename(entry.id, title)
          }}
        />
      ) : (
        <span className={styles.title}>{entry.title}</span>
      )}
      <RowMenu row={row} ref={menu} onMoveTo={() => onMoveTo(row)} onClose={focusRowIfLost} />
    </li>
  )
}
