import { DISPLAY_OPTIONS } from './scoreRendering'
import { ScoreError } from '@/lib/scores/errors'

// An import must not replace the current document if OSMD cannot display the new MusicXML.
export async function verifyScoreRender(xml: string, width: number): Promise<void> {
  //TODO: weird condition, rendering shouldnt rely on width, challenge this solution + weird error label, errors should be more precise
  if (width <= 0) throw new ScoreError('noRenderArea')
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden`
  document.body.append(container)
  try {
    // TODO: weird way to import, but you can challenge this comment if you want to
    const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay')
    const display = new OpenSheetMusicDisplay(container, DISPLAY_OPTIONS)
    await display.load(xml)
    display.render()
  } finally {
    container.remove()
  }
}
