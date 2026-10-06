// Reading the DOM in unit tests: helpers that fail the test where an element is missing

// The form a control is in
export function formOf(control: HTMLElement): HTMLFormElement {
  const form = control.closest('form')
  if (!form) throw new Error('The control is in no form')
  return form
}

// The element that describes another one (its aria-describedby), if any
export const descriptionOf = (element: Element) =>
  document.getElementById(element.getAttribute('aria-describedby') ?? '')
