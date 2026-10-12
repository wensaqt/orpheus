'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

export type ScorePanel = 'correct' | 'transpose' | null
//TODO: Multiple type warnings here
export type ScoreCommands = {
  openImport: () => void
  setPanel: (panel: ScorePanel) => void
  undo: () => void
  canUndo: boolean
  download: () => void
  print: () => void
}

const Context = createContext<{
  commands: ScoreCommands | null
  register: (commands: ScoreCommands | null) => void
} | null>(null)

export function ScoreCommandProvider({ children }: { children: ReactNode }) {
  const [commands, register] = useState<ScoreCommands | null>(null)
  return <Context value={{ commands, register }}>{children}</Context>
}

export function useScoreCommands() {
  const context = useContext(Context)
  if (!context) throw new Error('Score commands require ScoreCommandProvider')
  return context.commands
}

export function useRegisterScoreCommands(commands: ScoreCommands) {
  const context = useContext(Context)
  if (!context) throw new Error('Score commands require ScoreCommandProvider')
  const { register } = context
  useEffect(() => {
    register(commands)
    return () => register(null)
  }, [register, commands])
}
