// These CSS references are saved in documents: keep them stable when changing font files.
export enum FontId {
  NunitoSans = 'nunito-sans',
  Lora = 'lora',
  SourceSerif = 'source-serif-4',
  SourceCode = 'source-code-pro',
}

export const DOCUMENT_FONTS: Record<FontId, { label: string; family: string }> = {
  [FontId.NunitoSans]: { label: 'Nunito Sans', family: 'var(--font-nunito-sans)' },
  [FontId.Lora]: { label: 'Lora', family: 'var(--font-document-lora)' },
  [FontId.SourceSerif]: {
    label: 'Source Serif 4',
    family: 'var(--font-document-source-serif)',
  },
  [FontId.SourceCode]: {
    label: 'Source Code Pro',
    family: 'var(--font-document-source-code)',
  },
}

export type FontChoice = 'default' | FontId
export type SelectedFont = FontChoice | 'mixed' | 'unknown'

export const FONT_FAMILY_PROPERTY = 'font-family'

export const fontFamilyOf = (font: FontChoice): string | null =>
  font === 'default' ? null : DOCUMENT_FONTS[font].family

export function fontFromFamily(family: string | undefined): FontChoice | 'unknown' {
  if (!family || family === 'inherit') return 'default'
  return Object.values(FontId).find((id) => DOCUMENT_FONTS[id].family === family) ?? 'unknown'
}
