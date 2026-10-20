'use client'

import { useRef } from 'react'

import { Menu } from '@front/_components/ui/Menu/Menu'
import { MENU_SEPARATOR } from '@front/_components/ui/Menu/constants'
import type { MenuHandle } from '@front/_components/ui/Menu/types'
import { useT } from '@front/_components/i18n/I18nProvider'
import { ROVING_PROPS, useRovingFocus } from '@front/_components/ui/rovingFocus'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'

import styles from '../header/MenuBar.module.css'
import toolbarStyles from '../header/StyleToolbar.module.css'
import { ToolbarIcon } from '../header/toolbarIcons'
import { useScoreCommands } from './ScoreCommands'

export function ScoreHistoryToolbar() {
  const t = useT()
  const commands = useScoreCommands()
  const toolbar = useRef<HTMLDivElement>(null)
  const roving = useRovingFocus(toolbar)
  return (
    <div
      ref={toolbar}
      role="toolbar"
      aria-label={t('editor.toolbar')}
      className={toolbarStyles.toolbar}
      onFocus={roving.onFocus}
      onKeyDown={roving.onKeyDown}
    >
      <IconButton
        {...ROVING_PROPS}
        label={t('editor.actions.undo')}
        icon={<ToolbarIcon name="undo" />}
        aria-disabled={!commands?.canUndo || undefined}
        onClick={() => {
          if (commands?.canUndo) commands.undo()
        }}
      />
      <IconButton
        {...ROVING_PROPS}
        label={t('editor.actions.redo')}
        icon={<ToolbarIcon name="redo" />}
        aria-disabled={!commands?.canRedo || undefined}
        onClick={() => {
          if (commands?.canRedo) commands.redo()
        }}
      />
    </div>
  )
}

export function ScoreMenuBar() {
  const t = useT()
  const commands = useScoreCommands()
  const bar = useRef<HTMLDivElement>(null)
  const menus = useRef<(MenuHandle | null)[]>([])
  const roving = useRovingFocus(bar)
  const openMenu = (index: number) => {
    const at = (index + menus.current.length) % menus.current.length
    roving.controlAt(at)?.focus()
    menus.current[at]?.open()
  }

  return (
    <div
      ref={bar}
      role="menubar"
      aria-label={t('editor.menuBar')}
      className={styles.menuBar}
      onFocus={roving.onFocus}
      onKeyDown={roving.onKeyDown}
    >
      <Menu
        ref={(handle) => {
          menus.current[0] = handle
        }}
        label={t('editor.menus.file')}
        fixedTrigger
        align="start"
        triggerClassName={styles.trigger}
        triggerProps={{ ...ROVING_PROPS, role: 'menuitem' }}
        onSideKey={(step) => openMenu(step)}
        items={[
          { label: t('score.importMusicXml'), onSelect: commands?.openImport, disabled: !commands },
          MENU_SEPARATOR,
          { label: t('editor.actions.print'), onSelect: commands?.print, disabled: !commands },
          { label: t('score.saveAsFile'), onSelect: commands?.download, disabled: !commands },
        ]}
      >
        {t('editor.menus.file')}
      </Menu>
      <Menu
        ref={(handle) => {
          menus.current[1] = handle
        }}
        label={t('editor.menus.edit')}
        fixedTrigger
        align="start"
        triggerClassName={styles.trigger}
        triggerProps={{ ...ROVING_PROPS, role: 'menuitem' }}
        onSideKey={(step) => openMenu(1 + step)}
        items={[
          {
            label: t('editor.actions.undo'),
            onSelect: commands?.undo,
            disabled: !commands?.canUndo,
          },
          {
            label: t('editor.actions.redo'),
            onSelect: commands?.redo,
            disabled: !commands?.canRedo,
          },
          MENU_SEPARATOR,
          {
            label: t('score.manageMeasures'),
            onSelect: () => commands?.setPanel('measures'),
            disabled: !commands,
          },
          {
            label: t('score.correctPitch'),
            onSelect: () => commands?.setPanel('correct'),
            disabled: !commands,
          },
          {
            label: t('score.transpose'),
            onSelect: () => commands?.setPanel('transpose'),
            disabled: !commands,
          },
        ]}
      >
        {t('editor.menus.edit')}
      </Menu>
    </div>
  )
}
