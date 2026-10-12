import { AccountMenu } from '../AccountMenu/AccountMenu'
import { LanguageMenu } from '../LanguageMenu/LanguageMenu'
import styles from './CornerActions.module.css'

// Top-right corner, facing the logo: language, then account
export function CornerActions({
  email,
  administrator = false,
}: {
  email: string | null
  administrator?: boolean
}) {
  return (
    <div className={styles.corner}>
      <LanguageMenu />
      <AccountMenu email={email} administrator={administrator} />
    </div>
  )
}
