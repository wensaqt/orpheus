// Where saving stands: all saved, a change waiting for its pause, being saved, or failed
export enum SaveStatus {
  Saved = 'saved',
  Pending = 'pending',
  Saving = 'saving',
  Error = 'error',
}
