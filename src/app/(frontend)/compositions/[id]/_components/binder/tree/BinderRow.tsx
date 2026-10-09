'use client'

import React, { useCallback, useRef } from 'react'

import { descendantIds } from '@/lib/binder/tree'
import type { Id } from '@/lib/ids'

import type { MenuHandle } from '@front/_components/ui/Menu/types'
import { prefetchDocument } from '@front/_features/binder/documentStore'

import { useRowDragAndDrop } from '../dnd/useRowDragAndDrop'
import { ChevronIcon, DocumentIcon, FolderIcon, ScoreIcon } from '../../icons'
import type { BinderRow as Row } from '../types'
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
  register: (id: Id, handle: RowHandle | null) => void
  onFocus: (id: Id) => void
  onMoveTo: (row: Row) => void
}

// One line of the binder tree: fold arrow, icon, title (or its rename field), then the ⋯ menu
export function BinderRow({ row, tabbable, register, onFocus, onMoveTo }: BinderRowProps) {
  const {
    compositionId,
    entries,
    activeDocumentId,
    renamingId,
    setRenamingId,
    setFolderOpen,
    commands,
  } = useBinder()
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
  const toggleFolder = () => setFolderOpen(entry.id, !expanded)
  const activate = () => (isFolder ? toggleFolder() : void commands.open(entry.id))
  // Likely opened next: its text is loaded ahead, so opening it is instant
  const prefetch = () => {
    if (entry.documentType === 'text') prefetchDocument(compositionId, entry.id)
  }

  function handleFocus(event: React.FocusEvent<HTMLLIElement>) {
    if (event.target !== event.currentTarget) return
    onFocus(entry.id)
    if (!isFolder) prefetch()
  }

  function handleClick(event: React.MouseEvent<HTMLLIElement>) {
    if (isOwnControl(event.target)) return
    onFocus(entry.id)
    activate()
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLLIElement>) {
    if (!isOwnControl(event.target)) setRenamingId(entry.id)
  }

  function handleRenamed(title: string | null) {
    setRenamingId(null)
    focusRow()
    if (title) void commands.rename(entry.id, title)
  }

  return (
    <li
      ref={setElement}
      role="treeitem"
      aria-level={level}
      aria-setsize={row.setSize}
      aria-posinset={row.posInSet}
      aria-expanded={isFolder ? expanded : undefined}
      // The document currently shown on the sheet
      aria-current={entry.id === activeDocumentId ? 'page' : undefined}
      aria-selected={entry.id === activeDocumentId}
      aria-label={entry.title}
      tabIndex={tabbable ? 0 : -1}
      className={styles.row}
      data-dragging={dragging}
      data-drop={drop ?? undefined}
      style={{ '--level': level - 1 }}
      onPointerEnter={isFolder ? undefined : prefetch}
      onFocus={handleFocus}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {isFolder ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className={styles.chevron}
          data-open={expanded}
          onClick={toggleFolder}
        >
          <ChevronIcon />
        </button>
      ) : (
        <span className={styles.chevron} aria-hidden="true" />
      )}
      <span className={styles.icon}>
        {isFolder ? (
          <FolderIcon open={expanded} />
        ) : entry.documentType === 'score' ? (
          <ScoreIcon />
        ) : (
          <DocumentIcon />
        )}
      </span>
      {renaming ? (
        <RenameField title={entry.title} onDone={handleRenamed} />
      ) : (
        <span className={styles.title}>{entry.title}</span>
      )}
      <RowMenu row={row} ref={menu} onMoveTo={() => onMoveTo(row)} onClose={focusRowIfLost} />
    </li>
  )
}
