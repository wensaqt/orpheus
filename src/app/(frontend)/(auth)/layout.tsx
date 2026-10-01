import type { ReactNode } from 'react'

import styles from './layout.module.css'

// Sign-in and sign-up: the pearl desk of the editor, with the form as a sheet laid on it
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={styles.desk}>{children}</div>
}
