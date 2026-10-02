/*
 * Loads the editor's code (Lexical and its plugins) ahead of time, e.g. when the pointer
 * reaches a button that opens the editor: by the time the page arrives, its code is there.
 * Imports are cached, so calling it again costs nothing.
 */
export const preloadEditor = () => {
  void import('./EditorComposer')
  void import('./EditorContent')
}
