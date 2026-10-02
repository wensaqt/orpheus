/*
 * The binder ("chutier") of a composition: a free tree of folders and documents, as deep as the
 * writer wants. Shared by the Payload collection and the frontend.
 */
export const BINDER_ITEM_KINDS = ['folder', 'document'] as const
export type BinderItemKind = (typeof BINDER_ITEM_KINDS)[number]

export const MAX_BINDER_TITLE_LENGTH = 200

// Fallback title of a composition's first document; the app sends one in the writer's language
export const DEFAULT_DOCUMENT_TITLE = 'Untitled document'
