import type { CSSProperties } from 'react'

import { type PageSettings, pageSize } from '@/lib/pageFormats'

import styles from './BlankPage.module.css'

// One blank page of the format, as the editor will show it: what stands in while a document loads
export function BlankPage({ settings }: { settings: PageSettings }) {
  const { width, height } = pageSize(settings)
  const style = { '--page-w': `${width}mm`, '--page-h': `${height}mm` } as CSSProperties
  return <div className={styles.page} style={style} />
}
