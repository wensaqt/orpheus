import { $isAtStartOfNode } from '@lexical/utils'
import { $getRoot, $getSelection, $isRangeSelection } from 'lexical'

/*
 * Whether the caret sits at the very start of the text, nothing selected: in the first
 * text of the first block, or in an empty first block. Call inside a read or an update.
 */
export function $isAtDocumentStart(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
  // Lexical's test: nothing between the caret and the start of the root
  return $isAtStartOfNode(selection.anchor, $getRoot())
}
