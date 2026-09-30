'use client'

import React, { useActionState, useEffect, useId, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { t } from '../_lib/i18n'
import { Dialog } from '../_components/ui/Dialog/Dialog'
import { Menu, type MenuItem } from '../_components/ui/Menu/Menu'
import { deleteComposition, type DeleteCompositionState } from './actions'
import styles from './CompositionActions.module.css'

const INITIAL_STATE: DeleteCompositionState = { status: 'idle' }

type CompositionActionsProps = {
  id: number
  title: string
}

/*
 * Menu « ⋯ » de la carte. Seule la suppression est disponible pour l'instant : elle ouvre une
 * confirmation dont le bouton est un vrai formulaire (server action via useActionState).
 */
export function CompositionActions({ id, title }: CompositionActionsProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(deleteComposition.bind(null, id), INITIAL_STATE)
  const titleId = useId()

  const items: MenuItem[] = [
    {
      label: t('compositions.actions.duplicate'),
      disabled: true,
      hint: t('compositions.actions.soon'),
    },
    { label: t('compositions.actions.move'), disabled: true, hint: t('compositions.actions.soon') },
    { label: t('compositions.actions.delete'), tone: 'danger', onSelect: () => setOpen(true) },
  ]

  useEffect(() => {
    if (state.status === 'deleted') setOpen(false)
  }, [state])

  return (
    <>
      <Menu
        label={t('compositions.actions.open', { title })}
        items={items}
        triggerClassName={styles.trigger}
      >
        <span aria-hidden="true">⋯</span>
      </Menu>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <h2 id={titleId} className={styles.title}>
          {t('compositions.delete.title', { title })}
        </h2>
        <p className={styles.description}>{t('compositions.delete.description')}</p>
        {state.status === 'error' && (
          <p className={styles.error} role="alert">
            {t('compositions.delete.error')}
          </p>
        )}
        <form action={formAction} className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={() => setOpen(false)}>
            {t('compositions.delete.cancel')}
          </button>
          <ConfirmButton />
        </form>
      </Dialog>
    </>
  )
}

// Enfant du formulaire, pour lire son état d'envoi
function ConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={styles.confirm} disabled={pending}>
      {pending ? t('compositions.delete.pending') : t('compositions.delete.confirm')}
    </button>
  )
}
