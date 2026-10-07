import { isOneOf } from '@/lib/guards'

// Languages of the interface; the first one is the fallback
export const LOCALES = ['en', 'fr'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

// Remembers the chosen language (no account needed)
export const LOCALE_COOKIE = 'orpheus-locale'

// Each language named in itself, as a language picker shows it
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', fr: 'Français' }

// Flag shown for each language (decorative: the name above is what is read out)
export const LOCALE_FLAGS: Record<Locale, string> = { en: '🇬🇧', fr: '🇫🇷' }

export const isLocale = (value: unknown): value is Locale => isOneOf(LOCALES, value)

/*
 * The language to show: the one chosen (cookie), otherwise the browser's preferred one that we
 * have (Accept-Language, in order of preference), otherwise the default.
 */
export function negotiateLocale(chosen: unknown, acceptLanguage: string | null): Locale {
  if (isLocale(chosen)) return chosen
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...options] = part.trim().split(';')
      const quality = options.find((option) => option.trim().startsWith('q='))
      return {
        language: tag.split('-')[0].toLowerCase(),
        q: quality ? Number(quality.split('=')[1]) : 1,
      }
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q)
  return preferred.map(({ language }) => language).find(isLocale) ?? DEFAULT_LOCALE
}
