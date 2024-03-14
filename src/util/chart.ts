import Chart, { InteractionItem } from 'chart.js/auto'
import { getRelativePosition } from 'chart.js/helpers'
import { onCleanup } from 'solid-js'

export const createDragDataEvents = (chart: Chart) => {
  let dragging: InteractionItem | null = null

  const handleMouseDown = (e: MouseEvent) => {
    const elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true)
    if (elements.length === 0) {
      return
    }
    dragging = elements[0]
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging === null) {
      return
    }
    const pos = getRelativePosition(e, chart as any)
    const yValue = chart.scales.y.getValueForPixel(pos.y)
    if (yValue === undefined) {
      return
    }
    chart.data.datasets[dragging.datasetIndex].data[dragging.index] = yValue
    chart.update('none')
  }

  const handleMouseUp = () => {
    dragging = null
    chart.update()
  }

  chart.canvas.addEventListener('mousedown', handleMouseDown)
  chart.canvas.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)

  onCleanup(() => {
    chart.canvas.removeEventListener('mousedown', handleMouseDown)
    chart.canvas.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  })
}
