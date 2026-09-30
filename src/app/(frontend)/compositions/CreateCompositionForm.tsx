import { t } from '../_lib/i18n'
import { createComposition } from './actions'
import styles from './CreateCompositionForm.module.css'

// Création en POST (server action), présentée comme un simple lien texte
export function CreateCompositionForm() {
  return (
    <form action={createComposition}>
      <button type="submit" className={styles.create}>
        <span aria-hidden="true">+</span> {t('compositions.create')}
      </button>
    </form>
  )
}
