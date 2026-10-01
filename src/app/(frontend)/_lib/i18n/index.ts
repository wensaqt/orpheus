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

// Translator for one language: the string for a key, with {name} parameters substituted
export function createT(locale: Locale): Translate {
  const messages = MESSAGES[locale]
  return (key, params) => {
    const message = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages) as string
    if (!params) return message
    return message.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    )
  }
}
