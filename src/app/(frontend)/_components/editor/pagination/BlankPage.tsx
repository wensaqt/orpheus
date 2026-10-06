import { type PageSettings, pageSize } from '@/lib/pageFormats'

import { classNames } from '@front/_lib/classNames'

import styles from './BlankPage.module.css'
import paper from './paper.module.css'

// One blank page of the format, as the editor will show it: what stands in while a document loads
export function BlankPage({ settings }: { settings: PageSettings }) {
  const { width, height } = pageSize(settings)
  return (
    <div
      className={classNames(paper.paper, styles.page)}
      style={{ '--page-w': `${width}mm`, '--page-h': `${height}mm` }}
    />
  )
}
