'use client'

import {
  ALIGNMENTS,
  BLOCK_TYPES,
  type BlockType,
  type ChosenBlockType,
  TEXT_FORMATS,
} from '@front/_components/editor/formatting'
import { useT } from '@front/_components/i18n/I18nProvider'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import { Menu } from '@front/_components/ui/Menu/Menu'
import { ROVING_PROPS, useRovingFocus } from '@front/_components/ui/rovingFocus'
import {
  ariaShortcut,
  type Shortcut,
  shortcutLabel,
  useIsApple,
} from '@front/_components/ui/shortcuts'
import type { MessageKey } from '@front/_lib/i18n'

import { useFocusReturn, useOpenEditor } from '../editorFocus'
import styles from './StyleToolbar.module.css'
import { type ListType, pressedWithKeyboard, useToolbarActions } from './toolbarActions'
import { ToolbarIcon, type ToolbarIconName } from './toolbarIcons'
import {
  ALIGNMENT_LABELS,
  BLOCK_TYPE_LABELS,
  SHORTCUTS,
  TEXT_FORMAT_LABELS,
  TEXT_FORMAT_SHORTCUTS,
} from './toolbarLabels'
import type { ToolbarState } from './useToolbarState'

const LISTS = [
  { type: 'bullet', label: 'editor.actions.bulletList' },
  { type: 'number', label: 'editor.actions.numberedList' },
] as const satisfies { type: ListType; label: MessageKey }[]

type ToolButtonProps = {
  label: string
  icon: ToolbarIconName
  shortcut?: Shortcut
  // Shown after the label in the tooltip when there is no shortcut, e.g. "Coming soon", and
  // read as the control's description
  hint?: string
  disabled: boolean
  // For a toggle: whether it is on
  pressed?: boolean
  // Pressed; from the keyboard, with the control, which keeps the focus
  onPress?: (control?: HTMLElement) => void
  className?: string
}

/*
 * A control of the style toolbar. Pressing it never takes the writer out of the text: the
 * text keeps the focus under the pointer, and the keyboard leaves it on the control.
 */
function ToolButton({
  label,
  icon,
  shortcut,
  hint,
  disabled,
  pressed,
  onPress,
  className,
}: ToolButtonProps) {
  const t = useT()
  const apple = useIsApple()
  const detail = shortcut ? shortcutLabel(shortcut, apple) : hint
  return (
    <IconButton
      {...ROVING_PROPS}
      className={className}
      label={label}
      tooltip={detail ? t('editor.labelWithHint', { label, hint: detail }) : label}
      icon={<ToolbarIcon name={icon} />}
      aria-pressed={pressed}
      aria-description={hint}
      aria-disabled={disabled || undefined}
      aria-keyshortcuts={shortcut && ariaShortcut(shortcut, apple)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) =>
        !disabled && onPress?.(pressedWithKeyboard(event) ? event.currentTarget : undefined)
      }
    />
  )
}

// A control that does nothing yet: in its place, greyed out, saying so; left out when narrow
function SoonButton({ label, icon }: { label: MessageKey; icon: ToolbarIconName }) {
  const t = useT()
  return (
    <ToolButton
      label={t(label)}
      icon={icon}
      hint={t('common.soon')}
      disabled
      className={styles.soon}
    />
  )
}

// Between groups of controls; `soon` before a group of placeholders only, left out with them
const Divider = ({ soon }: { soon?: boolean }) => (
  <span className={soon ? `${styles.divider} ${styles.soon}` : styles.divider} aria-hidden="true" />
)

/*
 * The paragraph style of the selected blocks, and the menu that changes it. Once closed, the
 * writer is back in the text if they came from there
 */
