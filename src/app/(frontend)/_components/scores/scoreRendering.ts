export const DISPLAY_OPTIONS = { backend: 'svg' as const, autoResize: false, drawTitle: false }
export type ScoreRenderState = { xml: string; status: 'loading' | 'ready' | 'error' }

/** Load browser notation code on demand; obsolete jobs must never draw over newer XML. */
export async function renderScoreXml(
  xml: string,
  container: HTMLElement,
  isCanceled: () => boolean = () => false,
) {
  const osmd = await import('opensheetmusicdisplay')
  if (isCanceled()) return null
  const display = new osmd.OpenSheetMusicDisplay(container, DISPLAY_OPTIONS)
  await display.load(xml)
  if (isCanceled()) return null
  display.render()
  return { display, osmd }
}
