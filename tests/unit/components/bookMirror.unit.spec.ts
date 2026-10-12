import { expect, it } from 'vitest'
import { BookMirror } from '@front/_components/editor/pagination/bookMirror'

function mirrorEditor() {
  const source = document.createElement('div')
  source.innerHTML =
    '<div contenteditable="true"><p id="paragraph">Hello</p><button>Action</button></div>'
  const mirror = new BookMirror(source)
  const observer = new MutationObserver(() => {})
  observer.observe(source, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  })
  const sync = () => mirror.apply(observer.takeRecords())
  return { source, mirror, sync, observer }
}

it('preserves visual edits while keeping the copied editor and controls inert', () => {
  const { source, mirror, sync, observer } = mirrorEditor()
  const paragraph = source.querySelector('p')!
  paragraph.firstChild!.nodeValue = 'Edited'
  paragraph.setAttribute('class', 'highlight')
  paragraph.id = 'new-id'
  source.firstElementChild!.setAttribute('contenteditable', 'true')
  sync()
  expect(mirror.element.querySelector('p')?.textContent).toBe('Edited')
  expect(mirror.element.querySelector('p')?.className).toBe('highlight')
  expect(mirror.element.querySelector('[id]')).toBeNull()
  expect(
    mirror.element.querySelector<HTMLElement>('[data-book-copy-editor]')?.contentEditable,
  ).toBe('false')
  expect(mirror.element.querySelector('button')?.tabIndex).toBe(-1)
  observer.disconnect()
})

it('maps inserted nodes for later edits and preserves sibling order on deletion', () => {
  const { source, mirror, sync, observer } = mirrorEditor()
  const editor = source.firstElementChild!
  const paragraph = document.createElement('p')
  paragraph.textContent = 'Inserted'
  editor.insertBefore(paragraph, editor.firstChild)
  sync()
  paragraph.firstChild!.nodeValue = 'Changed after insertion'
  editor.querySelector('button')!.remove()
  sync()
  expect(mirror.element.textContent).toBe('Changed after insertionHello')
  expect(mirror.element.querySelector('button')).toBeNull()
  observer.disconnect()
})