function BlockTypeMenu({ blockType }: { blockType: BlockType | null }) {
  const t = useT()
  const actions = useToolbarActions()
  const focus = useFocusReturn()
  const current = t(BLOCK_TYPE_LABELS[blockType ?? 'paragraph'])
  return (
    <Menu
      label={t('editor.labelWithHint', { label: t('editor.blockTypes.label'), hint: current })}
      align="start"
      // Null: nothing to give a style to (a selected page break, no document open)
      disabled={blockType === null}
      triggerClassName={styles.blockType}
      // A key on it: the writer is in the toolbar, not in the text
      triggerProps={{ ...ROVING_PROPS, onKeyDown: focus.remember }}
      onTriggerPointerDown={focus.remember}
      onCloseInPlace={focus.restore}
      items={BLOCK_TYPES.map((type: ChosenBlockType) => ({
        label: t(BLOCK_TYPE_LABELS[type]),
        kind: 'radio',
        checked: blockType === type,
        onSelect: () => actions.blockType(type),
      }))}
    >
      <span className={styles.blockTypeLabel}>{current}</span>
      <ToolbarIcon name="chevron" />
    </Menu>
  )
}

/*
 * The style toolbar, under the menu bar: what applies to the selected text, its state shown
 * as the selection moves. One tab stop; the arrows move between its controls, Escape goes back
 * to the text. The styles are off without a text selection (no document open, or a page break
 * selected); the history stays at hand.
 */
export function StyleToolbar({ state }: { state: ToolbarState }) {
  const t = useT()
  const editor = useOpenEditor()
  const actions = useToolbarActions()
  const roving = useRovingFocus<HTMLDivElement>(() => editor?.focus())
  const off = !state.text

  return (
    <div
      ref={roving.ref}
      role="toolbar"
      aria-label={t('editor.toolbar')}
      aria-disabled={!editor || undefined}
      className={styles.toolbar}
      onFocus={roving.onFocus}
      onKeyDown={roving.onKeyDown}
    >
      <ToolButton
        label={t('editor.actions.undo')}
        icon="undo"
        shortcut={SHORTCUTS.undo}
        disabled={!state.canUndo}
        onPress={actions.undo}
      />
      <ToolButton
        label={t('editor.actions.redo')}
        icon="redo"
        shortcut={SHORTCUTS.redo}
        disabled={!state.canRedo}
        onPress={actions.redo}
      />
      <SoonButton label="editor.actions.zoom" icon="zoom" />
      <Divider />
      <BlockTypeMenu blockType={off ? null : state.blockType} />
      <Divider soon />
      <SoonButton label="editor.actions.font" icon="font" />
      <SoonButton label="editor.actions.fontSize" icon="fontSize" />
      <Divider />
      {TEXT_FORMATS.map((format) => (
        <ToolButton
          key={format}
          label={t(TEXT_FORMAT_LABELS[format])}
          icon={format}
          shortcut={TEXT_FORMAT_SHORTCUTS[format]}
          disabled={off}
          pressed={!off && state.formats[format]}
          onPress={(control) => actions.formatText(format, control)}
        />
      ))}
      <SoonButton label="editor.actions.textColor" icon="textColor" />
      <SoonButton label="editor.actions.highlight" icon="highlight" />
      <Divider soon />
      <SoonButton label="editor.actions.link" icon="link" />
      <SoonButton label="editor.actions.comment" icon="comment" />
      <Divider />
      {ALIGNMENTS.map((align) => (
        <ToolButton
          key={align}
          label={t(ALIGNMENT_LABELS[align])}
          icon={align}
          disabled={off}
          pressed={!off && state.align === align}
          onPress={(control) => actions.align(align, control)}
        />
      ))}
      <SoonButton label="editor.actions.lineSpacing" icon="lineSpacing" />
      <Divider />
      {LISTS.map(({ type, label }) => (
        <ToolButton
          key={type}
          label={t(label)}
          icon={type}
          disabled={off}
          pressed={!off && state.blockType === type}
          onPress={(control) => actions.list(type, control)}
        />
      ))}
      <SoonButton label="editor.actions.indent" icon="indent" />
      <SoonButton label="editor.actions.clearFormatting" icon="clearFormatting" />
    </div>
  )
}
