'use client'

import { useCallback, useRef } from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Menu } from '@front/_components/ui/Menu/Menu'
import type { MenuHandle } from '@front/_components/ui/Menu/types'
import type { PopoverHandle } from '@front/_components/ui/Popover/Popover'
import { ROVING_PROPS, useRovingFocus } from '@front/_components/ui/rovingFocus'

import { useEditorView } from '../editorView'
import { useFocusReturn, useOpenEditor } from '../editorFocus'
import styles from './MenuBar.module.css'
import { PageSetup } from './PageSetup'
import { useToolbarActions } from './toolbarActions'
import { menuBarMenus } from './menuBarMenus'
import type { ToolbarState } from './useToolbarState'

/*
 * The editor's menu bar, under the titles, as in a word processor: the page setup and
 * printing, the history, and the same styles as the toolbar. What is not there yet shows,
 * greyed out. A WAI-ARIA menu bar (https://www.w3.org/WAI/ARIA/apg/patterns/menubar/): one
 * tab stop, Left/Right between the menus (open or not), Down, Up or Enter to open one, Escape
 * back to its name, and on a name back to the text. A menu closed in place takes the writer
 * back to the text, if they came from there.
 */
export function MenuBar({ state }: { state: ToolbarState }) {
  const t = useT()
  const view = useEditorView()
  const editor = useOpenEditor()
  const actions = useToolbarActions()
  const focus = useFocusReturn()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const roving = useRovingFocus(toolbarRef, () => editor?.focus())
  const menus = useRef<(MenuHandle | null)[]>([])
  const pageSetup = useRef<PopoverHandle>(null)

  const onPageSetup = useCallback(() => pageSetup.current?.open(), [])
  // The builder stores this callback for a menu click; it never calls it during render.
  // eslint-disable-next-line react-hooks/refs
  const definitions = menuBarMenus({
    t,
    state,
    actions,
    hasEditor: editor !== null,
    onPageSetup,
    view,
  })

  // The menu at this index, opened with the focus on its first item
  const openMenu = (index: number) => {
    const count = definitions.length
    const at = (index + count) % count
    roving.controlAt(at)?.focus()
    menus.current[at]?.open()
  }

  return (
    <>
      <div
        ref={toolbarRef}
        role="menubar"
        aria-label={t('editor.menuBar')}
        className={styles.menuBar}
        onFocus={roving.onFocus}
        onKeyDown={roving.onKeyDown}
      >
        {definitions.map(({ label, items }, index) => (
          <Menu
            key={label}
            ref={(handle) => {
              menus.current[index] = handle
            }}
            label={t(label)}
            items={items}
            align="start"
            fixedTrigger
            triggerClassName={styles.trigger}
            // A key on a name: the writer is in the bar, not in the text
            triggerProps={{ ...ROVING_PROPS, role: 'menuitem', onKeyDown: focus.remember }}
            onTriggerPointerDown={focus.remember}
            // Left or Right to the next menu: still from where the first one was opened
            onSideKey={(step) => openMenu(index + step)}
            onCloseInPlace={focus.restore}
          >
            {t(label)}
          </Menu>
        ))}
      </div>
      {/* Not a menu: a panel, opened from the File menu, below the bar */}
      <PageSetup ref={pageSetup} anchor={toolbarRef} onClose={focus.restore} />
    </>
  )
}
