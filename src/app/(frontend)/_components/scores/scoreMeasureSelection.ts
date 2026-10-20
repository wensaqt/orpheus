type Osmd = typeof import('opensheetmusicdisplay')
type Display = InstanceType<Osmd['OpenSheetMusicDisplay']>
type Measure = Display['GraphicSheet']['MeasureList'][number][number]
type Region = {
  index: number
  svg: SVGSVGElement
  left: number
  top: number
  right: number
  bottom: number
}
type MeasureSelectionOptions = {
  display: Display
  container: HTMLElement
  osmd: Osmd
  label: (number: number) => string
}

function measureRegion(measure: Measure, index: number, svg: SVGSVGElement, unit: number): Region {
  const box = measure.PositionAndShape
  const position = box.AbsolutePosition
  return {
    index,
    svg,
    left: (position.x + box.BorderLeft) * unit,
    right: (position.x + box.BorderRight) * unit,
    top: (position.y + Math.min(box.BorderTop, -0.75)) * unit,
    bottom:
      (position.y + Math.max(box.BorderBottom, measure.ParentStaffLine.StaffHeight + 0.75)) * unit,
  }
}

function extendRegion(existing: Region, region: Region): void {
  existing.left = Math.min(existing.left, region.left)
  existing.top = Math.min(existing.top, region.top)
  existing.right = Math.max(existing.right, region.right)
  existing.bottom = Math.max(existing.bottom, region.bottom)
}

function measureRegions({ display, container, osmd }: MeasureSelectionOptions): Region[] {
  const svgs = Array.from(container.querySelectorAll('svg'))
  const unit = 1 / display.GraphicSheet.svgToOsmd(new osmd.PointF2D(1, 0)).x
  const sourceIndices = new Map(
    display.Sheet.SourceMeasures.map((measure, index) => [measure, index]),
  )
  const regions = new Map<string, Region>()
  for (const staffMeasures of display.GraphicSheet.MeasureList) {
    for (const measure of staffMeasures) {
      if (!measure || measure.IsExtraGraphicalMeasure) continue
      const index = sourceIndices.get(measure.parentSourceMeasure)
      const page = display.GraphicSheet.MusicPages.indexOf(measure.ParentMusicSystem.Parent)
      if (index === undefined || !svgs[page]) continue
      const region = measureRegion(measure, index, svgs[page], unit)
      const key = `${page}:${index}`
      const existing = regions.get(key)
      if (existing) extendRegion(existing, region)
      else regions.set(key, region)
    }
  }
  return [...regions.values()]
}

function createMeasureRegion(region: Region, label: string): SVGRectElement {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', String(region.left))
  rect.setAttribute('y', String(region.top))
  rect.setAttribute('width', String(region.right - region.left))
  rect.setAttribute('height', String(region.bottom - region.top))
  rect.setAttribute('rx', '4')
  rect.setAttribute('role', 'button')
  rect.setAttribute('aria-label', label)
  rect.dataset.scoreMeasure = String(region.index)
  region.svg.prepend(rect)
  return rect
}

/** Selection lives in React; these SVG regions only follow the renderer's current geometry. */
export function createMeasureSelection(options: MeasureSelectionOptions) {
  const regions = measureRegions(options).map((region) => ({
    index: region.index,
    rect: createMeasureRegion(
      region,
      options.label(options.display.Sheet.SourceMeasures[region.index].MeasureNumberXML),
    ),
  }))
  return {
    select(index: number | null) {
      regions.forEach(({ rect, index: candidate }) => {
        rect.setAttribute('aria-pressed', String(index === candidate))
        rect.setAttribute('tabindex', candidate === (index ?? 0) ? '0' : '-1')
      })
    },
    pick(event: MouseEvent): number | null {
      const svg = event.target instanceof Element ? event.target.closest('svg') : null
      return (
        regions.find(({ rect }) => {
          if (rect.ownerSVGElement !== svg) return false
          const bounds = rect.getBoundingClientRect()
          return (
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom
          )
        })?.index ?? null
      )
    },
    focus(index: number | null, options?: FocusOptions) {
      if (index === null) {
        regions.find(({ rect }) => rect === document.activeElement)?.rect.blur()
        return
      }
      regions.find((region) => region.index === index)?.rect.focus(options)
    },
    anchor(index: number) {
      const rect = regions.find((region) => region.index === index)?.rect
      if (!rect?.isConnected) return null
      const bounds = rect.getBoundingClientRect()
      const root = options.container.getBoundingClientRect()
      return { top: bounds.bottom - root.top + 4 }
    },
    count: options.display.Sheet.SourceMeasures.length,
  }
}
