'use client'

import { type FormEvent, useId, useState } from 'react'

import { type BinderMove, descendantIds } from '@/lib/binder/tree'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { Dialog, DialogActions, DialogTitle } from '@front/_components/ui/Dialog/Dialog'
import type { BinderEntry } from '@front/_features/binder/types'

import { FolderIcon } from '../icons'
import styles from './MoveDialog.module.css'
import { intoFolder, moveDestinations } from './rows'
import { useBinder } from './state/BinderProvider'

type MoveDialogProps = {
  // The item to move; the dialog is open while there is one
  item: BinderEntry | null
  onClose: () => void
  onMove: (destination: BinderMove) => void
}

// "Move to…": moving an item without a mouse, by choosing a folder or the top of the binder
export function MoveDialog({ item, onClose, onMove }: MoveDialogProps) {
  const titleId = useId()
  return (
    <Dialog open={item !== null} onClose={onClose} labelledBy={titleId}>
      {/* Keyed by item: each opening starts from the item's current folder */}
      {item && (
        <MoveForm key={item.id} item={item} titleId={titleId} onClose={onClose} onMove={onMove} />
      )}
    </Dialog>
  )
}

type MoveFormProps = Omit<MoveDialogProps, 'item'> & { item: BinderEntry; titleId: string }

function MoveForm({ item, titleId, onClose, onMove }: MoveFormProps) {
  const t = useT()
  const { entries } = useBinder()
  const [choice, setChoice] = useState(item.parent)
  const destinations = moveDestinations(
    entries,
    new Set([item.id, ...descendantIds(entries, item.id)]),
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onMove(intoFolder(choice))
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle id={titleId}>{t('binder.move.title', { title: item.title })}</DialogTitle>
      <fieldset className={styles.destinations} aria-labelledby={titleId}>
        <Destination
          label={t('binder.move.root')}
          level={0}
          checked={choice === null}
          onChoose={() => setChoice(null)}
        />
        {destinations.map((row) => (
          <Destination
            key={row.entry.id}
            label={row.entry.title}
            level={row.level}
            checked={choice === row.entry.id}
            onChoose={() => setChoice(row.entry.id)}
          />
        ))}
      </fieldset>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('binder.move.confirm')}</Button>
      </DialogActions>
    </form>
  )
}

type DestinationProps = { label: string; level: number; checked: boolean; onChoose: () => void }

function Destination({ label, level, checked, onChoose }: DestinationProps) {
  return (
    <label className={styles.destination} style={{ '--level': level }}>
      <input type="radio" name="destination" checked={checked} onChange={onChoose} />
      <FolderIcon open={checked} />
      <span className={styles.label}>{label}</span>
    </label>
  )
}
