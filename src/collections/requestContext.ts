/*
 * What the app tells the collections' hooks through Payload's request context (`context` on
 * a local API call), typed once for the callers and the hooks.
 */
declare module 'payload' {
  interface RequestContext {
    // Binder items: the positions are planned by the caller, the item must not go last
    keepPosition?: boolean
    // A new composition: the title of its first document, in the writer's language
    firstDocumentTitle?: string
  }
}

export {}
