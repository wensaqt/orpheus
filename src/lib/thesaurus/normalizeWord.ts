// The normalized key shared by thesaurus sources and lookups
export const normalizeWord = (word: string) => word.trim().toLowerCase().replace(/\s+/g, ' ')
