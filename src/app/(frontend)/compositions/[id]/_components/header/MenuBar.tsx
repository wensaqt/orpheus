'use client'

import type { LexicalEditor } from 'lexical'
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
import { ROVING_ATTRIBUTE, useRovingFocus } from '@front/_components/ui/rovingFocus'
import type { MessageKey } from '@front/_lib/i18n'

import { useFocusReturn, useOpenEditor } from '../editorFocus'
import styles from './MenuBar.module.css'
import { PageSetup } from './PageSetup'
import {
  ALIGNMENT_LABELS,
  BLOCK_TYPE_LABELS,
  SHORTCUTS,
  TEXT_FORMAT_LABELS,
  toolbarActions,
} from './toolbarActions'
import type { ToolbarState } from './useToolbarState'

type MenuDefinition = { label: MessageKey; items: MenuEntry[] }

/*
 * The editor's menu bar, under the titles, as in a word processor: the page setup and
 * printing, the history, and the same styles as the toolbar. What is not there yet shows,
 * greyed out. A WAI-ARIA menu bar (https://www.w3.org/WAI/ARIA/apg/patterns/menubar/): one
 * tab stop, Left/Right between the menus (open or not), Down or Enter to open one, Escape
 * back to its name. A menu closed in place takes the writer back to the text, if they came
 * from there.
 */
export function MenuBar({ state }: { state: ToolbarState }) {
  const t = useT()
  const editor = useOpenEditor()
  const focus = useFocusReturn()
  const roving = useRovingFocus<HTMLDivElement>()
  const menus = useRef<(MenuHandle | null)[]>([])
  const pageSetup = useRef<PopoverHandle>(null)

  const text = Boolean(editor) && state.text
  // An item that acts on the open document
  const onEditor = (action: (editor: LexicalEditor) => void) => () => editor && action(editor)
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
          onSelect: toolbarActions.print,
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
          disabled: !editor || !state.canUndo,
          onSelect: onEditor(toolbarActions.undo),
        },
        {
          label: t('editor.actions.redo'),
          shortcut: SHORTCUTS.redo,
          disabled: !editor || !state.canRedo,
          onSelect: onEditor(toolbarActions.redo),
        },
        MENU_SEPARATOR,
        {
          label: t('editor.actions.selectAll'),
          shortcut: SHORTCUTS.selectAll,
          disabled: !editor,
          onSelect: onEditor(toolbarActions.selectAll),
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
          onSelect: onEditor(toolbarActions.pageBreak),
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
        ...TEXT_FORMATS.map((format) => ({
          label: t(TEXT_FORMAT_LABELS[format]),
          shortcut: format === 'strikethrough' ? undefined : SHORTCUTS[format],
          checked: text && state.formats[format],
          toggle: true,
          disabled: !text,
          onSelect: onEditor((editor) => toolbarActions.formatText(editor, format)),
        })),
        MENU_SEPARATOR,
        ...BLOCK_TYPES.map((type) => ({
          label: t(BLOCK_TYPE_LABELS[type]),
          checked: text && state.blockType === type,
          disabled: !text,
          onSelect: onEditor((editor) => toolbarActions.blockType(editor, type)),
        })),
        MENU_SEPARATOR,
        ...ALIGNMENTS.map((align) => ({
          label: t(ALIGNMENT_LABELS[align]),
          checked: text && state.align === align,
          disabled: !text,
          onSelect: onEditor((editor) => toolbarActions.align(editor, align)),
        })),
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

  // Closed in place (Escape, its name pressed again), not by an action that took the focus
  const onMenuClose = () => {
    const active = document.activeElement
    if (active === document.body || roving.ref.current?.contains(active)) focus.restore()
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
            triggerProps={{
              [ROVING_ATTRIBUTE]: '',
              role: 'menuitem',
              onPointerDown: focus.remember,
              onKeyDown: (event) => {
                if (event.key !== 'ArrowDown') return
                event.preventDefault()
                openMenu(index)
              },
            }}
            onSideKey={(step) => openMenu(index + step)}
            onClose={onMenuClose}
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
