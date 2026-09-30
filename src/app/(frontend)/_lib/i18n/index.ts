import { en } from './en'

// Langue de l'interface, reprise par <html lang> et les formateurs Intl
export const APP_LOCALE = 'en'

type Messages = typeof en

// Chemins pointés vers les textes : 'compositions.delete.label', etc.
type MessageKey<T = Messages, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : MessageKey<T[K], `${Prefix}${K}.`>
}[keyof T & string]

type Params = Record<string, string | number>

// Texte associé à une clé, avec remplacement des paramètres {nom}
export function t(key: MessageKey, params?: Params): string {
  const message = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], en) as string
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}
