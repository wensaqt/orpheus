'use client'

import { useTransition } from 'react'

import { useLocale, useT } from '@front/_components/i18n/I18nProvider'
import { Menu, type MenuItem } from '@front/_components/ui/Menu/Menu'
import { setLocale } from '@front/_features/i18n/actions'
import { LOCALE_FLAGS, LOCALE_NAMES, LOCALES } from '@front/_lib/i18n'

import styles from './LanguageMenu.module.css'

// The current language's flag; the menu lists every language, named in itself
export function LanguageMenu() {
  const t = useT()
  const locale = useLocale()
  const [pending, startTransition] = useTransition()

  const items: MenuItem[] = LOCALES.map((option) => ({
    label: LOCALE_NAMES[option],
    icon: LOCALE_FLAGS[option],
    lang: option,
    checked: option === locale,
    disabled: pending,
    onSelect: () => option !== locale && startTransition(() => setLocale(option)),
  }))

  return (
    <Menu label={t('language.menu')} items={items} triggerClassName={styles.trigger}>
      <span aria-hidden="true">{LOCALE_FLAGS[locale]}</span>
    </Menu>
  )
}
