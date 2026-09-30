'use client'

import React, { useTransition } from 'react'

import { useConfirm } from '@front/_components/ui/Feedback/ConfirmProvider'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { Menu, type MenuItem } from '@front/_components/ui/Menu/Menu'
import { deleteComposition } from '@front/_features/compositions/actions'
import { t } from '@front/_lib/i18n'

import styles from './CompositionActions.module.css'

type CompositionActionsProps = {
  id: number
  title: string
}

// Menu « ⋯ » de la carte. Seule la suppression est disponible pour l'instant.
export function CompositionActions({ id, title }: CompositionActionsProps) {
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

    // Transition : la liste revalidée par l'action s'affiche avec la navigation
    startTransition(async () => {
      const { status } = await deleteComposition(id)
      if (status === 'deleted') toast.success(t('compositions.delete.done', { title }))
      else toast.error(t('compositions.delete.error'))
    })
  }

  const items: MenuItem[] = [
    {
      label: t('compositions.actions.duplicate'),
      disabled: true,
      hint: t('compositions.actions.soon'),
    },
    { label: t('compositions.actions.move'), disabled: true, hint: t('compositions.actions.soon') },
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
