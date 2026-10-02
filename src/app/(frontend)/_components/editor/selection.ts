import { $getRoot, $getSelection, $isRangeSelection } from 'lexical'

/*
 * Whether the caret sits at the very start of the text, nothing selected: in the first
 * text of the first block, or in an empty first block. Call inside a read or an update.
 */
export function $isAtDocumentStart(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
  const { anchor } = selection
  if (anchor.offset !== 0) return false
  const root = $getRoot()
  const node = anchor.getNode()
  const first = root.getFirstDescendant()
  return first === null || node.is(first) || node.is(root.getFirstChild())
}
