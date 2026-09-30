import { en } from './en'

// UI language, used by <html lang> and the Intl formatters
export const APP_LOCALE = 'en'

type Messages = typeof en

// Dotted paths to strings: 'compositions.delete.label', etc.
type MessageKey<T = Messages, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : MessageKey<T[K], `${Prefix}${K}.`>
}[keyof T & string]

type Params = Record<string, string | number>

// String for a key, with {name} parameters substituted
export function t(key: MessageKey, params?: Params): string {
  const message = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], en) as string
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}
