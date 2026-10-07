import { HISTORY_MERGE_TAG, type UpdateListenerPayload } from 'lexical'

// Lexical's OnChangePlugin filter: selection-only updates and initial/reconciled states are not edits.
export const isContentUpdate = ({ dirtyElements, dirtyLeaves, tags }: UpdateListenerPayload) =>
  (dirtyElements.size > 0 || dirtyLeaves.size > 0) && !tags.has(HISTORY_MERGE_TAG)
