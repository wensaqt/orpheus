import Link from 'next/link'

import styles from './AuthSwitch.module.css'

type AuthSwitchProps = { question: string; action: string; href: string }

// Below the sheet, on the desk: the way to the other form
export function AuthSwitch({ question, action, href }: AuthSwitchProps) {
  return (
    <p className={styles.switch}>
      {question}{' '}
      <Link href={href} className={styles.link}>
        {action}
      </Link>
    </p>
  )
}
