import { ALIGNMENTS, BLOCK_TYPES, TEXT_FORMATS } from '@front/_components/editor/constants'
import { MENU_SEPARATOR } from '@front/_components/ui/Menu/constants'
import type { MenuEntry, MenuGroup, MenuItem } from '@front/_components/ui/Menu/types'
import type { MessageKey, Translate } from '@front/_lib/i18n'

import type { ToolbarActions } from './toolbarActions'
import {
  ALIGNMENT_LABELS,
  BLOCK_TYPE_LABELS,
  SHORTCUTS,
  TEXT_FORMAT_LABELS,
  TEXT_FORMAT_SHORTCUTS,
} from './toolbarLabels'
import type { ToolbarState } from './useToolbarState'

/*
 * What the menu bar's menus hold, in their order. Pure: from the toolbar's state and actions,
 * the items as they show now.
 */

export type MenuDefinition = { label: MessageKey; items: MenuEntry[] }

type MenuContext = {
  t: Translate
  state: ToolbarState
  actions: ToolbarActions
  // A document is open: there is a text to act on
  hasEditor: boolean
  onPageSetup: () => void
}

// An action that is not there yet: shown, greyed out
const soon = (t: Translate, label: MessageKey): MenuItem => ({
  label: t(label),
  disabled: true,
  hint: t('common.soon'),
})

const fileMenu = ({ t, actions, onPageSetup }: MenuContext): MenuDefinition => ({
  label: 'editor.menus.file',
  items: [
    { label: t('editor.actions.pageSetup'), onSelect: onPageSetup },
    { label: t('editor.actions.print'), shortcut: SHORTCUTS.print, onSelect: actions.print },
    MENU_SEPARATOR,
    soon(t, 'editor.actions.exportPdf'),
    soon(t, 'editor.actions.download'),
    MENU_SEPARATOR,
    soon(t, 'editor.actions.versionHistory'),
  ],
})

const editMenu = ({ t, state, actions, hasEditor }: MenuContext): MenuDefinition => ({
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
      disabled: !hasEditor,
      onSelect: actions.selectAll,
    },
  ],
})

const viewMenu = ({ t }: MenuContext): MenuDefinition => ({
  label: 'editor.menus.view',
  items: [soon(t, 'editor.actions.showRuler'), soon(t, 'editor.actions.bookView')],
})

const insertMenu = ({ t, state, actions }: MenuContext): MenuDefinition => ({
  label: 'editor.menus.insert',
  items: [
    {
      label: t('editor.actions.pageBreak'),
      shortcut: SHORTCUTS.pageBreak,
      disabled: !state.text,
      onSelect: actions.pageBreak,
    },
    MENU_SEPARATOR,
    soon(t, 'editor.actions.image'),
    soon(t, 'editor.actions.link'),
    soon(t, 'editor.actions.table'),
    soon(t, 'editor.actions.footnote'),
  ],
})

// Bold, italic…: each on or off on its own
const textFormatItems = ({ t, state, actions }: MenuContext): MenuItem[] =>
  TEXT_FORMATS.map((format) => ({
    label: t(TEXT_FORMAT_LABELS[format]),
    shortcut: TEXT_FORMAT_SHORTCUTS[format],
    kind: 'checkbox',
    checked: state.text && state.formats[format],
    disabled: !state.text,
    onSelect: () => actions.formatText(format),
  }))

// The paragraph styles: one of them
const blockTypeGroup = ({ t, state, actions }: MenuContext): MenuGroup => ({
  group: t('editor.blockTypes.label'),
  items: BLOCK_TYPES.map((type) => ({
    label: t(BLOCK_TYPE_LABELS[type]),
    kind: 'radio',
    checked: state.text && state.blockType === type,
    disabled: !state.text,
    onSelect: () => actions.blockType(type),
  })),
})

// The alignments: one of them
const alignmentGroup = ({ t, state, actions }: MenuContext): MenuGroup => ({
  group: t('editor.alignment'),
  items: ALIGNMENTS.map((align) => ({
    label: t(ALIGNMENT_LABELS[align]),
    kind: 'radio',
    checked: state.text && state.align === align,
    disabled: !state.text,
    onSelect: () => actions.align(align),
  })),
})

const formatMenu = (context: MenuContext): MenuDefinition => ({
  label: 'editor.menus.format',
  items: [
    ...textFormatItems(context),
    MENU_SEPARATOR,
    blockTypeGroup(context),
    MENU_SEPARATOR,
    alignmentGroup(context),
    MENU_SEPARATOR,
    soon(context.t, 'editor.actions.lineSpacing'),
  ],
})

const toolsMenu = ({ t }: MenuContext): MenuDefinition => ({
  label: 'editor.menus.tools',
  items: [soon(t, 'editor.actions.synonyms'), soon(t, 'editor.actions.wordCount')],
})

export const menuBarMenus = (context: MenuContext): MenuDefinition[] =>
  [fileMenu, editMenu, viewMenu, insertMenu, formatMenu, toolsMenu].map((menu) => menu(context))
