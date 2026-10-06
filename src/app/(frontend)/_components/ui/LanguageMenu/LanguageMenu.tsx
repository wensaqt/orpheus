'use client'

import { usePathname } from 'next/navigation'
import { useTransition } from 'react'

import { useLocale, useT } from '@front/_components/i18n/I18nProvider'
import { useConfirm } from '@front/_components/ui/Feedback/ConfirmProvider'
import { Menu } from '@front/_components/ui/Menu/Menu'
import type { MenuItem } from '@front/_components/ui/Menu/types'
import { setLocale } from '@front/_features/i18n/actions'
import { type Locale, LOCALE_FLAGS, LOCALE_NAMES, LOCALES } from '@front/_lib/i18n'
import { editorPath } from '@front/_lib/routes'

import styles from './LanguageMenu.module.css'

// The current language's flag; the menu lists every language, named in itself
export function LanguageMenu() {
  const t = useT()
  const locale = useLocale()
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  // A document open in the editor: switching the language reloads the editor
  const editing = Boolean(editorPath(usePathname())?.documentId)

  async function choose(option: Locale) {
    if (option === locale) return
    if (
      editing &&
      !(await confirm({
        title: t('language.confirm.title'),
        description: t('language.confirm.description'),
        confirmLabel: t('language.confirm.action'),
      }))
    ) {
      return
    }
    startTransition(() => setLocale(option))
  }

  const items: MenuItem[] = LOCALES.map((option) => ({
    label: LOCALE_NAMES[option],
    icon: LOCALE_FLAGS[option],
    lang: option,
    kind: 'radio',
    checked: option === locale,
    disabled: pending,
    onSelect: () => void choose(option),
  }))

  return (
    <Menu label={t('language.menu')} items={items} triggerClassName={styles.trigger}>
      <span aria-hidden="true">{LOCALE_FLAGS[locale]}</span>
    </Menu>
  )
}
