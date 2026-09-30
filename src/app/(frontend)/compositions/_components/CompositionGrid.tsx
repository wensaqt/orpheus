import type { CompositionCardData } from '@front/_features/compositions/types'

import { CompositionCard } from './CompositionCard'
import styles from './CompositionGrid.module.css'
import { EmptyState } from './EmptyState'
import { NewCompositionCard } from './NewCompositionCard'

export function CompositionGrid({ compositions }: { compositions: CompositionCardData[] }) {
  if (!compositions.length) return <EmptyState />

  return (
    <ul className={styles.grid}>
      <NewCompositionCard />
      {compositions.map((composition) => (
        <CompositionCard key={composition.id} composition={composition} />
      ))}
    </ul>
  )
}
