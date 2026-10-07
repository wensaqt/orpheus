'use client'

import { DOCUMENT_FONTS, FontId, type SelectedFont } from '@front/_components/editor/fonts'
import { useT } from '@front/_components/i18n/I18nProvider'
import { Menu } from '@front/_components/ui/Menu/Menu'
import type { MenuItem } from '@front/_components/ui/Menu/types'
import { ROVING_PROPS } from '@front/_components/ui/rovingFocus'
import type { Translate } from '@front/_lib/i18n'

import { useFocusReturn } from '../editorFocus'
import styles from './StyleToolbar.module.css'
import { useToolbarActions } from './toolbarActions'
import { ToolbarIcon } from './toolbarIcons'

function fontLabel(font: SelectedFont | null, t: Translate): string {
  switch (font) {
    case null:
    case 'default':
      return t('editor.fonts.default')
    case 'mixed':
      return t('editor.fonts.mixed')
    case 'unknown':
      return t('editor.fonts.unknown')
    default:
      return DOCUMENT_FONTS[font].label
  }
}

export function FontMenu({ font }: { font: SelectedFont | null }) {
  const t = useT()
  const actions = useToolbarActions()
  const focus = useFocusReturn()
  const current = fontLabel(font, t)

  return (
    <Menu
      label={t('editor.labelWithHint', { label: t('editor.actions.font'), hint: current })}
      align="start"
      fixedTrigger
      disabled={font === null}
      triggerClassName={styles.font}
      triggerProps={{ ...ROVING_PROPS, onKeyDown: focus.remember }}
      onTriggerPointerDown={focus.remember}
      onCloseInPlace={focus.restore}
      items={[
        {
          label: t('editor.fonts.default'),
          kind: 'radio',
          checked: font === 'default',
          onSelect: () => actions.font('default'),
        },
        ...Object.values(FontId).map<MenuItem>((id) => ({
          label: DOCUMENT_FONTS[id].label,
          kind: 'radio',
          checked: font === id,
          onSelect: () => actions.font(id),
        })),
      ]}
    >
      <span className={styles.fontIcon} aria-hidden="true">
        <ToolbarIcon name="font" />
      </span>
      <span className={styles.blockTypeLabel}>{current}</span>
      <span className={styles.fontChevron} aria-hidden="true">
        <ToolbarIcon name="chevron" />
      </span>
    </Menu>
  )
}
