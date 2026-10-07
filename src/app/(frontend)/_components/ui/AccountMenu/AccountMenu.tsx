'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'

import { Menu } from '@front/_components/ui/Menu/Menu'
import type { MenuItem } from '@front/_components/ui/Menu/types'
import { logOut } from '@front/_features/auth/actions'
import { clearDocuments } from '@front/_features/binder/documentStore'
import { useT } from '@front/_components/i18n/I18nProvider'
import { AUTH_PAGES, ROUTES } from '@front/_lib/routes'

import styles from './AccountMenu.module.css'
import triggerStyles from '../CornerActions/trigger.module.css'

// A head and shoulders, drawn with the stroke of the lyre
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={styles.icon}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.2-3.2 3.9-5 7-5s5.8 1.8 7 5" />
    </svg>
  )
}

type AccountMenuProps = { email: string | null }

/*
 * The account menu when signed in, otherwise a way to sign in that comes back to the current
 * page.
 */
export function AccountMenu({ email }: AccountMenuProps) {
  const t = useT()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  if (!email) {
    if (Object.values(AUTH_PAGES).includes(pathname)) return null
    const label = t('account.logIn')
    return (
      <Link
        href={ROUTES.login(pathname)}
        className={triggerStyles.trigger}
        aria-label={label}
        title={label}
      >
        <ProfileIcon />
      </Link>
    )
  }

  const items: MenuItem[] = [
    { label: t('account.profile'), disabled: true, hint: t('common.soon') },
    {
      label: t('account.logOut'),
      disabled: pending,
      onSelect: () =>
        startTransition(() => {
          // Nothing of this account's writing stays in the tab's memory
          clearDocuments()
          return logOut()
        }),
    },
  ]

  return (
    <Menu
      label={t('account.menu')}
      header={
        <>
          {t('account.signedInAs')} <strong className={styles.email}>{email}</strong>
        </>
      }
      items={items}
      triggerClassName={triggerStyles.trigger}
    >
      <ProfileIcon />
    </Menu>
  )
}
