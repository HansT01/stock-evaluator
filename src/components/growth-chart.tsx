import { Chart } from 'chart.js/auto'
import { Component, createEffect, onCleanup, onMount } from 'solid-js'
import { formatNum } from '~/utils/format'

interface GrowthChartProps {
  label: string
  xData: string[]
  yData: (number | null)[]
  yGrowth: number[]
}
export const GrowthChart: Component<GrowthChartProps> = (props) => {
  let chart: Chart<'line'>
  let ref: HTMLCanvasElement

  onMount(() => {
    chart = new Chart(ref, {
      type: 'line',
      data: {
        labels: props.xData,
        datasets: [
          {
            label: props.label,
            data: props.yData,
            pointRadius: 10,
            pointHoverRadius: 10,
            pointHitRadius: 10,
            tension: 0.25,
          },
          {
            label: 'Growth estimate',
            data: props.yGrowth,
            pointRadius: 10,
            pointHoverRadius: 10,
            pointHitRadius: 10,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return formatNum(value as number, 3)
              },
            },
          },
        },
      },
    })

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      chart.options.color = '#ffffffee'
      chart.options.scales!.x!.ticks!.color = '#ffffffee'
      chart.options.scales!.y!.ticks!.color = '#ffffffee'
      chart.options.scales!.x!.grid!.color = '#ffffff44'
      chart.options.scales!.y!.grid!.color = (context) => {
        if (context.tick.value === 0) {
          return '#ffffffbb'
        }
        return '#ffffff44'
      }
    } else {
      chart.options.color = '#000000ee'
      chart.options.scales!.x!.ticks!.color = '#000000ee'
      chart.options.scales!.y!.ticks!.color = '#000000ee'
      chart.options.scales!.x!.grid!.color = '#00000044'
      chart.options.scales!.y!.grid!.color = (context) => {
        if (context.tick.value === 0) {
          return '#000000bb'
        }
        return '#00000044'
      }
    }

    onCleanup(() => {
      chart.destroy()
    })
  })

  createEffect(() => {
    chart.data.labels = props.xData
    chart.data.datasets[0].label = props.label
    chart.data.datasets[0].data = props.yData
    chart.data.datasets[1].data = props.yGrowth
    chart.update()
  })

  return <canvas ref={(el) => (ref = el)} />
}
