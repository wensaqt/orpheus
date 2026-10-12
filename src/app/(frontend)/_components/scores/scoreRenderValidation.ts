import { renderScoreXml } from './scoreRendering'
import { ScoreError } from '@/lib/scores/errors'

// An import must not replace the current document if OSMD cannot display the new MusicXML.
export async function verifyScoreRender(xml: string, width: number): Promise<void> {
  // OSMD lays out systems from the container width; validation needs the real sheet area.
  if (width <= 0) throw new ScoreError('noRenderArea')
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden`
  document.body.append(container)
  try {
    await renderScoreXml(xml, container)
  } finally {
    container.remove()
  }
}
