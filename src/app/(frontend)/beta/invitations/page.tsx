import { notFound } from 'next/navigation'
import { isAdmin } from '@/lib/users'
import { Heading } from '@front/_components/ui/Heading/Heading'
import { requireUser } from '@front/_lib/server/auth'
import { getT } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'
import { InvitationForm } from './InvitationForm'
import styles from './page.module.css'

export const metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
}

export default async function InvitationsPage() {
  const { user } = await requireUser(ROUTES.betaInvitations)
  if (!isAdmin(user)) notFound()
  const t = await getT()
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Heading level={1} variant="page">
          {t('betaInvitations.heading')}
        </Heading>
        <p>{t('betaInvitations.description')}</p>
        <InvitationForm />
      </div>
    </div>
  )
}
