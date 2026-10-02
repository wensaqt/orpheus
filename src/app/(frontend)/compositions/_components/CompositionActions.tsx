'use client'

import React, { useTransition } from 'react'

import { useConfirm } from '@front/_components/ui/Feedback/ConfirmProvider'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { Menu, type MenuItem } from '@front/_components/ui/Menu/Menu'
import { deleteComposition } from '@front/_features/compositions/actions'
import { succeeded } from '@front/_lib/actionResult'
import { useT } from '@front/_components/i18n/I18nProvider'

import styles from './CompositionActions.module.css'

type CompositionActionsProps = {
  id: number
  title: string
}

// The card's "⋯" menu. Only deletion is available for now.
export function CompositionActions({ id, title }: CompositionActionsProps) {
  const t = useT()
  const confirm = useConfirm()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  async function handleDelete() {
    const confirmed = await confirm({
      title: t('compositions.delete.title', { title }),
      description: t('compositions.delete.description'),
      confirmLabel: t('compositions.delete.confirm'),
      tone: 'danger',
    })
    if (!confirmed) return

    // Transition: the list revalidated by the action shows along with the navigation
    startTransition(async () => {
      // The action throws when the session has expired; any failure ends in the same toast
      if (await succeeded(deleteComposition(id)))
        toast.success(t('compositions.delete.done', { title }))
      else toast.error(t('compositions.delete.error'))
    })
  }

  const items: MenuItem[] = [
    {
      label: t('compositions.actions.duplicate'),
      disabled: true,
      hint: t('common.soon'),
    },
    { label: t('compositions.actions.move'), disabled: true, hint: t('common.soon') },
    {
      label: t('compositions.actions.delete'),
      tone: 'danger',
      disabled: pending,
      onSelect: () => void handleDelete(),
    },
  ]

  return (
    <Menu
      label={t('compositions.actions.open', { title })}
      items={items}
      triggerClassName={styles.trigger}
    >
      <span aria-hidden="true">⋯</span>
    </Menu>
  )
}
