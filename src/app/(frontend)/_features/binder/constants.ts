// The client cache of documents' text (see documentStore.ts)

// Documents kept in memory, the oldest confirmed dropped first
export const MAX_CACHED_DOCUMENTS = 40

// A cached version reopened later than this is checked against the server in the background
export const DOCUMENT_FRESH_FOR_MS = 60_000
