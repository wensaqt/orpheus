'use client'

import { useRef } from 'react'

import { ALIGNMENTS, BLOCK_TYPES, TEXT_FORMATS } from '@front/_components/editor/formatting'
import { useT } from '@front/_components/i18n/I18nProvider'
import {
  Menu,
  MENU_SEPARATOR,
  type MenuEntry,
  type MenuHandle,
  type MenuItem,
} from '@front/_components/ui/Menu/Menu'
import type { PopoverHandle } from '@front/_components/ui/Popover/Popover'
import { ROVING_PROPS, useRovingFocus } from '@front/_components/ui/rovingFocus'
import type { MessageKey } from '@front/_lib/i18n'

import { useFocusReturn, useOpenEditor } from '../editorFocus'
import styles from './MenuBar.module.css'
import { PageSetup } from './PageSetup'
import { useToolbarActions } from './toolbarActions'
import {
  ALIGNMENT_LABELS,
  BLOCK_TYPE_LABELS,
  SHORTCUTS,
  TEXT_FORMAT_LABELS,
  TEXT_FORMAT_SHORTCUTS,
} from './toolbarLabels'
import type { ToolbarState } from './useToolbarState'

type MenuDefinition = { label: MessageKey; items: MenuEntry[] }

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
  const editor = useOpenEditor()
  const actions = useToolbarActions()
  const focus = useFocusReturn()
  const roving = useRovingFocus<HTMLDivElement>(() => editor?.focus())
  const menus = useRef<(MenuHandle | null)[]>([])
  const pageSetup = useRef<PopoverHandle>(null)

  const { text } = state
  const soon = (label: MessageKey): MenuItem => ({
    label: t(label),
    disabled: true,
    hint: t('common.soon'),
  })

  const definitions: MenuDefinition[] = [
    {
      label: 'editor.menus.file',
      items: [
        { label: t('editor.actions.pageSetup'), onSelect: () => pageSetup.current?.open() },
        {
          label: t('editor.actions.print'),
          shortcut: SHORTCUTS.print,
          onSelect: actions.print,
        },
        MENU_SEPARATOR,
        soon('editor.actions.exportPdf'),
        soon('editor.actions.download'),
        MENU_SEPARATOR,
        soon('editor.actions.versionHistory'),
      ],
    },
    {
      label: 'editor.menus.edit',
      items: [
        {
          label: t('editor.actions.undo'),
          shortcut: SHORTCUTS.undo,
          disabled: !state.canUndo,
          onSelect: actions.undo,
        },
        {
          label: t('editor.actions.redo'),
          shortcut: SHORTCUTS.redo,
          disabled: !state.canRedo,
          onSelect: actions.redo,
        },
        MENU_SEPARATOR,
        {
          label: t('editor.actions.selectAll'),
          shortcut: SHORTCUTS.selectAll,
          disabled: !editor,
          onSelect: actions.selectAll,
        },
      ],
    },
    {
      label: 'editor.menus.view',
      items: [soon('editor.actions.showRuler'), soon('editor.actions.bookView')],
    },
    {
      label: 'editor.menus.insert',
      items: [
        {
          label: t('editor.actions.pageBreak'),
          shortcut: SHORTCUTS.pageBreak,
          disabled: !text,
          onSelect: actions.pageBreak,
        },
        MENU_SEPARATOR,
        soon('editor.actions.image'),
        soon('editor.actions.link'),
        soon('editor.actions.table'),
        soon('editor.actions.footnote'),
      ],
    },
    {
      label: 'editor.menus.format',
      items: [
        ...TEXT_FORMATS.map((format): MenuItem => ({
          label: t(TEXT_FORMAT_LABELS[format]),
          shortcut: TEXT_FORMAT_SHORTCUTS[format],
          kind: 'checkbox',
          checked: text && state.formats[format],
          disabled: !text,
          onSelect: () => actions.formatText(format),
        })),
        MENU_SEPARATOR,
        {
          group: t('editor.blockTypes.label'),
          items: BLOCK_TYPES.map((type) => ({
            label: t(BLOCK_TYPE_LABELS[type]),
            kind: 'radio',
            checked: text && state.blockType === type,
            disabled: !text,
            onSelect: () => actions.blockType(type),
          })),
        },
        MENU_SEPARATOR,
        {
          group: t('editor.alignment'),
          items: ALIGNMENTS.map((align) => ({
            label: t(ALIGNMENT_LABELS[align]),
            kind: 'radio',
            checked: text && state.align === align,
            disabled: !text,
            onSelect: () => actions.align(align),
          })),
        },
        MENU_SEPARATOR,
        soon('editor.actions.lineSpacing'),
      ],
    },
    {
      label: 'editor.menus.tools',
      items: [soon('editor.actions.synonyms'), soon('editor.actions.wordCount')],
    },
  ]

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
        ref={roving.ref}
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
      <PageSetup ref={pageSetup} anchor={roving.ref} onClose={focus.restore} />
    </>
  )
}
