// MouseEvent.button of the main button (usually the left one); the wheel is 1, the secondary 2
const MAIN_BUTTON = 0

/*
 * Whether a press is with the main button. The others open the context menu or scroll: they
 * neither place the caret nor start a drag.
 */
export const isMainButton = (event: { button: number }) => event.button === MAIN_BUTTON
