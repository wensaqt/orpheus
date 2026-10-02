'use client'

import type { Ref } from 'react'

import type { BinderItemKind } from '@/lib/binder/constants'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Menu, type MenuHandle, type MenuItem } from '@front/_components/ui/Menu/Menu'

import { type BinderRow, reorderDestination } from '../rows'
import { useBinder } from '../state/BinderProvider'
import styles from './BinderRow.module.css'

type RowMenuProps = {
  row: BinderRow
  ref: Ref<MenuHandle>
  onMoveTo: () => void
  // The row takes the focus back when the menu closes
  onClose: () => void
}

/*
 * The ⋯ menu of a binder row. Its button stays out of the tab order: the row itself is
 * focusable, and Shift+F10 opens this menu from it.
 */
export function RowMenu({ row, ref, onMoveTo, onClose }: RowMenuProps) {
  const t = useT()
  const { commands, setFolderOpen, setRenamingId } = useBinder()
  const { entry } = row

  const createInside = (kind: BinderItemKind) => {
    setFolderOpen(entry.id, true)
    void commands.create(kind, entry.id)
  }
  const reorder = (step: -1 | 1) => {
    const destination = reorderDestination(row, step)
    return destination ? () => void commands.move(entry.id, destination) : undefined
  }
  const moveUp = reorder(-1)
  const moveDown = reorder(1)

  const items: MenuItem[] = [
    ...(entry.kind === 'folder'
      ? [
          {
            label: t('binder.actions.newDocumentInside'),
            onSelect: () => createInside('document'),
          },
          { label: t('binder.actions.newFolderInside'), onSelect: () => createInside('folder') },
        ]
      : []),
    { label: t('binder.actions.rename'), onSelect: () => setRenamingId(entry.id) },
    { label: t('binder.actions.moveUp'), onSelect: moveUp, disabled: !moveUp },
    { label: t('binder.actions.moveDown'), onSelect: moveDown, disabled: !moveDown },
    { label: t('binder.actions.moveTo'), onSelect: onMoveTo },
    {
      label: t('binder.actions.delete'),
      tone: 'danger',
      onSelect: () => void commands.remove(entry),
    },
  ]

  return (
    <Menu
      ref={ref}
      onClose={onClose}
      label={t('binder.actions.open', { title: entry.title })}
      items={items}
      triggerClassName={styles.more}
      triggerTabIndex={-1}
    >
      <span aria-hidden="true">⋯</span>
    </Menu>
  )
}
