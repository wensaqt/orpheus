'use client'

import { createContext, type ReactNode, useContext, useMemo } from 'react'

import { createT, DEFAULT_LOCALE, type Locale } from '@front/_lib/i18n'

// The language resolved by the server, passed down to client components
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>
}

export const useLocale = () => useContext(LocaleContext)

// Translator for client components
export function useT() {
  const locale = useLocale()
  return useMemo(() => createT(locale), [locale])
}
