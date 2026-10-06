import { isRecord } from '@/lib/guards'

import { en } from './en'
import { fr } from './fr'
import type { Locale } from './locales'

export * from './locales'

// Same keys in every language: a missing or extra translation does not compile
type Shape<T> = { readonly [K in keyof T]: T[K] extends string ? string : Shape<T[K]> }
export type Messages = Shape<typeof en>

const MESSAGES: Record<Locale, Messages> = { en, fr }

// Dotted paths to strings: 'compositions.delete.title', etc.
export type MessageKey<T = Messages, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : MessageKey<T[K], `${Prefix}${K}.`>
}[keyof T & string]

type Params = Record<string, string | number>
export type Translate = (key: MessageKey, params?: Params) => string

// The string at a key; the types make sure there is one (else the key shows, as a clue)
function messageAt(messages: Messages, key: MessageKey): string {
  let node: unknown = messages
  for (const part of key.split('.')) node = isRecord(node) ? node[part] : undefined
  return typeof node === 'string' ? node : key
}

// Translator for one language: the string for a key, with {name} parameters substituted
export function createT(locale: Locale): Translate {
  const messages = MESSAGES[locale]
  return (key, params) => {
    const message = messageAt(messages, key)
    if (!params) return message
    return message.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    )
  }
}
