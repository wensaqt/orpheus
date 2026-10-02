'use client'

import { MAX_COMPOSITION_TITLE_LENGTH } from '@/lib/compositions'

import { useT } from '@front/_components/i18n/I18nProvider'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'
import { saveComposition } from '@front/_features/compositions/actions'
import { useTitleField } from '@front/_hooks/useTitleField'

import styles from './BinderPanel.module.css'
import { ChevronIcon, NewDocumentIcon, NewFolderIcon } from './icons'
import { useBinder, useRegisterSaver } from './state/BinderProvider'
import { SAVERS } from './state/useSaveRegistry'
import { BinderTree } from './tree/BinderTree'

type BinderPanelProps = {
  title: string
  onHide: () => void
}

// Left column of the editor: the composition's title, a small toolbar, then its binder
export function BinderPanel({ title, onHide }: BinderPanelProps) {
  const t = useT()
  const { compositionId, commands } = useBinder()
  const field = useTitleField({
    title,
    maxLength: MAX_COMPOSITION_TITLE_LENGTH,
    save: (next) => saveComposition(compositionId, { title: next }),
  })
  useRegisterSaver(SAVERS.compositionTitle, field)

  return (
    <nav className={styles.panel} aria-label={t('binder.label')}>
      <TitleInput size="lg" ruled aria-label={t('editor.titleLabel')} {...field.inputProps} />
      {field.status === 'error' && (
        <p className={styles.error} role="alert">
          {t('editor.saveError')}
        </p>
      )}
      <div className={styles.toolbar} role="toolbar" aria-label={t('binder.toolbar')}>
        <IconButton
          label={t('binder.newDocument')}
          icon={<NewDocumentIcon />}
          onClick={() => void commands.create('document', null)}
        />
        <IconButton
          label={t('binder.newFolder')}
          icon={<NewFolderIcon />}
          onClick={() => void commands.create('folder', null)}
        />
        <IconButton
          label={t('binder.hide')}
          icon={<ChevronIcon />}
          className={styles.hide}
          onClick={onHide}
        />
      </div>
      {/* The tree's own name: the column around it is the binder's navigation */}
      <BinderTree label={t('binder.treeLabel')} />
    </nav>
  )
}
